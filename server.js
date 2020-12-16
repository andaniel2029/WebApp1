//server-side code
const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const fs = require('fs'); 
const FileSync = require('lowdb/adapters/FileSync');
var cors = require('cors');

//set up lowdb
const low = require('lowdb');
const adapter = new FileSync('db.json');
const db = low(adapter);

const rawdata = fs.readFileSync('./timetable-data.json'); //fetch all data from .json file
const courses = JSON.parse(rawdata); //retrieve all JSON objects

const subjectToCourseMapping = {};
courses.forEach(course => { //gets all subject codes and all possible course codes into an array
    if (course.subject in subjectToCourseMapping) {
        subjectToCourseMapping[course.subject].push(course);
    } else {
        subjectToCourseMapping[course.subject] = [course]; 
    }
});

const subjectToClassNameMapping = {};
Object.keys(subjectToCourseMapping).forEach(subject => { //gets the class name for each code pair
    const classNames = subjectToCourseMapping[subject].map(course => course.className);
    subjectToClassNameMapping[subject] = classNames;
})

const app = express();
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

const server = app.listen(process.env.PORT || 3000, function() { //tell machine which host and port to listen to
    const host = server.address().address;
    const port = server.address().port;
    console.log("listening at http://" + host + ":" + port);
});

app.use(express.static(path.join(__dirname, "/public")));

app.use(cors({origin: '*'}));

// Get all available subject codes (property name: subject) and descriptions (property name: className).
app.get("/subjects", (req, res) => { 
    res.json(subjectToClassNameMapping);
});

// GET all course codes (property name: catalog_nbr) for a given subject code. Return an error if the subject code doesn’t exist.
app.get("/courses/:subject", (req, res) => {
    const subject = req.params.subject;
    if (subject in subjectToCourseMapping) {
        res.json(subjectToCourseMapping[subject]);
    } else {
        throw new Error("Subject not found");
    }
});

app.get("/timetable", (req, res) => { //gets the time table components
    const subject = req.query.subject;
    const course = req.query.course;
    const component = req.query.component;
    if (subject && course && subject != "" && course != "") {
        if (subject in subjectToCourseMapping) {
            const selectedCourse = subjectToCourseMapping[subject].filter(x => x.catalog_nbr == req.query.course)[0];
            const courseInfo = selectedCourse.course_info.filter(info => {
                if (component) {
                    return info.ssr_component == component;
                } else {
                    return true;
                }
            }).map(info => {
                return {
                    start_time: info.start_time, 
                    end_time: info.end_time, 
                    days: info.days,
                    catalog_description: selectedCourse.catalog_description,
                    component: info.ssr_component
                };
            });
            res.json(courseInfo);
        } else {
            throw new Error("Subject not found");
        }
        res.json([]);
    } else {
        throw new Error("Subject and Course are required");
    }
});

db.defaults({ schedules: [] })
  .write();

app.get("/schedule/:name", (req, res) => { //gets schedule by search
    if (req.params.name) {
        const val = db.get("schedules").find({ name: req.params.name }).value();
        res.json(val);
    } else {
        throw new Error("Name not found");
    }
});

app.post("/schedule/:name", (req, res) => { //creates schedule by search
    if (req.params.name) {
        const schedules = db.get("schedules");
        const val = schedules.find({ name: req.params.name }).value(); //checks if name already exists
        if (val != null) {
            throw new Error("Name already exists");
        }
        schedules.push({ name: req.params.name, courses: [] }).write(); 
        res.json({});
    } else {
        throw new Error("Name not found");
    }
});

app.put("/schedule/:name", (req, res) => { //saves subject/course code pair to schedule
    const schedule = db.get("schedules").find({ name: req.params.name });
    const val = schedule.value();
    if (val == null) {
        throw new Error("Schedule does not exist");
    }
    const subject = req.query.subject;
    const course = req.query.course;
    const component = req.query.component;
    for (let c of val.courses) {
        if (c.subject == subject && c.course == course) {
            res.json({});
            return;
        }
    }
    val.courses.push({ subject, course, component });
    schedule.assign(val).write();
    res.json({});
});

app.delete("/schedule/:name", (req, res) => { //deletes schedule by name
    const name = req.params.name;
    const schedule = db.get("schedules").find({ name });
    const val = schedule.value();
    if (val == null) {
        throw new Error("Schedule does not exist");
    }
    db.get("schedules").remove({ name }).write();
    res.json({});
});

app.get("/schedule", (req, res) => { //shows list of schedules and number of courses 
    const schedules = db.get("schedules").value();
    res.json(schedules.map(schedule => {
        return {
            name: schedule.name,
            count: schedule.courses.length
        }
    }));
});

app.delete("/schedules", (req, res) => { //deletes all schedules
    db.set('schedules', []).write();
    res.json({});
});