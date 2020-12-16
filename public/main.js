//client-side code
const subjectOptions = document.getElementById("subject");
const classNames = document.getElementById("classNames");
const component = document.getElementById("component");
const courseCodes = document.getElementById("codes");
const className = document.getElementById("className");
const timeTable = document.getElementById("timetable");
const scheduleContainer = document.getElementById("schedule");

let subjects;

function createElementAndAppend(parent, type, text) {
    const el = document.createElement(type);
    el.innerText = text;
    parent.appendChild(el);
    return el;
}

fetch("/subjects").then(async (resp) => { //get subject codes
    subjects = await resp.json();
    classNames.innerHTML = "";
    Object.keys(subjects).forEach((subject) => {
        const option = document.createElement("option"); 
        option.textContent = subject;
        option.value = subject;
        subjectOptions.appendChild(option); //add as an option in drop down
    });
}).catch(() => {
    alert("Could not load subjects");
})

let currentCourses;
subjectOptions.onchange = () => {
    classNames.innerHTML = "";
    timeTable.innerHTML = "";
    subjects[subjectOptions.value].forEach(name => {
        const classDescription = document.createElement("div");
        classDescription.textContent = name;
        classNames.appendChild(classDescription); //adds possible class names for subject code selected
    });
    fetch("/courses/" + subjectOptions.value).then(async (resp) => { //for the selected subject code
        const courses = await resp.json();
        courseCodes.innerHTML = "";
        className.innerHTML = "";
        currentCourses = {};
        const option = document.createElement("option");
        option.text = "DEFAULT";
        option.value = "DEFAULT"; //clear course codes from previous search
        courseCodes.appendChild(option); 
        courses.forEach((course) => {
            const option = document.createElement("option");
            option.textContent = course.catalog_nbr;
            option.value = course.catalog_nbr;
            courseCodes.appendChild(option); //add corresponding course code as an option in drop down 
            currentCourses[course.catalog_nbr] = course;
        });
    }).catch(() => {
        alert("Subject does not exist");
    })
}

let selectedCourse;
function GetTimeTables() {
    let query = `/timetable?subject=${subjectOptions.value}&course=${courseCodes.value}`;
    if (component.value != "" && component.value != null) {
        query += "&component=" + component.value;
    }
    fetch(query).then(async (resp) => { //gets time table entries for selected subject/course code pair
        const times = await resp.json();
        timeTable.innerHTML = "";
        times.forEach(time => {
            const checkbox = document.createElement("input");
            checkbox.type = "checkbox";
            checkbox.value = time.component;
            checkbox.classList.add("timeTableInput");
            timeTable.appendChild(checkbox);
            createElementAndAppend(timeTable, "div", `Subject Code: ${subjectOptions.value}`);
            createElementAndAppend(timeTable, "div", `Course Code: ${courseCodes.value}`);
            createElementAndAppend(timeTable, "div", `Component: ${time.component}`);
            createElementAndAppend(timeTable, "div", `Class Name: ${className.innerText}`);
            createElementAndAppend(timeTable, "div", `Times: ${time.start_time} - ${time.end_time}`);
            createElementAndAppend(timeTable, "div", `Days: ${time.days}`);
            createElementAndAppend(timeTable, "div", `Descriptions: ${time.catalog_description}`);
        });
    }).catch(() => {
        alert("Times could not be loaded");
    });
}


courseCodes.onchange = () => { //when value changes on course code
    selectedCourse = courseCodes.value; //get value from user for course code 
    if (selectedCourse && selectedCourse in currentCourses) {
        selectedCourse = currentCourses[selectedCourse];
        className.innerText = selectedCourse.className; //show class name for corresponding course code
    }
    GetTimeTables(); 
}

component.onchange = () => {
    GetTimeTables();
}

// Schedule
const scheduleName= document.getElementById("scheduleName");
function createSchedule() {
    fetch(`/schedule/${scheduleName.value}`, { //creates a schedule
        method: "POST"
    }).then(async(resp) => {
        await resp.json();
        alert("Schedule has been made");
    })
    .catch(() => {
        alert("Schedule already exists");
    });
}

function saveSchedule() { //saves subject/course code pair to schedule selected
    let check = false;
    for (const input of document.getElementsByClassName("timeTableInput")) {
        if (input.checked) {
            check = true;
            if (subjectOptions.value && courseCodes.value && subjectOptions.value != "" && courseCodes.value != "") {
                fetch(`/schedule/${scheduleName.value}?subject=${subjectOptions.value}&course=${courseCodes.value}&component=${input.value}`, {
                    method: "PUT"
                })
                .then(async(resp) => {
                    await resp.json();
                    alert("Saved Schedule");
                    getSchedule();
                })
                .catch(x => {
                    alert("Schedule does not exist")
                });
            } else {
                alert("Select subject and course");
            }
        }
    }
    if (!check) {
        alert("No courses selected");
        return;
    }
}

function getSchedule() { //searches for schedule by name
    scheduleContainer.innerHTML = "";
    fetch(`/schedule/${scheduleName.value}`)
    .then(async(resp) => {
        const schedule = await resp.json();
        if (schedule && schedule.courses) {
            schedule.courses.forEach(course => {
                const el = createElementAndAppend(scheduleContainer, "div", `Subject Code: ${course.subject} Course Code: ${course.course}`); //shows subject/course code pair for schedule name selected
                el.classList.add(course.component);
            });
        }
    })
}

function deleteSchedule() { //deletes schedule by name
    fetch(`/schedule/${scheduleName.value}`, {
        method: "DELETE"
    })
    .then(async(resp) => {
        const schedule = await resp.json();
        alert("Schedule deleted");
        getSchedule();
    })
    .catch(x => {
        alert("Schedule does not exist");
    })
}

function deleteAll() { //deletes all schedules in database
    fetch("/schedules", {
        method: "DELETE"
    })
    .then(async(resp) => {
        const schedule = await resp.json();
        alert("All schedules deleted");
        getSchedule();
    })
}

function gotoCount() { //can view all schedules
    window.location.href = "/count.html";
}