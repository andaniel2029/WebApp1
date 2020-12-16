function createElementAndAppend(parent, type, text) {
    const el = document.createElement(type);
    el.innerText = text;
    parent.appendChild(el);
    return el;
}

const courses = document.getElementById("courses");
fetch("/schedule")
.then(async(resp) => {
    const schedules = await resp.json();
    schedules.forEach(schedule => {
        createElementAndAppend(courses, "h3", `${schedule.name}: ${schedule.count}`);
    });
});