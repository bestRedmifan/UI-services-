"use strict";

const $ = selector => document.querySelector(selector);

const KEY = {
    money: "barmaan_money",
    notes: "barmaan_notes",
    deletedNotes: "barmaan_deleted_notes",
    tasks: "barmaan_tasks",
    apps: "barmaan_apps",
    alarms: "barmaan_alarms",
    settings: "barmaan_settings"
};

function load(key, fallback){
    try{
        const value = localStorage.getItem(key);
        return value === null ? fallback : JSON.parse(value);
    }catch{
        return fallback;
    }
}

function save(key,value){
    localStorage.setItem(key,JSON.stringify(value));
}

const state = {
    money: load(KEY.money,0),
    notes: load(KEY.notes,[]),
    deletedNotes: load(KEY.deletedNotes,[]),
    tasks: load(KEY.tasks,[]),
    apps: load(KEY.apps,[]),
    alarms: load(KEY.alarms,[]),
    settings: load(KEY.settings,{})
};

let timerInterval = null;
let timerRemaining = 0;
let timerEnd = 0;

let stopwatchInterval = null;
let stopwatchElapsed = 0;
let stopwatchStarted = 0;

let voiceDB = null;
let voiceRecorder = null;
let voiceStream = null;
let voiceChunks = [];

let posts = [];
let selectedQuality = "high";
let selectedSubjectMode = "subjects";
let photoBlob = null;
let drawPoints = [];
let originalSubjectImage = null;

const sections = [
    "Clock",
    "Notes",
    "Tasks",
    "UI Store",
    "Voices",
    "Photo AI"
];

function persist(){
    save(KEY.money,state.money);
    save(KEY.notes,state.notes);
    save(KEY.deletedNotes,state.deletedNotes);
    save(KEY.tasks,state.tasks);
    save(KEY.apps,state.apps);
    save(KEY.alarms,state.alarms);
    save(KEY.settings,state.settings);
}

function escapeHTML(value){
    return String(value)
        .replaceAll("&","&amp;")
        .replaceAll("<","&lt;")
        .replaceAll(">","&gt;")
        .replaceAll('"',"&quot;")
        .replaceAll("'","&#039;");
}

function toast(message){
    const box = $("#toast");
    box.textContent = message;
    box.style.display = "block";
    clearTimeout(box._timer);
    box._timer = setTimeout(()=>{
        box.style.display = "none";
    },2500);
}

function makeMenu(id,html){
    return `
        <div class="menu">
            <button onclick="toggleMenu('${id}')">...</button>
            <div class="popup hidden" id="${id}">
                ${html}
            </div>
        </div>
    `;
}

function toggleMenu(id){
    document.querySelectorAll(".popup").forEach(p=>{
        if(p.id !== id) p.classList.add("hidden");
    });
    $("#"+id)?.classList.toggle("hidden");
}

document.addEventListener("click",event=>{
    if(!event.target.closest(".menu")){
        document.querySelectorAll(".popup")
            .forEach(p=>p.classList.add("hidden"));
    }
});

function buildNav(){
    const nav = $("#mainNav");
    nav.innerHTML = "";

    sections.forEach(section=>{
        const button = document.createElement("button");
        button.textContent = section;
        button.onclick = ()=>openSection(section);
        nav.appendChild(button);
    });
}

function openSection(section){
    if(section === "Clock") renderClock();
    if(section === "Notes") renderNotes();
    if(section === "Tasks") renderTasks();
    if(section === "UI Store") renderStore();
    if(section === "Voices") renderVoices();
    if(section === "Photo AI") renderPhotoAI();
}

function updateTopClock(){
    $("#liveClock").textContent =
        new Date().toLocaleTimeString();
}

setInterval(updateTopClock,1000);
updateTopClock();

function renderClock(){
    $("#app").innerHTML = `
        <div class="tabs">
            <button onclick="clockTab('bedtime')">Bedtime</button>
            <button onclick="clockTab('alarm')">Alarm</button>
            <button onclick="clockTab('world')">World clock</button>
            <button onclick="clockTab('stopwatch')">Stopwatch</button>
            <button onclick="clockTab('timer')">Timer</button>
        </div>
        <section id="clockContent"></section>
    `;

    clockTab("bedtime");
}

function clockTab(tab){

    const area = $("#clockContent");

    if(tab === "bedtime"){
        area.innerHTML = `
            <div class="card">
                <h2>Bedtime</h2>
                <p class="muted">
                    Set your bedtime reminder.
                </p>

                <input
                    id="bedtimeInput"
                    type="time"
                    value="${state.settings.bedtime || ""}"
                >

                <button
                    class="primary"
                    onclick="saveBedtime()"
                >
                    Save bedtime
                </button>

                ${
                    state.settings.bedtime
                    ? `<p>
                        Saved: <b>${state.settings.bedtime}</b>
                       </p>`
                    : ""
                }
            </div>
        `;
    }

    if(tab === "alarm"){
        area.innerHTML = `
            <div class="card">
                <h2>Alarm</h2>

                <input id="alarmTime" type="time">

                <label>
                    Snooze interval
                </label>

                <input
                    id="snoozeMinutes"
                    class="range"
                    type="range"
                    min="1"
                    max="60"
                    value="5"
                    oninput="
                        $('#snoozeNumber').textContent=this.value
                    "
                >

                <p>
                    Snooze:
                    <b>
                        <span id="snoozeNumber">5</span>
                        minute(s)
                    </b>
                </p>

                <select id="snoozeCount">
                    <option value="forever">Forever</option>
                    <option value="1">1 time</option>
                    <option value="2">2 time</option>
                    <option value="5">5 time</option>
                    <option value="10">10 time</option>
                    <option value="0">Snooze off</option>
                </select>

                <button
                    class="primary"
                    onclick="createAlarm()"
                >
                    Save alarm
                </button>
            </div>

            <div class="card">
                <h3>Saved alarms</h3>
                ${
                    state.alarms.length
                    ? state.alarms.map(alarmHTML).join("")
                    : `<p class="muted">No alarms.</p>`
                }
            </div>
        `;
    }

    if(tab === "world"){
        const zones = [
            "UTC",
            "America/Toronto",
            "America/New_York",
            "Europe/London",
            "Asia/Tehran",
            "Asia/Tokyo"
        ];

        area.innerHTML = `
            <div class="grid">
                ${
                    zones.map((zone,i)=>`
                        <div class="card">
                            <b>${zone}</b>
                            <div
                                class="worldTime"
                                id="world-${i}"
                            >
                                --:--:--
                            </div>
                        </div>
                    `).join("")
                }
            </div>
        `;

        updateWorldClocks();
    }

    if(tab === "stopwatch"){
        area.innerHTML = `
            <div class="card center">
                <h2>Stopwatch</h2>

                <div
                    id="stopwatchDisplay"
                    class="timerDisplay"
                >
                    ${formatStopwatch(stopwatchElapsed)}
                </div>

                <button
                    class="good"
                    onclick="startStopwatch()"
                >
                    Start
                </button>

                <button onclick="pauseStopwatch()">
                    Pause
                </button>

                <button
                    class="danger"
                    onclick="resetStopwatch()"
                >
                    Reset
                </button>
            </div>
        `;
    }

    if(tab === "timer"){
        area.innerHTML = `
            <div class="card center">
                <h2>Timer</h2>

                <input
                    id="timerMinutes"
                    type="number"
                    min="0"
                    value="1"
                    placeholder="Minutes"
                >

                <input
                    id="timerSeconds"
                    type="number"
                    min="0"
                    max="59"
                    value="0"
                    placeholder="Seconds"
                >

                <div
                    id="timerDisplay"
                    class="timerDisplay"
                >
                    ${formatTime(timerRemaining)}
                </div>

                <button
                    class="primary"
                    onclick="startTimer()"
                >
                    Start
                </button>

                <button onclick="pauseTimer()">
                    Pause
                </button>

                <button
                    class="warning"
                    onclick="restartTimer()"
                >
                    Restart
                </button>

                <button
                    class="danger"
                    onclick="resetTimer()"
                >
                    Reset
                </button>
            </div>
        `;
    }
}

function saveBedtime(){
    const value = $("#bedtimeInput").value;

    if(!value){
        toast("Choose a bedtime.");
        return;
    }

    state.settings.bedtime = value;
    persist();
    toast("Bedtime saved.");
    clockTab("bedtime");
}

function alarmHTML(alarm,index){
    const snoozeText =
        alarm.snoozeCount === "forever"
        ? "Forever"
        : alarm.snoozeCount === "0"
        ? "Snooze off"
        : `${alarm.snoozeCount} time`;

    return `
        <div class="alarmItem">
            <div>
                <b>${escapeHTML(alarm.time)}</b>
                <span class="pill">${snoozeText}</span>
                <span class="pill">
                    ${alarm.snoozeMinutes} min
                </span>
            </div>

            <div class="row">
                <button
                    onclick="toggleAlarm(${index})"
                >
                    ${alarm.enabled ? "Disable" : "Enable"}
                </button>

                <button
                    class="danger"
                    onclick="deleteAlarm(${index})"
                >
                    Delete
                </button>
            </div>
        </div>
    `;
}

function createAlarm(){

    const time = $("#alarmTime").value;

    if(!time){
        toast("Choose an alarm time.");
        return;
    }

    state.alarms.push({
        id:Date.now(),
        time,
        snoozeMinutes:+$("#snoozeMinutes").value,
        snoozeCount:$("#snoozeCount").value,
        snoozeUsed:0,
        enabled:true
    });

    persist();
    requestNotifications();
    toast("Alarm saved.");
    clockTab("alarm");
}

function toggleAlarm(index){
    state.alarms[index].enabled =
        !state.alarms[index].enabled;

    persist();
    clockTab("alarm");
}

function deleteAlarm(index){
    state.alarms.splice(index,1);
    persist();
    clockTab("alarm");
}

const worldZones = [
    "UTC",
    "America/Toronto",
    "America/New_York",
    "Europe/London",
    "Asia/Tehran",
    "Asia/Tokyo"
];

function updateWorldClocks(){

    worldZones.forEach((zone,index)=>{
        const element = $("#world-"+index);

        if(!element) return;

        element.textContent =
            new Intl.DateTimeFormat(
                "en",
                {
                    timeZone:zone,
                    hour:"2-digit",
                    minute:"2-digit",
                    second:"2-digit"
                }
            ).format(new Date());
    });
}

setInterval(updateWorldClocks,1000);

function startStopwatch(){

    if(stopwatchInterval) return;

    stopwatchStarted =
        Date.now() - stopwatchElapsed;

    stopwatchInterval =
        setInterval(()=>{
            stopwatchElapsed =
                Date.now() - stopwatchStarted;

            const display =
                $("#stopwatchDisplay");

            if(display){
                display.textContent =
                    formatStopwatch(stopwatchElapsed);
            }
        },30);
}

function pauseStopwatch(){

    if(!stopwatchInterval) return;

    clearInterval(stopwatchInterval);
    stopwatchInterval = null;

    stopwatchElapsed =
        Date.now() - stopwatchStarted;
}

function resetStopwatch(){

    pauseStopwatch();

    stopwatchElapsed = 0;

    const display =
        $("#stopwatchDisplay");

    if(display){
        display.textContent =
            formatStopwatch(0);
    }
}

function formatStopwatch(ms){

    const minutes =
        Math.floor(ms/60000);

    const seconds =
        Math.floor((ms%60000)/1000);

    const hundredths =
        Math.floor((ms%1000)/10);

    return String(minutes).padStart(2,"0")
        +":"
        +String(seconds).padStart(2,"0")
        +"."
        +String(hundredths).padStart(2,"0");
}

function startTimer(){

    if(timerInterval) return;

    if(timerRemaining <= 0){

        const minutes =
            Number($("#timerMinutes")?.value || 0);

        const seconds =
            Number($("#timerSeconds")?.value || 0);

        timerRemaining =
            Math.max(0,minutes*60+seconds);
    }

    if(timerRemaining <= 0){
        toast("Set a timer first.");
        return;
    }

    timerEnd =
        Date.now()+timerRemaining*1000;

    timerInterval =
        setInterval(updateTimer,250);

    updateTimer();
}

function updateTimer(){

    timerRemaining =
        Math.max(
            0,
            Math.ceil((timerEnd-Date.now())/1000)
        );

    const display =
        $("#timerDisplay");

    if(display){
        display.textContent =
            formatTime(timerRemaining);
    }

    if(timerRemaining <= 0){

        clearInterval(timerInterval);
        timerInterval = null;

        playBeep("Timer finished");
        toast("Timer finished.");
    }
}

function pauseTimer(){

    if(!timerInterval) return;

    timerRemaining =
        Math.max(
            0,
            Math.ceil((timerEnd-Date.now())/1000)
        );

    clearInterval(timerInterval);
    timerInterval = null;
}

function restartTimer(){

    clearInterval(timerInterval);
    timerInterval = null;

    const minutes =
        Number($("#timerMinutes")?.value || 0);

    const seconds =
        Number($("#timerSeconds")?.value || 0);

    timerRemaining =
        Math.max(0,minutes*60+seconds);

    if($("#timerDisplay")){
        $("#timerDisplay").textContent =
            formatTime(timerRemaining);
    }

    if(timerRemaining > 0){
        startTimer();
    }
}

function resetTimer(){

    clearInterval(timerInterval);
    timerInterval = null;
    timerRemaining = 0;

    if($("#timerDisplay")){
        $("#timerDisplay").textContent =
            "00:00";
    }
}

function formatTime(seconds){

    const minutes =
        Math.floor(seconds/60);

    const secs =
        seconds%60;

    return String(minutes).padStart(2,"0")
        +":"
        +String(secs).padStart(2,"0");
}

function playBeep(title){

    toast("🔔 "+title);

    try{

        const AudioContext =
            window.AudioContext ||
            window.webkitAudioContext;

        const context =
            new AudioContext();

        const oscillator =
            context.createOscillator();

        const gain =
            context.createGain();

        oscillator.frequency.value = 880;
        gain.gain.value = .16;

        oscillator.connect(gain);
        gain.connect(context.destination);

        oscillator.start();

        setTimeout(()=>{
            oscillator.stop();
            context.close();
        },450);

    }catch{}
}

async function requestNotifications(){

    if(!("Notification" in window)){
        return;
    }

    if(Notification.permission === "default"){
        try{
            await Notification.requestPermission();
        }catch{}
    }
}

function sendNotification(title,body){

    if(
        "Notification" in window &&
        Notification.permission === "granted"
    ){
        new Notification(title,{body});
    }

    playBeep(title);
}

function alarmLoop(){

    const now = new Date();

    const current =
        now.toTimeString().slice(0,5);

    state.alarms.forEach(alarm=>{

        if(!alarm.enabled) return;

        if(
            alarm.time === current &&
            now.getSeconds() === 0
        ){

            alarm.snoozeUsed = 0;

            triggerAlarm(alarm);
        }
    });

    state.tasks.forEach(task=>{

        if(!task.reminder) return;

        const difference =
            new Date(task.reminder).getTime()
            -Date.now();

        if(
            difference <= 1000 &&
            difference > -1000
        ){

            task.reminder = null;
            persist();

            sendNotification(
                "Barmaan Tasks",
                task.text
            );
        }
    });
}

setInterval(alarmLoop,1000);

function triggerAlarm(alarm){

    const popup = document.createElement("div");

    popup.className = "card alarmItem";

    popup.innerHTML = `
        <h2>⏰ Alarm</h2>
        <p>Time to wake up.</p>

        <div class="row">
            <button
                class="danger"
                id="dismissAlarm"
            >
                Dismiss
            </button>

            <button
                class="warning"
                id="snoozeAlarm"
            >
                Snooze
            </button>
        </div>
    `;

    $("#app").prepend(popup);

    const snoozeButton =
        popup.querySelector("#snoozeAlarm");

    const dismissButton =
        popup.querySelector("#dismissAlarm");

    if(
        alarm.snoozeCount === "0" ||
        (
            alarm.snoozeCount !== "forever" &&
            alarm.snoozeUsed >= Number(alarm.snoozeCount)
        )
    ){
        snoozeButton.disabled = true;
    }

    snoozeButton.onclick = ()=>{

        if(snoozeButton.disabled) return;

        if(alarm.snoozeCount !== "forever"){
            alarm.snoozeUsed++;
        }

        popup.remove();

        const delay =
            alarm.snoozeMinutes*60*1000;

        setTimeout(()=>{
            if(alarm.enabled){
                triggerAlarm(alarm);
            }
        },delay);
    };

    dismissButton.onclick = ()=>{
        popup.remove();
    };

    sendNotification(
        "Barmaan Alarm",
        "Alarm is ringing."
    );
}

function renderNotes(){

    $("#app").innerHTML = `
        <div class="card">
            <h2>Notes</h2>

            <textarea
                id="newNote"
                rows="6"
                placeholder="Write your note..."
            ></textarea>

            <button
                class="primary"
                onclick="saveNote()"
            >
                Save
            </button>
        </div>

        <div class="card">
            <h3>Notes</h3>

            <div>
                ${
                    state.notes.length
                    ? state.notes
                        .map(noteHTML)
                        .join("")
                    : `<p class="muted">
                        No notes.
                       </p>`
                }
            </div>
        </div>

        <div class="card">
            <h3>Recently deleted</h3>

            ${
                state.deletedNotes.length
                ? state.deletedNotes
                                        .map(deletedNoteHTML)
                    .join("")
                : `<p class="muted">
                    Recently deleted is empty.
                   </p>`
            }
        </div>
    `;
}

function noteHTML(note,index){

    return `
        <div class="note">
            <b>${escapeHTML(note.title)}</b>

            <p>
                ${escapeHTML(note.text)}
            </p>

            ${makeMenu(
                "noteMenu"+index,
                `
                <button onclick="editNote(${index})">
                    Edit
                </button>

                <button onclick="downloadNote(${index})">
                    Download document
                </button>

                <button
                    class="danger"
                    onclick="deleteNote(${index})"
                >
                    Delete
                </button>
                `
            )}
        </div>
    `;
}

function deletedNoteHTML(note,index){

    return `
        <div class="note">
            <b>${escapeHTML(note.title)}</b>

            <p>
                ${escapeHTML(note.text)}
            </p>

            ${makeMenu(
                "deletedMenu"+index,
                `
                <button onclick="restoreNote(${index})">
                    Restore
                </button>

                <button
                    class="danger"
                    onclick="deleteForever(${index})"
                >
                    Delete forever
                </button>
                `
            )}
        </div>
    `;
}

function saveNote(){

    const text =
        $("#newNote").value.trim();

    if(!text){
        toast("Write a note first.");
        return;
    }

    state.notes.push({
        id:Date.now(),
        title:text.split("\n")[0].slice(0,60),
        text,
        created:Date.now()
    });

    persist();

    renderNotes();

    toast("Note saved.");
}

function editNote(index){

    const note = state.notes[index];

    const result =
        prompt("Edit note:",note.text);

    if(result === null) return;

    const text = result.trim();

    if(!text){
        toast("Note cannot be empty.");
        return;
    }

    note.text = text;
    note.title =
        text.split("\n")[0].slice(0,60);

    persist();
    renderNotes();
}

function deleteNote(index){

    const note =
        state.notes.splice(index,1)[0];

    state.deletedNotes.push(note);

    persist();
    renderNotes();

    toast("Moved to Recently deleted.");
}

function restoreNote(index){

    const note =
        state.deletedNotes.splice(index,1)[0];

    state.notes.push(note);

    persist();
    renderNotes();

    toast("Note restored.");
}

function deleteForever(index){

    if(!confirm("Delete this note forever?")){
        return;
    }

    state.deletedNotes.splice(index,1);

    persist();
    renderNotes();

    toast("Deleted forever.");
}

function downloadNote(index){

    const note = state.notes[index];

    const blob =
        new Blob(
            [note.text],
            {type:"text/plain;charset=utf-8"}
        );

    downloadBlob(
        blob,
        (note.title || "note")+".txt"
    );
}

function downloadBlob(blob,name){

    const url =
        URL.createObjectURL(blob);

    const a =
        document.createElement("a");

    a.href = url;
    a.download = name;

    document.body.appendChild(a);
    a.click();
    a.remove();

    setTimeout(()=>{
        URL.revokeObjectURL(url);
    },1000);
}
 
