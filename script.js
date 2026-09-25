const $=s=>document.querySelector(s);
const $$=s=>Array.from(document.querySelectorAll(s));

const KEYS={
    notes:"barmaan_notes",
    deletedNotes:"barmaan_deleted_notes",
    tasks:"barmaan_tasks",
    alarms:"barmaan_alarms",
    bedtime:"barmaan_bedtime",
    apps:"barmaan_installed_apps",
    credit:"barmaan_credit",
    mission:"barmaan_current_mission",
    stats:"barmaan_stats",
    voices:"barmaan_voice_ids",
    settings:"barmaan_settings"
};

const state={
    page:"clock",
    clockTab:"bedtime",
    notes:load(KEYS.notes,[]),
    deletedNotes:load(KEYS.deletedNotes,[]),
    tasks:load(KEYS.tasks,[]),
    alarms:load(KEYS.alarms,[]),
    bedtime:load(KEYS.bedtime,null),
    apps:load(KEYS.apps,[]),
    credit:Number(load(KEYS.credit,0)),
    mission:load(KEYS.mission,null),
    stats:load(KEYS.stats,{correct:0,wrong:0}),
    settings:load(KEYS.settings,{notifications:false}),
    stopwatch:{
        running:false,
        started:0,
        elapsed:0
    },
    timer:{
        running:false,
        started:0,
        elapsed:0,
        duration:0
    },
    voice:{
        recorder:null,
        stream:null,
        chunks:[],
        recording:false
    },
    photo:{
        qualityImage:null,
        subjectImage:null,
        subjectMode:"subjects",
        drawPoints:[],
        drawing:false,
        createText:""
    }
};

let db=null;
let toastTimer=null;

function load(key,fallback){
    try{
        const value=localStorage.getItem(key);
        return value===null?fallback:JSON.parse(value);
    }catch(e){
        return fallback;
    }
}

function save(key,value){
    localStorage.setItem(key,JSON.stringify(value));
}

function persist(){
    save(KEYS.notes,state.notes);
    save(KEYS.deletedNotes,state.deletedNotes);
    save(KEYS.tasks,state.tasks);
    save(KEYS.alarms,state.alarms);
    save(KEYS.bedtime,state.bedtime);
    save(KEYS.apps,state.apps);
    save(KEYS.credit,state.credit);
    save(KEYS.mission,state.mission);
    save(KEYS.stats,state.stats);
    save(KEYS.settings,state.settings);
}

function uid(prefix="id"){
    return prefix+"_"+Date.now()+"_"+Math.random().toString(36).slice(2,9);
}

function escapeHTML(value){
    return String(value??"")
        .replaceAll("&","&amp;")
        .replaceAll("<","&lt;")
        .replaceAll(">","&gt;")
        .replaceAll('"',"&quot;")
        .replaceAll("'","&#039;");
}

function toast(message){
    const el=$("#toast");
    if(!el)return;
    el.textContent=message;
    el.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer=setTimeout(()=>{
        el.classList.remove("show");
    },2800);
}

function openModal(title,body){
    const root=$("#modalRoot");
    if(!root)return;

    root.innerHTML=`
        <div class="modal">
            <div class="modal-head">
                <h3>${escapeHTML(title)}</h3>
                <button class="close-button" id="modalClose">×</button>
            </div>
            <div>${body}</div>
        </div>
    `;

    root.classList.add("show");

    $("#modalClose").onclick=closeModal;

    root.onclick=e=>{
        if(e.target===root){
            closeModal();
        }
    };
}

function closeModal(){
    $("#modalRoot")?.classList.remove("show");
}

function downloadBlob(blob,name){
    const url=URL.createObjectURL(blob);
    const a=document.createElement("a");
    a.href=url;
    a.download=name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(()=>URL.revokeObjectURL(url),1000);
}

function formatTime(date=new Date()){
    return new Intl.DateTimeFormat(undefined,{
        hour:"2-digit",
        minute:"2-digit",
        second:"2-digit"
    }).format(date);
}

function formatDate(date=new Date()){
    return new Intl.DateTimeFormat(undefined,{
        year:"numeric",
        month:"2-digit",
        day:"2-digit"
    }).format(date);
}

function localDateTimeValue(date=new Date()){
    const y=date.getFullYear();
    const m=String(date.getMonth()+1).padStart(2,"0");
    const d=String(date.getDate()).padStart(2,"0");
    const h=String(date.getHours()).padStart(2,"0");
    const min=String(date.getMinutes()).padStart(2,"0");
    return {
        date:`${y}-${m}-${d}`,
        time:`${h}:${min}`
    };
}

function notify(title,body){
    playNotificationSound();

    if("Notification" in window){
        if(Notification.permission==="granted"){
            try{
                new Notification(title,{body});
            }catch(e){}
        }
    }
}

async function requestNotifications(){
    if(!("Notification" in window)){
        toast("Notifications are not supported.");
        return false;
    }

    try{
        const result=await Notification.requestPermission();
        state.settings.notifications=result==="granted";
        persist();
        toast(
            result==="granted"
            ?"Notifications enabled."
            :"Notifications were not enabled."
        );
        return result==="granted";
    }catch(e){
        return false;
    }
}

function playNotificationSound(){
    try{
        const AudioContext=
            window.AudioContext||
            window.webkitAudioContext;

        if(!AudioContext)return;

        const ctx=new AudioContext();

        const tones=[
            {f:880,t:0,d:.13},
            {f:440,t:.17,d:.13},
            {f:880,t:.34,d:.13}
        ];

        tones.forEach(x=>{
            const osc=ctx.createOscillator();
            const gain=ctx.createGain();

            osc.type="sine";
            osc.frequency.value=x.f;

            gain.gain.setValueAtTime(
                .0001,
                ctx.currentTime+x.t
            );

            gain.gain.exponentialRampToValueAtTime(
                .18,
                ctx.currentTime+x.t+.02
            );

            gain.gain.exponentialRampToValueAtTime(
                .0001,
                ctx.currentTime+x.t+x.d
            );

            osc.connect(gain);
            gain.connect(ctx.destination);

            osc.start(ctx.currentTime+x.t);
            osc.stop(ctx.currentTime+x.t+x.d+.02);
        });

        setTimeout(()=>ctx.close(),1000);
    }catch(e){}
}

function render(){
    renderNav();
    renderPage();
}

function renderNav(){
    const nav=$("#nav");
    if(!nav)return;

    const items=[
        ["clock","Clock"],
        ["notes","Notes"],
        ["tasks","Tasks"],
        ["store","UI Store"],
        ["voices","Voices"],
        ["photo","Photo AI"]
    ];

    nav.innerHTML=items.map(item=>`
        <button
            class="${state.page===item[0]?"active":""}"
            data-page="${item[0]}">
            ${item[1]}
        </button>
    `).join("");

    $$("#nav button").forEach(button=>{
        button.onclick=()=>{
            state.page=button.dataset.page;
            render();
        };
    });
}

function renderPage(){
    const app=$("#app");
    if(!app)return;

    if(state.page==="clock"){
        renderClock();
        return;
    }

    if(state.page==="notes"){
        renderNotes();
        return;
    }

    if(state.page==="tasks"){
        renderTasks();
        return;
    }

    if(state.page==="store"){
        renderStore();
        return;
    }

    if(state.page==="voices"){
        renderVoices();
        return;
    }

    if(state.page==="photo"){
        renderPhoto();
        return;
    }

    app.innerHTML="";
}

function renderClock(){
    const app=$("#app");

    app.innerHTML=`
        <h1 class="page-title">Clock</h1>

        <div class="clock-tabs">
            ${clockTabButton("bedtime","Bedtime")}
            ${clockTabButton("alarm","Alarm")}
            ${clockTabButton("world","World Clock")}
            ${clockTabButton("stopwatch","Stopwatch")}
            ${clockTabButton("timer","Timer")}
        </div>

        <div id="clockContent"></div>
    `;

    $$(".clock-tabs button").forEach(button=>{
        button.onclick=()=>{
            state.clockTab=button.dataset.tab;
            renderClock();
        };
    });

    const content=$("#clockContent");

    if(state.clockTab==="bedtime"){
        renderBedtime(content);
    }

    if(state.clockTab==="alarm"){
        renderAlarm(content);
    }

    if(state.clockTab==="world"){
        renderWorld(content);
    }

    if(state.clockTab==="stopwatch"){
        renderStopwatch(content);
    }

    if(state.clockTab==="timer"){
        renderTimer(content);
    }
}

function clockTabButton(tab,label){
    return `
        <button
            data-tab="${tab}"
            class="${state.clockTab===tab?"active":""}">
            ${label}
        </button>
    `;
}

function renderBedtime(el){
    const current=state.bedtime||"";

    el.innerHTML=`
        <div class="card">
            <h3>Bedtime</h3>
            <p class="muted">
                Set a daily bedtime reminder.
            </p>

            <div class="form-group">
                <label>Bedtime</label>
                <input
                    id="bedtimeInput"
                    type="time"
                    value="${escapeHTML(current)}">
            </div>

            <div class="row">
                <button
                    class="action primary"
                    id="saveBedtime">
                    Save bedtime
                </button>

                <button
                    class="action secondary"
                    id="clearBedtime">
                    Clear
                </button>

                <button
                    class="action secondary"
                    id="enableNotifications">
                    Enable notifications
                </button>
            </div>
        </div>
    `;

    $("#saveBedtime").onclick=()=>{
        const value=$("#bedtimeInput").value;

        if(!value){
            toast("Choose a bedtime.");
            return;
        }

        state.bedtime=value;
        persist();

        toast("Bedtime saved.");
        renderClock();
    };

    $("#clearBedtime").onclick=()=>{
        state.bedtime=null;
        persist();
        renderClock();
        toast("Bedtime cleared.");
    };

    $("#enableNotifications").onclick=requestNotifications;
}

function renderAlarm(el){
    el.innerHTML=`
        <div class="card">
            <h3>Create alarm</h3>

            <div class="form-group">
                <label>Time</label>
                <input id="alarmTime" type="time">
            </div>

            <div class="grid">
                <div class="form-group">
                    <label>Snooze interval</label>
                    <input
                        id="snoozeInterval"
                        type="number"
                        min="1"
                        max="60"
                        value="5">
                </div>

                <div class="form-group">
                    <label>Snooze count</label>
                    <select id="snoozeCount">
                        <option value="forever">Forever</option>
                        <option value="1">1 time</option>
                        <option value="2">2 time</option>
                        <option value="5">5 time</option>
                        <option value="10">10 time</option>
                        <option value="0">Snooze off</option>
                    </select>
                </div>
            </div>

            <button
                class="action primary"
                id="addAlarm">
                Add alarm
            </button>

            <button
                class="action secondary"
                id="alarmNotifications">
                Enable notifications
            </button>
        </div>

        <div class="card">
            <h3>Alarms</h3>
            <div id="alarmList"></div>
        </div>
    `;

    $("#addAlarm").onclick=addAlarm;
    $("#alarmNotifications").onclick=requestNotifications;

    renderAlarmList();
}

function addAlarm(){
    const time=$("#alarmTime").value;
    let interval=Number($("#snoozeInterval").value);

    interval=Math.max(1,Math.min(60,interval));

    if(!time){
        toast("Choose an alarm time.");
        return;
    }

    const count=$("#snoozeCount").value;

    state.alarms.push({
        id:uid("alarm"),
        time,
        interval,
        count,
        enabled:true,
        firedKey:"",
        snoozeUntil:0,
        snoozeUsed:0,
        ringing:false
    });

    persist();
    renderClock();
    toast("Alarm added.");
}

function renderAlarmList(){
    const list=$("#alarmList");
    if(!list)return;

    if(!state.alarms.length){
        list.innerHTML=`<div class="empty">No alarms.</div>`;
        return;
    }

    list.innerHTML=state.alarms.map(alarm=>`
        <div class="alarm-item">
            <div class="row">
                <strong class="world-time">
                    ${escapeHTML(alarm.time)}
                </strong>

                <span class="muted">
                    Snooze:
                    ${escapeHTML(
                        alarm.count==="forever"
                        ?"Forever"
                        :alarm.count==="0"
                        ?"Off"
                        :alarm.count+" time"
                    )}
                </span>
            </div>

            <div class="inline-menu">
                <button data-toggle="${alarm.id}">
                    ${alarm.enabled?"Turn off":"Turn on"}
                </button>

                <button
                    class="danger"
                    data-delete-alarm="${alarm.id}">
                    Delete
                </button>
            </div>
        </div>
    `).join("");

    $$("[data-toggle]").forEach(button=>{
        button.onclick=()=>{
            const alarm=state.alarms.find(
                x=>x.id===button.dataset.toggle
            );

            if(!alarm)return;

            alarm.enabled=!alarm.enabled;
            persist();
            renderAlarmList();
        };
    });

    $$("[data-delete-alarm]").forEach(button=>{
        button.onclick=()=>{
            state.alarms=
                state.alarms.filter(
                    x=>x.id!==button.dataset.deleteAlarm
                );

            persist();
            renderAlarmList();
        };
    });
}

function renderWorld(el){
    const zones=[
        ["Local","local"],
        ["Toronto","America/Toronto"],
        ["New York","America/New_York"],
        ["London","Europe/London"],
        ["Paris","Europe/Paris"],
        ["Tokyo","Asia/Tokyo"],
        ["Dubai","Asia/Dubai"]
    ];

    el.innerHTML=`
        <div class="card">
            <h3>World Clock</h3>
            <div id="worldList">
                ${zones.map(zone=>`
                    <div class="world-row">
                        <span>${zone[0]}</span>
                        <span
                            class="world-time"
                            data-zone="${zone[1]}">
                            --
                        </span>
                    </div>
                `).join("")}
            </div>
        </div>
    `;

    updateWorldClock();
}

function updateWorldClock(){
    $$("[data-zone]").forEach(el=>{
        const zone=el.dataset.zone;
        const date=new Date();

        try{
            el.textContent=new Intl.DateTimeFormat(
                undefined,
                {
                    timeZone:zone==="local"
                        ?undefined
                        :zone,
                    hour:"2-digit",
                    minute:"2-digit",
                    second:"2-digit"
                }
            ).format(date);
        }catch(e){
            el.textContent=formatTime(date);
        }
    });
}
function renderStopwatch(el){
    el.innerHTML=`
        <div class="card center">
            <h3>Stopwatch</h3>

            <div
                id="stopwatchDisplay"
                class="clock-display">
                00:00.00
            </div>

            <div class="row">
                <button
                    class="action primary"
                    id="stopwatchStart">
                    Start
                </button>

                <button
                    class="action secondary"
                    id="stopwatchReset">
                    Reset
                </button>
            </div>
        </div>
    `;

    $("#stopwatchStart").onclick=()=>{
        if(state.stopwatch.running){
            state.stopwatch.elapsed+=
                Date.now()-state.stopwatch.started;

            state.stopwatch.running=false;

            $("#stopwatchStart").textContent="Start";
        }else{
            state.stopwatch.started=Date.now();
            state.stopwatch.running=true;

            $("#stopwatchStart").textContent="Pause";
        }
    };

    $("#stopwatchReset").onclick=()=>{
        state.stopwatch.running=false;
        state.stopwatch.started=0;
        state.stopwatch.elapsed=0;
        renderStopwatch(el);
    };

    updateStopwatch();
}

function updateStopwatch(){
    const display=$("#stopwatchDisplay");
    if(!display)return;

    let elapsed=state.stopwatch.elapsed;

    if(state.stopwatch.running){
        elapsed+=Date.now()-state.stopwatch.started;
    }

    display.textContent=formatStopwatch(elapsed);
}

function formatStopwatch(ms){
    const minutes=Math.floor(ms/60000);
    const seconds=Math.floor((ms%60000)/1000);
    const centiseconds=Math.floor((ms%1000)/10);

    return String(minutes).padStart(2,"0")+
        ":"+
        String(seconds).padStart(2,"0")+
        "."+
        String(centiseconds).padStart(2,"0");
}

function renderTimer(el){
    el.innerHTML=`
        <div class="card center">
            <h3>Timer</h3>

            <div
                id="timerDisplay"
                class="clock-display">
                00:00
            </div>

            <div class="grid">
                <div class="form-group">
                    <label>Minutes</label>
                    <input
                        id="timerMinutes"
                        type="number"
                        min="0"
                        max="999"
                        value="0">
                </div>

                <div class="form-group">
                    <label>Seconds</label>
                    <input
                        id="timerSeconds"
                        type="number"
                        min="0"
                        max="59"
                        value="0">
                </div>
            </div>

            <div class="row">
                <button
                    class="action primary"
                    id="timerStart">
                    Start
                </button>

                <button
                    class="action secondary"
                    id="timerRestart">
                    Restart
                </button>

                <button
                    class="action secondary"
                    id="timerReset">
                    Reset
                </button>
            </div>
        </div>
    `;

    $("#timerStart").onclick=()=>{
        if(state.timer.running){
            state.timer.elapsed+=
                Date.now()-state.timer.started;

            state.timer.running=false;
            $("#timerStart").textContent="Start";
            return;
        }

        if(state.timer.duration<=0){
            const min=Math.max(
                0,
                Number($("#timerMinutes").value)||0
            );

            const sec=Math.max(
                0,
                Math.min(
                    59,
                    Number($("#timerSeconds").value)||0
                )
            );

            state.timer.duration=
                (min*60+sec)*1000;
        }

        if(state.timer.duration<=0){
            toast("Set a timer first.");
            return;
        }

        state.timer.started=Date.now();
        state.timer.running=true;
        state.timer.elapsed=0;

        $("#timerStart").textContent="Pause";
    };

    $("#timerRestart").onclick=()=>{
        if(state.timer.duration<=0){
            toast("No timer to restart.");
            return;
        }

        state.timer.elapsed=0;
        state.timer.started=Date.now();
        state.timer.running=true;

        $("#timerStart").textContent="Pause";
    };

    $("#timerReset").onclick=()=>{
        state.timer.running=false;
        state.timer.started=0;
        state.timer.elapsed=0;
        state.timer.duration=0;
        renderTimer(el);
    };

    updateTimer();
}

function updateTimer(){
    const display=$("#timerDisplay");
    if(!display)return;

    let elapsed=state.timer.elapsed;

    if(state.timer.running){
        elapsed+=Date.now()-state.timer.started;
    }

    let remaining=
        Math.max(0,state.timer.duration-elapsed);

    if(state.timer.running&&remaining<=0){
        state.timer.running=false;
        state.timer.elapsed=0;
        state.timer.started=0;

        notify(
            "Timer finished",
            "Your timer has finished."
        );

        toast("Timer finished.");

        renderClock();
        return;
    }

    const totalSeconds=Math.ceil(remaining/1000);
    const minutes=Math.floor(totalSeconds/60);
    const seconds=totalSeconds%60;

    display.textContent=
        String(minutes).padStart(2,"0")+
        ":"+
        String(seconds).padStart(2,"0");
}

function renderNotes(){
    const app=$("#app");

    app.innerHTML=`
        <h1 class="page-title">Notes</h1>

        <div class="card">
            <h3>New note</h3>

            <textarea
                id="newNote"
                placeholder="Write here"></textarea>

            <button
                class="action primary"
                id="saveNote">
                Save note
            </button>
        </div>

        <div class="card">
            <h3>My notes</h3>

            <div id="notesList">
                ${
                    state.notes.length
                    ?state.notes.map(noteHTML).join("")
                    :`<div class="empty">No notes.</div>`
                }
            </div>
        </div>

        <div class="card">
            <h3>Recently deleted</h3>

            ${
                state.deletedNotes.length
                ?state.deletedNotes
                    .map(deletedNoteHTML)
                    .join("")
                :`<div class="empty">
                    Recently deleted is empty.
                  </div>`
            }
        </div>
    `;

    $("#saveNote").onclick=saveNote;
}

function noteHTML(note,index){
    return `
        <div class="note">
            <div class="note-content">
                <b>${escapeHTML(note.title)}</b>
                <p>${escapeHTML(note.text)}</p>
            </div>

            <div class="note-actions">
                <button
                    type="button"
                    data-note-edit="${index}">
                    Edit
                </button>

                <button
                    type="button"
                    data-note-download="${index}">
                    Download document
                </button>

                <button
                    type="button"
                    class="danger"
                    data-note-delete="${index}">
                    Delete
                </button>
            </div>
        </div>
    `;
}

function deletedNoteHTML(note,index){
    return `
        <div class="note">
            <div class="note-content">
                <b>${escapeHTML(note.title)}</b>
                <p>${escapeHTML(note.text)}</p>
            </div>

            <div class="note-actions">
                <button
                    type="button"
                    data-note-restore="${index}">
                    Restore
                </button>

                <button
                    type="button"
                    class="danger"
                    data-note-forever="${index}">
                    Delete forever
                </button>
            </div>
        </div>
    `;
}

document.addEventListener("click",e=>{
    const edit=e.target.closest("[data-note-edit]");

    if(edit){
        editNote(Number(edit.dataset.noteEdit));
        return;
    }

    const download=e.target.closest("[data-note-download]");

    if(download){
        downloadNote(Number(download.dataset.noteDownload));
        return;
    }

    const del=e.target.closest("[data-note-delete]");

    if(del){
        deleteNote(Number(del.dataset.noteDelete));
        return;
    }

    const restore=e.target.closest("[data-note-restore]");

    if(restore){
        restoreNote(Number(restore.dataset.noteRestore));
        return;
    }

    const forever=e.target.closest("[data-note-forever]");

    if(forever){
        deleteForever(Number(forever.dataset.noteForever));
    }
});

function saveNote(){
    const input=$("#newNote");
    if(!input)return;

    const text=input.value.trim();

    if(!text){
        toast("Write a note first.");
        return;
    }

    state.notes.unshift({
        id:uid("note"),
        title:text.split("\n")[0].slice(0,70),
        text,
        created:Date.now()
    });

    persist();
    renderNotes();
    toast("Note saved.");
}

function editNote(index){
    const note=state.notes[index];

    if(!note)return;

    openModal(
        "Edit note",
        `
        <div class="form-group">
            <textarea id="editNoteText">${escapeHTML(
                note.text
            )}</textarea>
        </div>

        <button
            class="action primary"
            id="saveEditedNote">
            Save
        </button>
        `
    );

    $("#saveEditedNote").onclick=()=>{
        const text=$("#editNoteText").value.trim();

        if(!text){
            toast("Note cannot be empty.");
            return;
        }

        note.text=text;
        note.title=text.split("\n")[0].slice(0,70);

        persist();
        closeModal();
        renderNotes();

        toast("Note updated.");
    };
}

function deleteNote(index){
    const note=state.notes.splice(index,1)[0];

    if(!note)return;

    state.deletedNotes.unshift({
        ...note,
        deletedAt:Date.now()
    });

    persist();
    renderNotes();

    toast("Moved to Recently deleted.");
}

function restoreNote(index){
    const note=state.deletedNotes.splice(index,1)[0];

    if(!note)return;

    delete note.deletedAt;

    state.notes.unshift(note);

    persist();
    renderNotes();

    toast("Note restored.");
}

function deleteForever(index){
    state.deletedNotes.splice(index,1);

    persist();
    renderNotes();

    toast("Deleted forever.");
}

function downloadNote(index){
    const note=state.notes[index];

    if(!note)return;

    const blob=new Blob(
        [note.text],
        {type:"text/plain;charset=utf-8"}
    );

    downloadBlob(
        blob,
        (note.title||"note")
            .replace(/[\\/:*?"<>|]/g,"_")+
        ".txt"
    );
}

function renderTasks(){
    const app=$("#app");

    app.innerHTML=`
        <h1 class="page-title">Tasks</h1>

        <div class="card">
            <h3>Add tasks</h3>

            <p class="muted">
                Each line becomes a separate task.
            </p>

            <textarea
                id="taskInput"
                placeholder="Task one&#10;Task two&#10;Task three"></textarea>

            <button
                class="action primary"
                id="addTasks">
                Add tasks
            </button>
        </div>

        <div class="card">
            <h3>My tasks</h3>

            <div id="taskList"></div>
        </div>
    `;

    $("#addTasks").onclick=addTasks;

    renderTaskList();
}

function addTasks(){
    const input=$("#taskInput");
    if(!input)return;

    const lines=input.value
        .split(/\r?\n/)
        .map(x=>x.trim())
        .filter(Boolean);

    if(!lines.length){
        toast("Write at least one task.");
        return;
    }

    lines.forEach(text=>{
        state.tasks.push({
            id:uid("task"),
            text,
            reminder:null,
            reminderFired:false,
            created:Date.now()
        });
    });

    persist();
    renderTasks();

    toast(
        lines.length===1
        ?"Task added."
        :`${lines.length} tasks added.`
    );
}
function renderTaskList(){
    const list=$("#taskList");
    if(!list)return;

    if(!state.tasks.length){
        list.innerHTML=`
            <div class="empty">
                No tasks.
            </div>
        `;
        return;
    }

    list.innerHTML=state.tasks.map((task,index)=>`
        <div class="task">
            <input
                class="task-check"
                type="checkbox"
                data-task-check="${index}">

            <div class="task-text">
                ${escapeHTML(task.text)}

                ${
                    task.reminder
                    ?`
                    <div class="task-reminder">
                        Reminder:
                        ${escapeHTML(
                            new Date(task.reminder)
                                .toLocaleString()
                        )}
                    </div>
                    `
                    :""
                }
            </div>

            <button
                class="menu-button"
                data-task-menu="${index}">
                ⋯
            </button>
        </div>
    `).join("");

    $$("[data-task-check]").forEach(box=>{
        box.onchange=()=>{
            if(box.checked){
                state.tasks.splice(
                    Number(box.dataset.taskCheck),
                    1
                );

                persist();
                renderTaskList();

                toast("Task completed.");
            }
        };
    });

    $$("[data-task-menu]").forEach(button=>{
        button.onclick=()=>{
            const index=
                Number(button.dataset.taskMenu);

            showTaskMenu(index);
        };
    });
}

function showTaskMenu(index){
    const task=state.tasks[index];

    if(!task)return;

    openModal(
        "Task",
        `
        <div class="column">
            <button
                class="action primary"
                id="taskRemind">
                Remind me
            </button>

            <button
                class="action danger"
                id="taskDelete">
                Delete task
            </button>
        </div>
        `
    );

    $("#taskRemind").onclick=()=>{
        closeModal();
        openReminderModal(index);
    };

    $("#taskDelete").onclick=()=>{
        state.tasks.splice(index,1);
        persist();
        closeModal();
        renderTasks();
        toast("Task deleted.");
    };
}

function openReminderModal(index){
    const task=state.tasks[index];

    if(!task)return;

    const now=localDateTimeValue();

    openModal(
        "Remind me",
        `
        <div class="form-group">
            <label>Date</label>
            <input
                id="reminderDate"
                type="date"
                value="${now.date}">
        </div>

        <div class="form-group">
            <label>Time</label>
            <input
                id="reminderTime"
                type="time"
                value="${now.time}">
        </div>

        <button
            class="action primary"
            id="saveReminder">
            Save reminder
        </button>
        `
    );

    $("#saveReminder").onclick=()=>{
        const date=$("#reminderDate").value;
        const time=$("#reminderTime").value;

        if(!date||!time){
            toast("Choose date and time.");
            return;
        }

        const target=new Date(`${date}T${time}:00`);

        if(Number.isNaN(target.getTime())){
            toast("Invalid date or time.");
            return;
        }

        if(target.getTime()<=Date.now()){
            toast("Choose a future time.");
            return;
        }

        task.reminder=target.toISOString();
        task.reminderFired=false;

        persist();
        closeModal();
        renderTasks();

        requestNotifications();

        toast("Reminder saved.");
    };
}

async function loadPosts(){
    try{
        const response=await fetch(
            "posts.json",
            {cache:"no-store"}
        );

        if(!response.ok){
            throw new Error("posts");
        }

        const data=await response.json();

        return Array.isArray(data)?data:[];
    }catch(e){
        return [];
    }
}

function renderStore(){
    const app=$("#app");

    app.innerHTML=`
        <h1 class="page-title">UI Store</h1>

        <div class="card">
            <h3>Earn Credit</h3>

            <div class="balance">
                ${state.credit.toFixed(2)}¢
            </div>

            <div id="missionArea"></div>
        </div>

        <div class="card">
            <h3>Store</h3>
            <div id="storeList">
                <div class="empty">
                    Loading...
                </div>
            </div>
        </div>

        <div class="card">
            <h3>My Apps</h3>
            <div id="myApps"></div>
        </div>
    `;

    renderMission();
    loadPosts().then(posts=>{
        renderStoreItems(posts);
    });

    renderMyApps();
}

function renderStoreItems(posts){
    const list=$("#storeList");
    if(!list)return;

    if(!posts.length){
        list.innerHTML=`
            <div class="empty">
                No store items found.
            </div>
        `;
        return;
    }

    list.innerHTML=posts.map((post,index)=>{
        const blocked=
            isRegionBlocked(post.regionBlocked);

        const price=Number(post.price||0);

        return `
            <div class="store-item">
                <div class="store-info">
                    <div class="store-name">
                        ${escapeHTML(post.name||"Unnamed")}
                    </div>

                    <div class="store-description">
                        ${escapeHTML(
                            post.description||""
                        )}
                    </div>
                </div>

                <div>
                    <div class="price">
                        ${
                            blocked
                            ?"Blocked"
                            :price===0
                            ?"Free"
                            :price.toFixed(2)+"¢"
                        }
                    </div>

                    <button
                        class="action ${
                            blocked
                            ?"secondary"
                            :"primary"
                        }"
                        data-store-install="${index}"
                        ${blocked?"disabled":""}>
                        ${
                            blocked
                            ?"Blocked"
                            :"Install"
                        }
                    </button>
                </div>
            </div>
        `;
    }).join("");

    $$("[data-store-install]").forEach(button=>{
        button.onclick=()=>{
            const post=posts[
                Number(button.dataset.storeInstall)
            ];

            installStoreApp(post);
        };
    });
}

function getLocaleCountry(){
    const language=
        navigator.language||
        navigator.userLanguage||
        "";

    const parts=language.split("-");

    if(parts.length>1){
        return parts[1].toUpperCase();
    }

    return "";
}

function isRegionBlocked(regions){
    if(!Array.isArray(regions))return false;

    const country=getLocaleCountry();

    return country?
        regions.map(String).includes(country):
        false;
}

function installStoreApp(post){
    if(!post)return;

    const name=String(post.name||"Unnamed");
    const url=String(post.url||"");

    const exists=state.apps.some(
        app=>app.name===name
    );

    if(!exists){
        state.apps.push({
            id:uid("app"),
            name,
            url,
            type:"PWA",
            installedAt:Date.now()
        });

        persist();
    }

    if(url){
        try{
            window.open(url,"_blank");
        }catch(e){}
    }

    renderStore();
    toast(`${name} installed.`);
}

function renderMyApps(){
    const list=$("#myApps");
    if(!list)return;

    if(!state.apps.length){
        list.innerHTML=`
            <div class="empty">
                No installed apps.
            </div>
        `;
        return;
    }

    list.innerHTML=state.apps.map((app,index)=>`
        <div class="app-item">
            <div class="row">
                <strong>
                    ${escapeHTML(app.name)}
                </strong>

                <span class="muted">
                    PWA
                </span>
            </div>

            <button
                class="action primary"
                data-open-app="${index}">
                Open
            </button>
        </div>
    `).join("");

    $$("[data-open-app]").forEach(button=>{
        button.onclick=()=>{
            const app=state.apps[
                Number(button.dataset.openApp)
            ];

            if(app?.url){
                window.open(app.url,"_blank");
            }else{
                toast("This app has no URL.");
            }
        };
    });
}

function createMission(){
    const levels=[
        {name:"Easy",reward:20},
        {name:"Medium",reward:50},
        {name:"Hard",reward:100}
    ];

    const level=
        levels[Math.floor(Math.random()*levels.length)];

    const types=[
        "addition",
        "subtraction",
        "multiplication",
        "division"
    ];

    const type=
        types[Math.floor(Math.random()*types.length)];

    let a,b,answer,question;

    if(type==="addition"){
        a=randomInt(
            level.name==="Easy"?1:10,
            level.name==="Hard"?500:100
        );

        b=randomInt(
            level.name==="Easy"?1:10,
            level.name==="Hard"?500:100
        );

        answer=a+b;
        question=`${a} + ${b} = ?`;
    }

    if(type==="subtraction"){
        a=randomInt(
            level.name==="Easy"?5:20,
            level.name==="Hard"?500:200
        );

        b=randomInt(
            1,
            Math.max(1,a)
        );

        answer=a-b;
        question=`${a} - ${b} = ?`;
    }

    if(type==="multiplication"){
        a=randomInt(
            1,
            level.name==="Easy"?10:
            level.name==="Medium"?20:50
        );

        b=randomInt(
            1,
            level.name==="Easy"?10:
            level.name==="Medium"?20:50
        );

        answer=a*b;
        question=`${a} × ${b} = ?`;
    }

    if(type==="division"){
        b=randomInt(
            1,
            level.name==="Easy"?5:
            level.name==="Medium"?12:25
        );

        answer=randomInt(
            1,
            level.name==="Easy"?10:
            level.name==="Medium"?30:100
        );

        a=b*answer;
        question=`${a} ÷ ${b} = ?`;
    }

    const choices=new Set([answer]);

    while(choices.size<3){
        const offset=
            randomInt(
                1,
                Math.max(3,
                    Math.ceil(Math.abs(answer)*.35)+3
                )
            );

        const sign=
            Math.random()<.5?-1:1;

        const value=answer+offset*sign;

        if(value>=0){
            choices.add(value);
        }
    }

    const mission={
        id:uid("mission"),
        level:level.name,
        reward:level.reward,
        type,
        question,
        answer,
        choices:Array.from(choices)
            .sort(()=>Math.random()-.5),
        created:Date.now()
    };

    state.mission=mission;
    persist();

    return mission;
}

function randomInt(min,max){
    return Math.floor(
        Math.random()*(max-min+1)
    )+min;
}

function renderMission(){
    const area=$("#missionArea");
    if(!area)return;

    let mission=state.mission;

    if(!mission){
        mission=createMission();
    }

    area.innerHTML=`
        <div class="reward-box">
            <div>
                ${escapeHTML(mission.level)}
                ·
                +${mission.reward}¢
            </div>

            <div
                class="mission-question">
                ${escapeHTML(mission.question)}
            </div>

            <div class="grid-3">
                ${mission.choices.map(choice=>`
                    <button
                        class="choice"
                        data-answer="${choice}">
                        ${choice}
                    </button>
                `).join("")}
            </div>
        </div>
    `;

    $$("[data-answer]").forEach(button=>{
        button.onclick=()=>{
            answerMission(
                Number(button.dataset.answer)
            );
        };
    });
}

function answerMission(value){
    const mission=state.mission;

    if(!mission)return;

    if(value===mission.answer){
        state.credit+=mission.reward;
        state.stats.correct++;
        persist();

        toast(
            `Correct! +${mission.reward}¢`
        );
    }else{
        state.stats.wrong++;
        persist();

        toast("Wrong answer. +0¢");
    }

    state.mission=null;
    persist();

    renderMission();
}
function openVoiceDB(){
    return new Promise((resolve,reject)=>{
        if(db){
            resolve(db);
            return;
        }

        const request=indexedDB.open(
            "BarmaanUtilityDB",
            1
        );

        request.onupgradeneeded=e=>{
            const database=e.target.result;

            if(!database.objectStoreNames.contains("voices")){
                database.createObjectStore(
                    "voices",
                    {keyPath:"id"}
                );
            }
        };

        request.onsuccess=e=>{
            db=e.target.result;
            resolve(db);
        };

        request.onerror=()=>{
            reject(request.error);
        };
    });
}

async function voiceGetAll(){
    const database=await openVoiceDB();

    return new Promise((resolve,reject)=>{
        const tx=database.transaction(
            "voices",
            "readonly"
        );

        const store=tx.objectStore("voices");
        const request=store.getAll();

        request.onsuccess=()=>{
            resolve(
                request.result.sort(
                    (a,b)=>b.created-a.created
                )
            );
        };

        request.onerror=()=>{
            reject(request.error);
        };
    });
}

async function voicePut(item){
    const database=await openVoiceDB();

    return new Promise((resolve,reject)=>{
        const tx=database.transaction(
            "voices",
            "readwrite"
        );

        tx.objectStore("voices").put(item);

        tx.oncomplete=()=>resolve();
        tx.onerror=()=>reject(tx.error);
    });
}

async function voiceDelete(id){
    const database=await openVoiceDB();

    return new Promise((resolve,reject)=>{
        const tx=database.transaction(
            "voices",
            "readwrite"
        );

        tx.objectStore("voices").delete(id);

        tx.oncomplete=()=>resolve();
        tx.onerror=()=>reject(tx.error);
    });
}

async function renderVoices(){
    const app=$("#app");

    app.innerHTML=`
        <h1 class="page-title">Voices</h1>

        <div class="card">
            <h3>Record voice</h3>

            <div
                id="recorderStatus"
                class="recorder-status">
                Ready
            </div>

            <div class="row">
                <button
                    class="action primary"
                    id="recordVoice">
                    Start recording
                </button>

                <button
                    class="action secondary"
                    id="stopVoice"
                    disabled>
                    Stop
                </button>
            </div>
        </div>

        <div class="card">
            <h3>Saved voices</h3>
            <div id="voiceList">
                <div class="empty">
                    Loading...
                </div>
            </div>
        </div>
    `;

    $("#recordVoice").onclick=startVoiceRecording;
    $("#stopVoice").onclick=stopVoiceRecording;

    try{
        const voices=await voiceGetAll();
        renderVoiceList(voices);
    }catch(e){
        $("#voiceList").innerHTML=`
            <div class="empty">
                Voice storage is unavailable.
            </div>
        `;
    }
}

async function startVoiceRecording(){
    if(state.voice.recording)return;

    if(!navigator.mediaDevices||
       !navigator.mediaDevices.getUserMedia){
        toast("Microphone is not supported.");
        return;
    }

    try{
        const stream=
            await navigator.mediaDevices.getUserMedia({
                audio:true
            });

        let mime="";

        const options=[
            "audio/webm;codecs=opus",
            "audio/webm",
            "audio/ogg;codecs=opus",
            "audio/mp4"
        ];

        for(const type of options){
            if(
                window.MediaRecorder&&
                MediaRecorder.isTypeSupported(type)
            ){
                mime=type;
                break;
            }
        }

        const recorder=new MediaRecorder(
            stream,
            mime?{mimeType:mime}:undefined
        );

        state.voice.stream=stream;
        state.voice.recorder=recorder;
        state.voice.chunks=[];
        state.voice.recording=true;

        recorder.ondataavailable=e=>{
            if(e.data&&e.data.size){
                state.voice.chunks.push(e.data);
            }
        };

        recorder.onstop=async()=>{
            const blob=new Blob(
                state.voice.chunks,
                {
                    type:
                        recorder.mimeType||
                        "audio/webm"
                }
            );

            const item={
                id:uid("voice"),
                blob,
                created:Date.now(),
                name:
                    "Voice "+
                    new Date().toLocaleString()
            };

            try{
                await voicePut(item);
                toast("Voice saved.");
            }catch(e){
                toast("Could not save voice.");
            }

            state.voice.chunks=[];
            state.voice.recording=false;

            stream.getTracks().forEach(
                track=>track.stop()
            );

            state.voice.stream=null;
            state.voice.recorder=null;

            renderVoices();
        };

        recorder.start(200);

        $("#recordVoice").disabled=true;
        $("#stopVoice").disabled=false;
        $("#recorderStatus").textContent=
            "Recording...";
    }catch(e){
        toast("Microphone permission was not granted.");
    }
}

function stopVoiceRecording(){
    if(
        state.voice.recorder&&
        state.voice.recording
    ){
        state.voice.recorder.stop();
    }
}

function renderVoiceList(voices){
    const list=$("#voiceList");
    if(!list)return;

    if(!voices.length){
        list.innerHTML=`
            <div class="empty">
                No saved voices.
            </div>
        `;
        return;
    }

    list.innerHTML=voices.map((voice,index)=>{
        const url=URL.createObjectURL(voice.blob);

        return `
            <div class="voice-item">
                <div class="row">
                    <strong>
                        ${escapeHTML(voice.name)}
                    </strong>

                    <button
                        class="menu-button"
                        data-voice-menu="${index}">
                        ⋯
                    </button>
                </div>

                <audio
                    class="audio"
                    controls
                    src="${url}">
                </audio>
            </div>
        `;
    }).join("");

    $$("[data-voice-menu]").forEach(button=>{
        button.onclick=async()=>{
            const voice=voices[
                Number(button.dataset.voiceMenu)
            ];

            showVoiceMenu(voice);
        };
    });
}

function showVoiceMenu(voice){
    openModal(
        "Voice",
        `
        <div class="column">
            <button
                class="action primary"
                id="editVoice">
                Edit
            </button>

            <button
                class="action danger"
                id="deleteVoice">
                Delete
            </button>
        </div>
        `
    );

    $("#editVoice").onclick=()=>{
        closeModal();
        openVoiceEditor(voice);
    };

    $("#deleteVoice").onclick=async()=>{
        await voiceDelete(voice.id);
        closeModal();
        renderVoices();
        toast("Voice deleted.");
    };
}

async function openVoiceEditor(voice){
    const url=URL.createObjectURL(voice.blob);

    openModal(
        "Edit voice",
        `
        <audio
            id="editAudio"
            class="audio"
            controls
            src="${url}">
        </audio>

        <div class="grid">
            <div class="form-group">
                <label>Trim start (seconds)</label>
                <input
                    id="trimStart"
                    type="number"
                    min="0"
                    step=".01"
                    value="0">
            </div>

            <div class="form-group">
                <label>Trim end (seconds)</label>
                <input
                    id="trimEnd"
                    type="number"
                    min="0"
                    step=".01"
                    value="0">
            </div>
        </div>

        <p class="muted" id="audioDuration">
            Reading duration...
        </p>

        <button
            class="action primary"
            id="saveTrim">
            Save trimmed voice
        </button>
        `
    );

    const audio=$("#editAudio");

    audio.onloadedmetadata=()=>{
        $("#audioDuration").textContent=
            `Duration: ${audio.duration.toFixed(2)} seconds`;

        $("#trimEnd").value=
            audio.duration.toFixed(2);
    };

    $("#saveTrim").onclick=async()=>{
        const start=Math.max(
            0,
            Number($("#trimStart").value)||0
        );

        const endValue=
            Number($("#trimEnd").value);

        const end=
            Number.isFinite(endValue)&&endValue>0
            ?endValue
            :audio.duration;

        if(
            !Number.isFinite(audio.duration)||
            end<=start||
            end>audio.duration+.01
        ){
            toast("Invalid trim range.");
            return;
        }

        toast("Making trimmed voice...");

        try{
            const blob=
                await trimAudioBlob(
                    voice.blob,
                    start,
                    end
                );

            voice.blob=blob;
            voice.name=voice.name+" (edited)";

            await voicePut(voice);

            closeModal();
            renderVoices();

            toast("Voice edited.");
        }catch(e){
            toast("Could not edit this voice.");
        }
    };
}

async function trimAudioBlob(blob,start,end){
    const buffer=
        await blob.arrayBuffer();

    const AudioContext=
        window.AudioContext||
        window.webkitAudioContext;

    if(!AudioContext){
        throw new Error("AudioContext unavailable");
    }

    const ctx=new AudioContext();

    try{
        const source=
            await ctx.decodeAudioData(
                buffer.slice(0)
            );

        const sampleRate=source.sampleRate;
        const channels=source.numberOfChannels;

        const startFrame=
            Math.floor(start*sampleRate);

        const endFrame=
            Math.min(
                source.length,
                Math.floor(end*sampleRate)
            );

        const length=
            Math.max(1,endFrame-startFrame);

        const output=
            ctx.createBuffer(
                channels,
                length,
                sampleRate
            );

        for(let channel=0;channel<channels;channel++){
            const input=
                source.getChannelData(channel);

            const out=
                output.getChannelData(channel);

            out.set(
                input.slice(
                    startFrame,
                    endFrame
                )
            );
        }

        return audioBufferToWav(output);
    }finally{
        ctx.close();
    }
}

function audioBufferToWav(buffer){
    const channels=buffer.numberOfChannels;
    const sampleRate=buffer.sampleRate;
    const frames=buffer.length;
    const bytesPerSample=2;
    const blockAlign=
        channels*bytesPerSample;

    const dataSize=
        frames*blockAlign;

    const arrayBuffer=
        new ArrayBuffer(44+dataSize);

    const view=
        new DataView(arrayBuffer);

    writeString(view,0,"RIFF");
    view.setUint32(4,36+dataSize,true);
    writeString(view,8,"WAVE");
    writeString(view,12,"fmt ");
    view.setUint32(16,16,true);
    view.setUint16(20,1,true);
    view.setUint16(22,channels,true);
    view.setUint32(24,sampleRate,true);
    view.setUint32(
        28,
        sampleRate*blockAlign,
        true
    );
    view.setUint16(
        32,
        blockAlign,
        true
    );
    view.setUint16(34,16,true);
    writeString(view,36,"data");
    view.setUint32(40,dataSize,true);

    let offset=44;

    for(let i=0;i<frames;i++){
        for(let channel=0;channel<channels;channel++){
            const sample=
                buffer.getChannelData(channel)[i];

            const value=Math.max(
                -1,
                Math.min(1,sample)
            );

            view.setInt16(
                offset,
                value<0
                    ?value*0x8000
                    :value*0x7fff,
                true
            );

            offset+=2;
        }
    }

    return new Blob(
        [arrayBuffer],
        {type:"audio/wav"}
    );
}

function writeString(view,offset,string){
    for(let i=0;i<string.length;i++){
        view.setUint8(
            offset+i,
            string.charCodeAt(i)
        );
    }
}

function renderPhoto(){
    const app=$("#app");

    app.innerHTML=`
        <h1 class="page-title">
            Photo AI
        </h1>

        <div class="card">
            <h3>Choose feature</h3>

            <div class="photo-tools">
                <button id="photoQuality">
                    Quality
                </button>

                <button id="photoSubjects">
                    Delete subjects
                </button>

                <button id="photoCreate">
                    Create photo
                </button>
            </div>
        </div>

        <div id="photoArea"></div>
    `;

    $("#photoQuality").onclick=
        renderQualityTool;

    $("#photoSubjects").onclick=
        renderSubjectTool;

    $("#photoCreate").onclick=
        renderCreateTool;

    renderQualityTool();
}

function renderQualityTool(){
    const area=$("#photoArea");

    area.innerHTML=`
        <div class="card">
            <h3>Quality</h3>

            <p class="muted">
                Upload your photo first.
            </p>

            <label class="file-label">
                Upload your photo first
                <input
                    id="qualityUpload"
                    type="file"
                    accept="image/*">
            </label>

            <div
                id="qualityPreview"
                class="generated-result">
            </div>

            <div class="grid">
                <button
                    class="action secondary"
                    id="qualityLow">
                    Change to low quality
                </button>

                <button
                    class="action primary"
                    id="qualityHigh">
                    Change to high quality
                </button>
            </div>

            <button
                class="action primary"
                id="qualitySend">
                Send
            </button>

            <div id="qualityStatus"></div>
            <div id="qualityResult"></div>
        </div>
    `;

    $("#qualityUpload").onchange=
        handleQualityUpload;

    $("#qualityLow").onclick=()=>{
        setQualityMode("low");
    };

    $("#qualityHigh").onclick=()=>{
        setQualityMode("high");
    };

    $("#qualitySend").onclick=
        processQuality;
}

let qualityMode="high";

function setQualityMode(mode){
    qualityMode=mode;

    toast(
        mode==="high"
        ?"High quality selected."
        :"Low quality selected."
    );
}

async function handleQualityUpload(event){
    const file=event.target.files?.[0];

    if(!file)return;

    if(!file.type.startsWith("image/")){
        toast("Please upload an image.");
        return;
    }

    try{
        state.photo.qualityImage=
            await blobToImage(file);

        $("#qualityPreview").innerHTML=`
            <img
                class="photo-preview"
                src="${state.photo.qualityImage.src}">
        `;

        toast("Photo uploaded.");
    }catch(e){
        toast("Could not read the photo.");
    }
}

async function processQuality(){
    const image=state.photo.qualityImage;

    if(!image){
        toast("Upload your photo first.");
        return;
    }

    const status=$("#qualityStatus");
    const result=$("#qualityResult");

    status.innerHTML=`
        <div class="ai-status">
            Making......
        </div>
    `;

    result.innerHTML="";

    await wait(500);

    try{
        const blob=
            await changeImageQuality(
                image,
                qualityMode
            );

        const url=URL.createObjectURL(blob);

        status.innerHTML=`
            <div class="ai-status">
                Your photo is ready
            </div>
        `;

        result.innerHTML=`
            <div class="generated-result">
                <img
                    class="photo-preview"
                    src="${url}">

                <div class="note-actions">
                    <button id="qualityDownload">
                        Download photo
                    </button>

                    <button
                        class="danger"
                        id="qualityDelete">
                        Delete
                    </button>
                </div>
            </div>
        `;

        $("#qualityDownload").onclick=()=>{
            downloadBlob(
                blob,
                "Barmaan-quality-photo.jpg"
            );
        };

        $("#qualityDelete").onclick=()=>{
            result.innerHTML="";
            status.innerHTML="";
        };
    }catch(e){
        status.innerHTML="";
        toast("Could not process photo.");
    }
}

function blobToImage(blob){
    return new Promise((resolve,reject)=>{
        const url=URL.createObjectURL(blob);
        const image=new Image();

        image.onload=()=>{
            image.srcUrl=url;
            resolve(image);
        };

        image.onerror=()=>{
            URL.revokeObjectURL(url);
            reject(new Error("image"));
        };

        image.src=url;
    });
}

async function changeImageQuality(image,mode){
    const maxSide=
        mode==="low"
        ?1280
        :Math.max(
            image.naturalWidth,
            image.naturalHeight
        );

    const ratio=Math.min(
        1,
        maxSide/
        Math.max(
            image.naturalWidth,
            image.naturalHeight
        )
    );

    const width=Math.max(
        1,
        Math.round(image.naturalWidth*ratio)
    );

    const height=Math.max(
        1,
        Math.round(image.naturalHeight*ratio)
    );

    const canvas=document.createElement("canvas");

    canvas.width=width;
    canvas.height=height;

    const ctx=canvas.getContext("2d");

    ctx.imageSmoothingEnabled=true;
    ctx.imageSmoothingQuality=
        mode==="high"
        ?"high"
        :"medium";

    ctx.drawImage(
        image,
        0,
        0,
        width,
        height
    );

    if(mode==="high"){
        sharpenCanvas(ctx,width,height);
    }

    const quality=
        mode==="high"
        ?.96
        :.55;

    return new Promise(resolve=>{
        canvas.toBlob(
            resolve,
            "image/jpeg",
            quality
        );
    });
}
function sharpenCanvas(ctx,width,height){
    if(width*height>3500000){
        return;
    }

    const image=ctx.getImageData(
        0,
        0,
        width,
        height
    );

    const source=new Uint8ClampedArray(
        image.data
    );

    const data=image.data;

    for(let y=1;y<height-1;y++){
        for(let x=1;x<width-1;x++){
            const i=(y*width+x)*4;

            for(let c=0;c<3;c++){
                const value=
                    source[i+c]*5-
                    source[i-4+c]-
                    source[i+4+c]-
                    source[i-width*4+c]-
                    source[i+width*4+c];

                data[i+c]=Math.max(
                    0,
                    Math.min(255,value)
                );
            }
        }
    }

    ctx.putImageData(image,0,0);
}

function renderSubjectTool(){
    const area=$("#photoArea");

    area.innerHTML=`
        <div class="card">
            <h3>Delete subjects</h3>

            <div class="row">
                <button
                    class="action ${
                        state.photo.subjectMode==="humans"
                        ?"primary"
                        :"secondary"
                    }"
                    id="humanMode">
                    Humans
                </button>

                <button
                    class="action ${
                        state.photo.subjectMode==="subjects"
                        ?"primary"
                        :"secondary"
                    }"
                    id="subjectMode">
                    Subjects
                </button>
            </div>

            <p class="muted">
                Upload photo, draw around the subject,
                then send it.
            </p>

            <label class="file-label">
                Upload photo
                <input
                    id="subjectUpload"
                    type="file"
                    accept="image/*">
            </label>

            <div id="drawingArea"></div>

            <button
                class="action primary"
                id="sendSubject">
                Send it
            </button>

            <div id="subjectStatus"></div>
            <div id="subjectResult"></div>
        </div>
    `;

    $("#humanMode").onclick=()=>{
        state.photo.subjectMode="humans";
        renderSubjectTool();
    };

    $("#subjectMode").onclick=()=>{
        state.photo.subjectMode="subjects";
        renderSubjectTool();
    };

    $("#subjectUpload").onchange=
        handleSubjectUpload;

    $("#sendSubject").onclick=
        processSubjectRemoval;
}

async function handleSubjectUpload(event){
    const file=event.target.files?.[0];

    if(!file)return;

    try{
        state.photo.subjectImage=
            await blobToImage(file);

        state.photo.drawPoints=[];

        renderDrawingCanvas();

        toast("Photo uploaded.");
    }catch(e){
        toast("Could not read photo.");
    }
}

function renderDrawingCanvas(){
    const area=$("#drawingArea");

    if(!area||!state.photo.subjectImage){
        return;
    }

    const image=state.photo.subjectImage;

    const wrap=document.createElement("div");
    wrap.className="draw-wrap";

    const canvas=document.createElement("canvas");

    canvas.width=image.naturalWidth;
    canvas.height=image.naturalHeight;

    wrap.appendChild(canvas);
    area.innerHTML="";
    area.appendChild(wrap);

    const ctx=canvas.getContext("2d");

    drawSubjectCanvas(canvas,ctx);

    canvas.addEventListener(
        "pointerdown",
        e=>{
            state.photo.drawing=true;
            state.photo.drawPoints=[];

            const point=
                canvasPoint(canvas,e);

            state.photo.drawPoints.push(point);

            canvas.setPointerCapture(e.pointerId);

            drawSubjectCanvas(canvas,ctx);
        }
    );

    canvas.addEventListener(
        "pointermove",
        e=>{
            if(!state.photo.drawing)return;

            const point=
                canvasPoint(canvas,e);

            state.photo.drawPoints.push(point);

            drawSubjectCanvas(canvas,ctx);
        }
    );

    const finish=e=>{
        if(!state.photo.drawing)return;

        state.photo.drawing=false;

        try{
            canvas.releasePointerCapture(
                e.pointerId
            );
        }catch(error){}

        drawSubjectCanvas(
            canvas,
            ctx,
            true
        );
    };

    canvas.addEventListener(
        "pointerup",
        finish
    );

    canvas.addEventListener(
        "pointercancel",
        finish
    );
}

function canvasPoint(canvas,event){
    const rect=
        canvas.getBoundingClientRect();

    return {
        x:
            (event.clientX-rect.left)*
            canvas.width/
            rect.width,

        y:
            (event.clientY-rect.top)*
            canvas.height/
            rect.height
    };
}

function drawSubjectCanvas(
    canvas,
    ctx,
    closed=false
){
    const image=state.photo.subjectImage;

    ctx.clearRect(
        0,
        0,
        canvas.width,
        canvas.height
    );

    ctx.drawImage(
        image,
        0,
        0,
        canvas.width,
        canvas.height
    );

    const points=state.photo.drawPoints;

    if(!points.length)return;

    ctx.beginPath();

    ctx.moveTo(
        points[0].x,
        points[0].y
    );

    for(let i=1;i<points.length;i++){
        ctx.lineTo(
            points[i].x,
            points[i].y
        );
    }

    if(closed){
        ctx.closePath();
    }

    ctx.lineWidth=Math.max(
        5,
        canvas.width/250
    );

    ctx.strokeStyle="#ffffff";
    ctx.stroke();
}

async function processSubjectRemoval(){
    const image=state.photo.subjectImage;
    const points=state.photo.drawPoints;

    if(!image){
        toast("Upload photo first.");
        return;
    }

    if(points.length<3){
        toast("Draw around the subject first.");
        return;
    }

    const status=$("#subjectStatus");
    const result=$("#subjectResult");

    status.innerHTML=`
        <div class="ai-status">
            Making......
        </div>
    `;

    result.innerHTML="";

    await wait(500);

    try{
        const blob=
            await removePolygonSubject(
                image,
                points
            );

        const url=
            URL.createObjectURL(blob);

        status.innerHTML=`
            <div class="ai-status">
                Your photo is ready
            </div>
        `;

        result.innerHTML=`
            <div class="generated-result">
                <img
                    class="photo-preview"
                    src="${url}">

                <div class="note-actions">
                    <button
                        id="subjectDownload">
                        Download photo
                    </button>

                    <button
                        class="danger"
                        id="subjectDelete">
                        Delete
                    </button>
                </div>
            </div>
        `;

        $("#subjectDownload").onclick=()=>{
            downloadBlob(
                blob,
                "Barmaan-subject-removed.jpg"
            );
        };

        $("#subjectDelete").onclick=()=>{
            URL.revokeObjectURL(url);
            result.innerHTML="";
            status.innerHTML="";
        };
    }catch(e){
        status.innerHTML="";
        toast(
            "Could not process the photo."
        );
    }
}

async function removePolygonSubject(
    image,
    points
){
    const width=image.naturalWidth;
    const height=image.naturalHeight;

    const canvas=
        document.createElement("canvas");

    canvas.width=width;
    canvas.height=height;

    const ctx=
        canvas.getContext(
            "2d",
            {willReadFrequently:true}
        );

    ctx.drawImage(
        image,
        0,
        0,
        width,
        height
    );

    const source=
        ctx.getImageData(
            0,
            0,
            width,
            height
        );

    const mask=
        new Uint8Array(
            width*height
        );

    const minX=Math.max(
        0,
        Math.floor(
            Math.min(
                ...points.map(p=>p.x)
            )
        )
    );

    const maxX=Math.min(
        width-1,
        Math.ceil(
            Math.max(
                ...points.map(p=>p.x)
            )
        )
    );

    const minY=Math.max(
        0,
        Math.floor(
            Math.min(
                ...points.map(p=>p.y)
            )
        )
    );

    const maxY=Math.min(
        height-1,
        Math.ceil(
            Math.max(
                ...points.map(p=>p.y)
            )
        )
    );

    for(let y=minY;y<=maxY;y++){
        for(let x=minX;x<=maxX;x++){
            if(
                pointInsidePolygon(
                    x,
                    y,
                    points
                )
            ){
                mask[y*width+x]=1;
            }
        }
    }

    const output=
        new Uint8ClampedArray(
            source.data
        );

    diffuseMask(
        output,
        source.data,
        mask,
        width,
        height,
        minX,
        maxX,
        minY,
        maxY
    );

    const result=
        new ImageData(
            output,
            width,
            height
        );

    ctx.putImageData(
        result,
        0,
        0
    );

    return new Promise(resolve=>{
        canvas.toBlob(
            resolve,
            "image/jpeg",
            .94
        );
    });
}
function pointInsidePolygon(x,y,points){
    let inside=false;

    for(
        let i=0,j=points.length-1;
        i<points.length;
        j=i++
    ){
        const xi=points[i].x;
        const yi=points[i].y;
        const xj=points[j].x;
        const yj=points[j].y;

        const intersect=
            ((yi>y)!==(yj>y)) &&
            (
                x<
                (xj-xi)*
                (y-yi)/
                (yj-yi)+
                xi
            );

        if(intersect){
            inside=!inside;
        }
    }

    return inside;
}

function diffuseMask(
    output,
    source,
    mask,
    width,
    height,
    minX,
    maxX,
    minY,
    maxY
){
    const copy=
        new Uint8ClampedArray(
            source
        );

    const iterations=24;

    for(let pass=0;pass<iterations;pass++){
        for(let y=minY;y<=maxY;y++){
            for(let x=minX;x<=maxX;x++){
                const index=y*width+x;

                if(!mask[index]){
                    continue;
                }

                let r=0;
                let g=0;
                let b=0;
                let count=0;

                for(let dy=-2;dy<=2;dy++){
                    for(let dx=-2;dx<=2;dx++){
                        if(dx===0&&dy===0){
                            continue;
                        }

                        const nx=x+dx;
                        const ny=y+dy;

                        if(
                            nx<0||
                            ny<0||
                            nx>=width||
                            ny>=height
                        ){
                            continue;
                        }

                        const ni=ny*width+nx;

                        if(mask[ni]){
                            continue;
                        }

                        const p=ni*4;

                        r+=copy[p];
                        g+=copy[p+1];
                        b+=copy[p+2];

                        count++;
                    }
                }

                if(count){
                    const p=index*4;

                    output[p]=r/count;
                    output[p+1]=g/count;
                    output[p+2]=b/count;
                    output[p+3]=255;
                }
            }
        }

        copy.set(output);
    }
}
function renderCreatePhoto(){
    const area=$("#photoArea");

    area.innerHTML=`
        <div class="card">
            <h3>Create photo</h3>

            <label>
                Write your thing
            </label>

            <textarea
                id="createPrompt"
                class="text-input"
                placeholder="Write your thing..."></textarea>

            <button
                class="action primary"
                id="createPhotoSend">
                Send
            </button>

            <div id="createStatus"></div>
            <div id="createResult"></div>
        </div>
    `;

    $("#createPhotoSend").onclick=
        processCreatePhoto;
}

async function processCreatePhoto(){
    const input=$("#createPrompt");
    const status=$("#createStatus");
    const result=$("#createResult");

    const text=input?.value.trim();

    if(!text){
        toast("Write your thing first.");
        return;
    }

    status.innerHTML=`
        <div class="ai-status">
            Making......
        </div>
    `;

    result.innerHTML="";

    await wait(900);

    try{
        const blob=
            await createLocalPhoto(text);

        const url=
            URL.createObjectURL(blob);

        status.innerHTML=`
            <div class="ai-status">
                Your photo is ready
            </div>
        `;

        result.innerHTML=`
            <div class="generated-result">
                <img
                    class="photo-preview"
                    src="${url}">

                <div class="note-actions">
                    <button
                        id="createDownload">
                        Download photo
                    </button>

                    <button
                        class="danger"
                        id="createDelete">
                        Delete
                    </button>
                </div>
            </div>
        `;

        $("#createDownload").onclick=()=>{
            downloadBlob(
                blob,
                "Barmaan-created-photo.jpg"
            );
        };

        $("#createDelete").onclick=()=>{
            URL.revokeObjectURL(url);
            result.innerHTML="";
            status.innerHTML="";
        };
    }catch(e){
        status.innerHTML="";
        toast("Could not create photo.");
    }
}

async function createLocalPhoto(text){
    const canvas=
        document.createElement("canvas");

    canvas.width=1200;
    canvas.height=800;

    const ctx=
        canvas.getContext("2d");

    const gradient=
        ctx.createLinearGradient(
            0,
            0,
            canvas.width,
            canvas.height
        );

    gradient.addColorStop(
        0,
        "#151515"
    );

    gradient.addColorStop(
        .5,
        "#353535"
    );

    gradient.addColorStop(
        1,
        "#050505"
    );

    ctx.fillStyle=gradient;

    ctx.fillRect(
        0,
        0,
        canvas.width,
        canvas.height
    );

    ctx.beginPath();

    ctx.arc(
        930,
        150,
        180,
        0,
        Math.PI*2
    );

    ctx.globalAlpha=.18;
    ctx.fillStyle="#ffffff";
    ctx.fill();

    ctx.globalAlpha=1;

    ctx.textAlign="center";
    ctx.textBaseline="middle";

    ctx.fillStyle="#ffffff";
    ctx.font="bold 72px sans-serif";

    const words=text.split(/\s+/);
    const lines=[];
    let line="";

    for(const word of words){
        const test=
            line?
            line+" "+word:
            word;

        if(
            ctx.measureText(test).width>
            980
        ){
            if(line){
                lines.push(line);
            }

            line=word;
        }else{
            line=test;
        }
    }

    if(line){
        lines.push(line);
    }

    const maxLines=6;
    const visible=
        lines.slice(0,maxLines);

    const lineHeight=92;

    const startY=
        canvas.height/2-
        (visible.length-1)*
        lineHeight/2;

    visible.forEach(
        (line,index)=>{
            ctx.fillText(
                line,
                canvas.width/2,
                startY+
                index*lineHeight
            );
        }
    );

    ctx.font="28px sans-serif";
    ctx.globalAlpha=.65;

    ctx.fillText(
        "BARMAAN VEBs",
        canvas.width/2,
        720
    );

    ctx.globalAlpha=1;

    return new Promise(resolve=>{
        canvas.toBlob(
            resolve,
            "image/jpeg",
            .94
        );
    });
}
function wait(ms){
    return new Promise(resolve=>{
        setTimeout(resolve,ms);
    });
}

function blobToImage(blob){
    return new Promise((resolve,reject)=>{
        const url=
            URL.createObjectURL(blob);

        const image=
            new Image();

        image.onload=()=>{
            URL.revokeObjectURL(url);
            resolve(image);
        };

        image.onerror=()=>{
            URL.revokeObjectURL(url);
            reject(new Error("Image load failed"));
        };

        image.src=url;
    });
}

function getImageFromFile(file){
    return new Promise((resolve,reject)=>{
        const reader=
            new FileReader();

        reader.onload=()=>{
            const image=
                new Image();

            image.onload=()=>{
                resolve(image);
            };

            image.onerror=()=>{
                reject(
                    new Error("Invalid image")
                );
            };

            image.src=reader.result;
        };

        reader.onerror=()=>{
            reject(
                new Error("File read failed")
            );
        };

        reader.readAsDataURL(file);
    });
}

function resizeImage(
    image,
    maxWidth,
    maxHeight
){
    let width=image.naturalWidth;
    let height=image.naturalHeight;

    const scale=Math.min(
        1,
        maxWidth/width,
        maxHeight/height
    );

    width=Math.round(width*scale);
    height=Math.round(height*scale);

    const canvas=
        document.createElement("canvas");

    canvas.width=width;
    canvas.height=height;

    const ctx=
        canvas.getContext("2d");

    ctx.drawImage(
        image,
        0,
        0,
        width,
        height
    );

    return canvas;
}

function canvasToBlob(
    canvas,
    type="image/jpeg",
    quality=.94
){
    return new Promise(resolve=>{
        canvas.toBlob(
            blob=>{
                resolve(blob);
            },
            type,
            quality
        );
    });
}

function showPhotoTools(){
    const area=$("#photoArea");

    if(!area)return;

    area.innerHTML=`
        <div class="card">
            <h3>Photo AI</h3>

            <div class="photo-tools">
                <button
                    class="action primary"
                    id="qualityTool">
                    Quality
                </button>

                <button
                    class="action secondary"
                    id="deleteSubjectsTool">
                    Delete subjects
                </button>

                <button
                    class="action secondary"
                    id="createPhotoTool">
                    Create photo
                </button>
            </div>
        </div>
    `;

    $("#qualityTool").onclick=
        renderQualityTool;

    $("#deleteSubjectsTool").onclick=
        renderSubjectTool;

    $("#createPhotoTool").onclick=
        renderCreatePhoto;
}

function renderQualityTool(){
    const area=$("#photoArea");

    area.innerHTML=`
        <div class="card">
            <h3>Quality</h3>

            <div class="row">
                <button
                    class="action secondary"
                    id="lowQuality">
                    Change to low quality
                </button>

                <button
                    class="action secondary"
                    id="highQuality">
                    Change to high quality
                </button>
            </div>

            <p id="qualityUploadText">
                Upload your photo first
            </p>

            <label class="file-label">
                Upload your photo
                <input
                    id="qualityUpload"
                    type="file"
                    accept="image/*">
            </label>

            <div id="qualityPreview"></div>

            <button
                class="action primary"
                id="qualitySend">
                Send
            </button>

            <div id="qualityStatus"></div>
            <div id="qualityResult"></div>
        </div>
    `;

    $("#lowQuality").onclick=()=>{
        state.photo.qualityMode="low";
        toast("Low quality selected.");
    };

    $("#highQuality").onclick=()=>{
        state.photo.qualityMode="high";
        toast("High quality selected.");
    };

    $("#qualityUpload").onchange=
        handleQualityUpload;

    $("#qualitySend").onclick=
        processQuality;
}

async function handleQualityUpload(event){
    const file=event.target.files?.[0];

    if(!file)return;

    try{
        state.photo.qualityImage=
            await getImageFromFile(file);

        const preview=
            $("#qualityPreview");

        preview.innerHTML="";

        const image=
            document.createElement("img");

        image.className="photo-preview";
        image.src=
            URL.createObjectURL(file);

        preview.appendChild(image);

        toast("Photo uploaded.");
    }catch(e){
        toast("Could not read photo.");
    }
}

async function processQuality(){
    const image=
        state.photo.qualityImage;

    if(!image){
        toast("Upload your photo first.");
        return;
    }

    const status=$("#qualityStatus");
    const result=$("#qualityResult");

    status.innerHTML=`
        <div class="ai-status">
            Making......
        </div>
    `;

    result.innerHTML="";

    await wait(700);

    const low=
        state.photo.qualityMode==="low";

    const maxWidth=
        low?1280:2560;

    const maxHeight=
        low?1280:2560;

    const canvas=
        resizeImage(
            image,
            maxWidth,
            maxHeight
        );

    if(!low){
        sharpenCanvas(
            canvas.getContext("2d"),
            canvas.width,
            canvas.height
        );
    }

    const blob=
        await canvasToBlob(
            canvas,
            "image/jpeg",
            low?.55:.96
        );

    const url=
        URL.createObjectURL(blob);

    status.innerHTML=`
        <div class="ai-status">
            Your photo is ready
        </div>
    `;

    result.innerHTML=`
        <div class="generated-result">
            <img
                class="photo-preview"
                src="${url}">

            <div class="note-actions">
                <button id="qualityDownload">
                    Download photo
                </button>

                <button
                    class="danger"
                    id="qualityDelete">
                    Delete
                </button>
            </div>
        </div>
    `;

    $("#qualityDownload").onclick=()=>{
        downloadBlob(
            blob,
            low?
            "Barmaan-low-quality.jpg":
            "Barmaan-high-quality.jpg"
        );
    };

    $("#qualityDelete").onclick=()=>{
        URL.revokeObjectURL(url);
        result.innerHTML="";
        status.innerHTML="";
    };
}
function showPhotoTools(){
    const area=$("#photoArea");
    if(!area)return;

    area.innerHTML=`
        <div class="card">
            <h3>Photo AI</h3>
            <div class="photo-tools">
                <button class="action primary" id="qualityTool">Quality</button>
                <button class="action secondary" id="deleteSubjectsTool">Delete subjects</button>
                <button class="action secondary" id="createPhotoTool">Create photo</button>
            </div>
        </div>
    `;

    $("#qualityTool").onclick=renderQualityTool;
    $("#deleteSubjectsTool").onclick=renderSubjectTool;
    $("#createPhotoTool").onclick=renderCreatePhoto;
}

function renderQualityTool(){
    const area=$("#photoArea");
    if(!area)return;

    area.innerHTML=`
        <div class="card">
            <h3>Quality</h3>

            <div class="row">
                <button class="action secondary" id="lowQuality">
                    Change to low quality
                </button>

                <button class="action secondary" id="highQuality">
                    Change to high quality
                </button>
            </div>

            <p id="qualityUploadText">Upload your photo first</p>

            <label class="file-label">
                Upload your photo
                <input id="qualityUpload" type="file" accept="image/*">
            </label>

            <div id="qualityPreview"></div>

            <button class="action primary" id="qualitySend">
                Send
            </button>

            <div id="qualityStatus"></div>
            <div id="qualityResult"></div>
        </div>
    `;

    $("#lowQuality").onclick=()=>{
        state.photo.qualityMode="low";
        toast("Low quality selected.");
    };

    $("#highQuality").onclick=()=>{
        state.photo.qualityMode="high";
        toast("High quality selected.");
    };

    $("#qualityUpload").onchange=handleQualityUpload;
    $("#qualitySend").onclick=processQuality;
}

async function handleQualityUpload(event){
    const file=event.target.files?.[0];
    if(!file)return;

    try{
        state.photo.qualityImage=
            await getImageFromFile(file);

        const preview=$("#qualityPreview");

        preview.innerHTML="";

        const image=document.createElement("img");
        image.className="photo-preview";
        image.src=URL.createObjectURL(file);

        preview.appendChild(image);

        toast("Photo uploaded.");
    }catch(e){
        toast("Could not read photo.");
    }
}

async function processQuality(){
    const image=state.photo.qualityImage;

    if(!image){
        toast("Upload your photo first.");
        return;
    }

    const status=$("#qualityStatus");
    const result=$("#qualityResult");

    status.innerHTML=`
        <div class="ai-status">Making......</div>
    `;

    result.innerHTML="";

    await wait(700);

    const low=
        state.photo.qualityMode==="low";

    const canvas=resizeImage(
        image,
        low?1280:2560,
        low?1280:2560
    );

    if(!low){
        sharpenCanvas(
            canvas.getContext("2d"),
            canvas.width,
            canvas.height
        );
    }

    const blob=await canvasToBlob(
        canvas,
        "image/jpeg",
        low?.55:.96
    );

    const url=URL.createObjectURL(blob);

    status.innerHTML=`
        <div class="ai-status">
            Your photo is ready
        </div>
    `;

    result.innerHTML=`
        <div class="generated-result">
            <img class="photo-preview" src="${url}">

            <div class="note-actions">
                <button id="qualityDownload">
                    Download photo
                </button>

                <button class="danger" id="qualityDelete">
                    Delete
                </button>
            </div>
        </div>
    `;

    $("#qualityDownload").onclick=()=>{
        downloadBlob(
            blob,
            low?
            "Barmaan-low-quality.jpg":
            "Barmaan-high-quality.jpg"
        );
    };

    $("#qualityDelete").onclick=()=>{
        URL.revokeObjectURL(url);
        result.innerHTML="";
        status.innerHTML="";
    };
}

function renderCreatePhoto(){
    const area=$("#photoArea");
    if(!area)return;

    area.innerHTML=`
        <div class="card">
            <h3>Create photo</h3>

            <label>Write your thing</label>

            <textarea
                id="createPrompt"
                class="text-input"
                placeholder="Write your thing..."></textarea>

            <button
                class="action primary"
                id="createPhotoSend">
                Send
            </button>

            <div id="createStatus"></div>
            <div id="createResult"></div>
        </div>
    `;

    $("#createPhotoSend").onclick=processCreatePhoto;
}

async function processCreatePhoto(){
    const text=$("#createPrompt")?.value.trim();

    if(!text){
        toast("Write your thing first.");
        return;
    }

    const status=$("#createStatus");
    const result=$("#createResult");

    status.innerHTML=`
        <div class="ai-status">Making......</div>
    `;

    result.innerHTML="";

    await wait(900);

    const blob=await createLocalPhoto(text);
    const url=URL.createObjectURL(blob);

    status.innerHTML=`
        <div class="ai-status">
            Your photo is ready
        </div>
    `;

    result.innerHTML=`
        <div class="generated-result">
            <img class="photo-preview" src="${url}">

            <div class="note-actions">
                <button id="createDownload">
                    Download photo
                </button>

                <button class="danger" id="createDelete">
                    Delete
                </button>
            </div>
        </div>
    `;

    $("#createDownload").onclick=()=>{
        downloadBlob(
            blob,
            "Barmaan-created-photo.jpg"
        );
    };

    $("#createDelete").onclick=()=>{
        URL.revokeObjectURL(url);
        result.innerHTML="";
        status.innerHTML="";
    };
}

async function createLocalPhoto(text){
    const canvas=document.createElement("canvas");

    canvas.width=1200;
    canvas.height=800;

    const ctx=canvas.getContext("2d");

    const gradient=ctx.createLinearGradient(
        0,
        0,
        canvas.width,
        canvas.height
    );

    gradient.addColorStop(0,"#151515");
    gradient.addColorStop(.5,"#353535");
    gradient.addColorStop(1,"#050505");

    ctx.fillStyle=gradient;
    ctx.fillRect(
        0,
        0,
        canvas.width,
        canvas.height
    );

    ctx.globalAlpha=.18;
    ctx.beginPath();
    ctx.arc(
        930,
        150,
        180,
        0,
        Math.PI*2
    );
    ctx.fillStyle="#ffffff";
    ctx.fill();
    ctx.globalAlpha=1;

    ctx.textAlign="center";
    ctx.textBaseline="middle";
    ctx.fillStyle="#ffffff";
    ctx.font="bold 72px sans-serif";

    const words=text.split(/\s+/);
    const lines=[];
    let line="";

    for(const word of words){
        const test=line?
            line+" "+word:
            word;

        if(ctx.measureText(test).width>980){
            if(line)lines.push(line);
            line=word;
        }else{
            line=test;
        }
    }

    if(line)lines.push(line);

    const visible=lines.slice(0,6);
    const lineHeight=92;

    const startY=
        canvas.height/2-
        (visible.length-1)*
        lineHeight/2;

    visible.forEach((line,index)=>{
        ctx.fillText(
            line,
            canvas.width/2,
            startY+index*lineHeight
        );
    });

    ctx.font="28px sans-serif";
    ctx.globalAlpha=.65;

    ctx.fillText(
        "BARMAAN VEBs",
        canvas.width/2,
        720
    );

    ctx.globalAlpha=1;

    return canvasToBlob(
        canvas,
        "image/jpeg",
        .94
    );
}

function wait(ms){
    return new Promise(resolve=>{
        setTimeout(resolve,ms);
    });
}

function blobToImage(blob){
    return new Promise((resolve,reject)=>{
        const url=URL.createObjectURL(blob);
        const image=new Image();

        image.onload=()=>{
            URL.revokeObjectURL(url);
            resolve(image);
        };

        image.onerror=()=>{
            URL.revokeObjectURL(url);
            reject(
                new Error("Image load failed")
            );
        };

        image.src=url;
    });
}

function getImageFromFile(file){
    return new Promise((resolve,reject)=>{
        const reader=new FileReader();

        reader.onload=()=>{
            const image=new Image();

            image.onload=()=>{
                resolve(image);
            };

            image.onerror=()=>{
                reject(
                    new Error("Invalid image")
                );
            };

            image.src=reader.result;
        };

        reader.onerror=()=>{
            reject(
                new Error("File read failed")
            );
        };

        reader.readAsDataURL(file);
    });
}

function resizeImage(
    image,
    maxWidth,
    maxHeight
){
    let width=image.naturalWidth;
    let height=image.naturalHeight;

    const scale=Math.min(
        1,
        maxWidth/width,
        maxHeight/height
    );

    width=Math.round(width*scale);
    height=Math.round(height*scale);

    const canvas=document.createElement("canvas");

    canvas.width=width;
    canvas.height=height;

    const ctx=canvas.getContext("2d");

    ctx.drawImage(
        image,
        0,
        0,
        width,
        height
    );

    return canvas;
}

function canvasToBlob(
    canvas,
    type="image/jpeg",
    quality=.94
){
    return new Promise(resolve=>{
        canvas.toBlob(
            blob=>{
                resolve(blob);
            },
            type,
            quality
        );
    });
}

function showPhotoArea(){
    const area=$("#photoArea");

    if(!area)return;

    showPhotoTools();
}

function initPhotoAI(){
    state.photo=state.photo||{
        qualityMode:"high",
        qualityImage:null,
        subjectImage:null,
        subjectMode:"humans",
        drawPoints:[],
        drawing:false
    };

    showPhotoArea();
}

function cleanupPhotoURLs(){
    document
        .querySelectorAll(
            '#photoArea img[src^="blob:"]'
        )
        .forEach(img=>{
            try{
                URL.revokeObjectURL(img.src);
            }catch(e){}
        });
}

window.addEventListener(
    "beforeunload",
    cleanupPhotoURLs
);

if(document.readyState==="loading"){
    document.addEventListener(
        "DOMContentLoaded",
        ()=>{
            try{
                initPhotoAI();
            }catch(e){}
        }
    );
}else{
    try{
        initPhotoAI();
    }catch(e){}
}
function sharpenCanvas(ctx,width,height){
    const imageData=ctx.getImageData(0,0,width,height);
    const data=imageData.data;
    const copy=new Uint8ClampedArray(data);

    const index=(x,y)=>(y*width+x)*4;

    for(let y=1;y<height-1;y++){
        for(let x=1;x<width-1;x++){
            const i=index(x,y);

            for(let c=0;c<3;c++){
                const value=
                    copy[i+c]*5-
                    copy[index(x-1,y)+c]-
                    copy[index(x+1,y)+c]-
                    copy[index(x,y-1)+c]-
                    copy[index(x,y+1)+c];

                data[i+c]=Math.max(
                    0,
                    Math.min(255,value)
                );
            }
        }
    }

    ctx.putImageData(imageData,0,0);
}

function renderSubjectTool(){
    const area=$("#photoArea");

    area.innerHTML=`
        <div class="card">
            <h3>Delete subjects</h3>

            <div class="row">
                <button
                    class="action secondary"
                    id="humanMode">
                    Humans
                </button>

                <button
                    class="action primary"
                    id="subjectMode">
                    Subjects
                </button>
            </div>

            <label class="file-label">
                Upload photo
                <input
                    id="subjectUpload"
                    type="file"
                    accept="image/*">
            </label>

            <div id="subjectPreview"></div>

            <button
                class="action primary"
                id="subjectSend">
                Send it
            </button>

            <div id="subjectStatus"></div>
            <div id="subjectResult"></div>
        </div>
    `;

    $("#humanMode").onclick=()=>{
        state.photo.subjectMode="humans";
        toast("Humans mode selected.");
    };

    $("#subjectMode").onclick=()=>{
        state.photo.subjectMode="subjects";
        toast("Subjects mode selected.");
    };

    $("#subjectUpload").onchange=handleSubjectUpload;
    $("#subjectSend").onclick=processSubjectRemoval;
}

function handleSubjectUpload(e){
    const file=e.target.files?.[0];
    if(!file)return;

    const reader=new FileReader();

    reader.onload=()=>{
        const img=new Image();

        img.onload=()=>{
            state.photo.subjectImage=img;
            state.photo.drawPoints=[];

            const preview=$("#subjectPreview");

            preview.innerHTML=`
                <canvas
                    id="subjectCanvas"
                    class="draw-canvas">
                </canvas>
                <p>Draw around the subject.</p>
            `;

            setupSubjectCanvas();
        };

        img.src=reader.result;
    };

    reader.readAsDataURL(file);
}

function setupSubjectCanvas(){
    const canvas=$("#subjectCanvas");
    const image=state.photo.subjectImage;

    if(!canvas||!image)return;

    const maxWidth=Math.min(
        900,
        image.naturalWidth
    );

    const ratio=
        maxWidth/image.naturalWidth;

    canvas.width=Math.round(
        image.naturalWidth*ratio
    );

    canvas.height=Math.round(
        image.naturalHeight*ratio
    );

    redrawSubjectCanvas();

    canvas.onpointerdown=e=>{
        state.photo.drawing=true;
        state.photo.drawPoints=[
            getCanvasPoint(canvas,e)
        ];
        redrawSubjectCanvas();
    };

    canvas.onpointermove=e=>{
        if(!state.photo.drawing)return;

        state.photo.drawPoints.push(
            getCanvasPoint(canvas,e)
        );

        redrawSubjectCanvas();
    };

    canvas.onpointerup=finishSubjectDrawing;
    canvas.onpointercancel=finishSubjectDrawing;
    canvas.onpointerleave=finishSubjectDrawing;
}

function getCanvasPoint(canvas,e){
    const rect=canvas.getBoundingClientRect();

    return{
        x:(e.clientX-rect.left)*
            canvas.width/rect.width,

        y:(e.clientY-rect.top)*
            canvas.height/rect.height
    };
}

function finishSubjectDrawing(){
    if(!state.photo.drawing)return;

    state.photo.drawing=false;
    redrawSubjectCanvas();
}

function redrawSubjectCanvas(){
    const canvas=$("#subjectCanvas");
    const image=state.photo.subjectImage;

    if(!canvas||!image)return;

    const ctx=canvas.getContext("2d");

    ctx.clearRect(
        0,
        0,
        canvas.width,
        canvas.height
    );

    ctx.drawImage(
        image,
        0,
        0,
        canvas.width,
        canvas.height
    );

    const points=state.photo.drawPoints;

    if(points.length<1)return;

    ctx.beginPath();

    ctx.moveTo(
        points[0].x,
        points[0].y
    );

    for(let i=1;i<points.length;i++){
        ctx.lineTo(
            points[i].x,
            points[i].y
        );
    }

    if(!state.photo.drawing&&points.length>2){
        ctx.closePath();
    }

    ctx.lineWidth=4;
    ctx.strokeStyle="#ff3030";
    ctx.fillStyle="rgba(255,48,48,.18)";

    if(points.length>2){
        ctx.fill();
    }

    ctx.stroke();
}

async function processSubjectRemoval(){
    const image=state.photo.subjectImage;
    const points=state.photo.drawPoints;

    if(!image){
        toast("Upload your photo first.");
        return;
    }

    if(points.length<3){
        toast("Draw around the subject first.");
        return;
    }

    const status=$("#subjectStatus");
    const result=$("#subjectResult");

    status.textContent="Making......";
    result.innerHTML="";

    await wait(700);

    try{
        const blob=
            await removePolygonSubject(
                image,
                points
            );

        const url=
            URL.createObjectURL(blob);

        status.textContent=
            "Your photo is ready";

        result.innerHTML=`
            <img
                class="photo-result"
                src="${url}"
                alt="Generated photo">

            <div class="row">
                <button
                    class="action secondary"
                    id="subjectDownload">
                    Download photo
                </button>

                <button
                    class="action danger"
                    id="subjectDelete">
                    Delete
                </button>
            </div>
        `;

        $("#subjectDownload").onclick=()=>{
            downloadBlob(
                blob,
                "barmaan-photo.jpg"
            );
        };

        $("#subjectDelete").onclick=()=>{
            result.innerHTML="";
            status.textContent="";
            URL.revokeObjectURL(url);
        };

    }catch(e){
        status.textContent="";
        toast("Could not process the photo.");
    }
}

async function removePolygonSubject(image,points){
    const scale=Math.min(
        1,
        1200/
        Math.max(
            image.naturalWidth,
            image.naturalHeight
        )
    );

    const width=Math.max(
        1,
        Math.round(image.naturalWidth*scale)
    );

    const height=Math.max(
        1,
        Math.round(image.naturalHeight*scale)
    );

    const canvas=document.createElement("canvas");
    canvas.width=width;
    canvas.height=height;

    const ctx=canvas.getContext("2d");
    ctx.drawImage(
        image,
        0,
        0,
        width,
        height
    );

    const source=
        ctx.getImageData(
            0,
            0,
            width,
            height
        );

    const mask=document.createElement("canvas");
    mask.width=width;
    mask.height=height;

    const mctx=mask.getContext("2d");

    const sx=
        width/
        $("#subjectCanvas").width;

    const sy=
        height/
        $("#subjectCanvas").height;

    mctx.beginPath();

    mctx.moveTo(
        points[0].x*sx,
        points[0].y*sy
    );

    for(let i=1;i<points.length;i++){
        mctx.lineTo(
            points[i].x*sx,
            points[i].y*sy
        );
    }

    mctx.closePath();
    mctx.fillStyle="#fff";
    mctx.fill();

    const maskData=
        mctx.getImageData(
            0,
            0,
            width,
            height
        ).data;

    const data=source.data;
    const original=
        new Uint8ClampedArray(data);

    const isMasked=(x,y)=>{
        return maskData[
            (y*width+x)*4+3
        ]>20;
    };

    for(let pass=0;pass<8;pass++){
        const next=
            new Uint8ClampedArray(data);

        for(let y=1;y<height-1;y++){
            for(let x=1;x<width-1;x++){
                if(!isMasked(x,y))continue;

                let r=0;
                let g=0;
                let b=0;
                let count=0;

                const radius=
                    3+pass*2;

                for(
                    let dy=-radius;
                    dy<=radius;
                    dy+=Math.max(1,
                        Math.floor(radius/3)
                    )
                ){
                    for(
                        let dx=-radius;
                        dx<=radius;
                        dx+=Math.max(1,
                            Math.floor(radius/3)
                        )
                    ){
                        const nx=x+dx;
                        const ny=y+dy;

                        if(
                            nx<0||
                            ny<0||
                            nx>=width||
                            ny>=height
                        )continue;

                        if(isMasked(nx,ny))continue;

                        const i=
                            (ny*width+nx)*4;

                        r+=data[i];
                        g+=data[i+1];
                        b+=data[i+2];

                        count++;
                    }
                }

                if(count){
                    const i=
                        (y*width+x)*4;

                    next[i]=r/count;
                    next[i+1]=g/count;
                    next[i+2]=b/count;
                    next[i+3]=original[i+3];
                }
            }
        }

        data.set(next);
    }

    ctx.putImageData(
        source,
        0,
        0
    );

    ctx.save();

    ctx.globalAlpha=.35;
    ctx.filter="blur(8px)";

    ctx.drawImage(
        canvas,
        0,
        0
    );

    ctx.restore();

    return new Promise(resolve=>{
        canvas.toBlob(
            resolve,
            "image/jpeg",
            .94
        );
    });
}

function renderCreatePhotoTool(){
    const area=$("#photoArea");

    area.innerHTML=`
        <div class="card">
            <h3>Create photo</h3>

            <textarea
                id="createPhotoText"
                placeholder="Write your thing">
            </textarea>

            <button
                class="action primary"
                id="createPhotoSend">
                Send
            </button>

            <div id="createPhotoStatus"></div>
            <div id="createPhotoResult"></div>
        </div>
    `;

    $("#createPhotoSend").onclick=
        processCreatePhoto;
}

async function processCreatePhoto(){
    const text=
        $("#createPhotoText").value.trim();

    if(!text){
        toast("Write your thing first.");
        return;
    }

    const status=$("#createPhotoStatus");
    const result=$("#createPhotoResult");

    status.textContent="Making......";
    result.innerHTML="";

    await wait(800);

    const blob=
        await createLocalPhoto(text);

    const url=
        URL.createObjectURL(blob);

    status.textContent=
        "Your photo is ready";

    result.innerHTML=`
        <img
            class="photo-result"
            src="${url}"
            alt="Generated photo">

        <div class="row">
            <button
                class="action secondary"
                id="createDownload">
                Download photo
            </button>

            <button
                class="action danger"
                id="createDelete">
                Delete
            </button>
        </div>
    `;

    $("#createDownload").onclick=()=>{
        downloadBlob(
            blob,
            "barmaan-created-photo.jpg"
        );
    };

    $("#createDelete").onclick=()=>{
        result.innerHTML="";
        status.textContent="";
        URL.revokeObjectURL(url);
    };
}

async function createLocalPhoto(text){
    const width=1080;
    const height=1350;

    const canvas=document.createElement("canvas");

    canvas.width=width;
    canvas.height=height;

    const ctx=canvas.getContext("2d");

    const gradient=
        ctx.createLinearGradient(
            0,
            0,
            width,
            height
        );

    gradient.addColorStop(0,"#161616");
    gradient.addColorStop(.5,"#3b3b3b");
    gradient.addColorStop(1,"#080808");

    ctx.fillStyle=gradient;
    ctx.fillRect(
        0,
        0,
        width,
        height
    );

    ctx.globalAlpha=.18;

    for(let i=0;i<12;i++){
        ctx.beginPath();

        ctx.arc(
            Math.random()*width,
            Math.random()*height,
            40+Math.random()*160,
            0,
            Math.PI*2
        );

        ctx.fillStyle=
            i%2
            ?"#ffffff"
            :"#999999";

        ctx.fill();
    }

    ctx.globalAlpha=1;

    ctx.fillStyle="#ffffff";
    ctx.font="bold 70px Arial";
    ctx.textAlign="center";

    ctx.fillText(
        "Barmaan Vebs",
        width/2,
        150
    );

    ctx.font="bold 48px Arial";

    const lines=
        wrapCanvasText(
            ctx,
            text,
            width-180,
            95
        );

    let y=
        height/2-
        (lines.length*95)/2;

    for(const line of lines){
        ctx.fillText(
            line,
            width/2,
            y
        );

        y+=95;
    }

    ctx.font="28px Arial";
    ctx.globalAlpha=.65;

    ctx.fillText(
        new Date().toLocaleDateString(),
        width/2,
        height-90
    );

    ctx.globalAlpha=1;

    return new Promise(resolve=>{
        canvas.toBlob(
            resolve,
            "image/jpeg",
            .94
        );
    });
}

function wrapCanvasText(
    ctx,
    text,
    maxWidth,
    lineHeight
){
    const words=text.split(/\s+/);
    const lines=[];
    let line="";

    for(const word of words){
        const test=
            line
            ?line+" "+word
            :word;

        if(
            ctx.measureText(test).width>
            maxWidth&&
            line
        ){
            lines.push(line);
            line=word;
        }else{
            line=test;
        }
    }

    if(line){
        lines.push(line);
    }

    return lines;
}

function ensureAlarmOverlay(){
    let overlay=$("#alarmOverlay");

    if(overlay)return overlay;

    overlay=document.createElement("div");
    overlay.id="alarmOverlay";
    overlay.className="alarm-overlay";

    document.body.appendChild(overlay);

    return overlay;
}

function showAlarmOverlay(alarm){
    const overlay=
        ensureAlarmOverlay();

    const finite=
        alarm.snoozeCount!=="Forever"&&
        alarm.snoozeCount!=="Snooze off";

    const limit=
        finite
        ?Number(alarm.snoozeCount)
        :Infinity;

    const canSnooze=
        alarm.snoozeCount!=="Snooze off"&&
        alarm.snoozeUsed<limit;

    overlay.innerHTML=`
        <div class="alarm-box">
            <h2>Alarm</h2>
            <div class="alarm-time">
                ${escapeHTML(alarm.time)}
            </div>

            ${
                alarm.label
                ?`<p>${escapeHTML(alarm.label)}</p>`
                :""
            }

            <div class="row">
                ${
                    canSnooze
                    ?`
                    <button
                        class="action secondary"
                        id="alarmSnooze">
                        Snooze
                    </button>
                    `
                    :""
                }

                <button
                    class="action danger"
                    id="alarmDismiss">
                    Dismiss
                </button>
            </div>
        </div>
    `;

    overlay.classList.add("show");

    $("#alarmDismiss").onclick=()=>{
        dismissAlarm(alarm.id);
    };

    $("#alarmSnooze")?.addEventListener(
        "click",
        ()=>{
            snoozeAlarm(alarm.id);
        }
    );
}

function hideAlarmOverlay(){
    const overlay=$("#alarmOverlay");

    if(overlay){
        overlay.classList.remove("show");
        overlay.innerHTML="";
    }
}

function triggerAlarm(alarm){
    alarm.ringing=true;

    showAlarmOverlay(alarm);

    notify(
        "Barmaan Vebs",
        alarm.label||
        `Alarm ${alarm.time}`
    );

    playNotificationSound();
    persist(KEYS.alarms,state.alarms);
}

function snoozeAlarm(id){
    const alarm=
        state.alarms.find(
            a=>a.id===id
        );

    if(!alarm)return;

    const count=
        alarm.snoozeCount;

    if(count==="Snooze off"){
        return;
    }

    if(count!=="Forever"){
        const limit=Number(count);

        if(
            Number(alarm.snoozeUsed||0)>=
            limit
        ){
            return;
        }

        alarm.snoozeUsed=
            Number(alarm.snoozeUsed||0)+1;
    }

    alarm.ringing=false;

    alarm.snoozeUntil=
        Date.now()+
        Number(alarm.snoozeInterval||5)*
        60000;

    hideAlarmOverlay();
    persist(KEYS.alarms,state.alarms);

    toast(
        `Snoozed for ${alarm.snoozeInterval||5} minutes.`
    );
}

function dismissAlarm(id){
    const alarm=
        state.alarms.find(
            a=>a.id===id
        );

    if(!alarm)return;

    alarm.ringing=false;
    alarm.snoozeUntil=0;
    alarm.snoozeUsed=0;

    hideAlarmOverlay();

    persist(
        KEYS.alarms,
        state.alarms
    );
}

function checkAlarms(){
    const now=new Date();

    const hhmm=
        String(now.getHours())
        .padStart(2,"0")+
        ":"+
        String(now.getMinutes())
        .padStart(2,"0");

    const day=
        now.getFullYear()+
        "-"+
        String(now.getMonth()+1)
            .padStart(2,"0")+
        "-"+
        String(now.getDate())
            .padStart(2,"0");

    let changed=false;

    for(const alarm of state.alarms){
        if(!alarm.enabled)continue;

        if(alarm.ringing)continue;

        if(
            alarm.snoozeUntil&&
            Date.now()>=alarm.snoozeUntil
        ){
            alarm.snoozeUntil=0;
            triggerAlarm(alarm);
            changed=true;
            continue;
        }

        if(
            alarm.time===hhmm&&
            alarm.firedKey!==day
        ){
            alarm.firedKey=day;
            alarm.snoozeUsed=0;
            triggerAlarm(alarm);
            changed=true;
        }
    }

    if(changed){
        persist(
            KEYS.alarms,
            state.alarms
        );
    }
}

function checkBedtime(){
    const bedtime=state.bedtime;

    if(!bedtime||!bedtime.enabled)return;

    const now=new Date();

    const current=
        now.getHours()*60+
        now.getMinutes();

    const target=
        Number(bedtime.hour)*60+
        Number(bedtime.minute);

    if(current===target){
        const key=
            now.toDateString();

        if(bedtime.lastTriggered!==key){
            bedtime.lastTriggered=key;

            notify(
                "Bedtime",
                "It's your bedtime."
            );

            playNotificationSound();

            persist(
                KEYS.bedtime,
                bedtime
            );
        }
    }
}

function checkTaskReminders(){
    const now=Date.now();

    let changed=false;

    for(const task of state.tasks){
        if(
            !task.reminder||
            task.reminderDone
        )continue;

        if(
            now>=Number(task.reminder)
        ){
            task.reminderDone=true;

            notify(
                "Task reminder",
                task.text
            );

            playNotificationSound();

            changed=true;
        }
    }

    if(changed){
        persist(
            KEYS.tasks,
            state.tasks
        );

        render();
    }
}

function updateClockDisplays(){
    const now=new Date();

    const time=
        now.toLocaleTimeString(
            [],
            {
                hour:"2-digit",
                minute:"2-digit",
                second:"2-digit"
            }
        );

    $$(".live-clock").forEach(
        el=>el.textContent=time
    );

    const date=
        now.toLocaleDateString(
            [],
            {
                year:"numeric",
                month:"long",
                day:"numeric"
            }
        );

    $$(".live-date").forEach(
        el=>el.textContent=date
    );
}

function updateStopwatch(){
    if(
        state.page!=="clock"||
        state.clockTab!=="stopwatch"
    )return;

    const el=$("#stopwatchDisplay");

    if(!el)return;

    let elapsed=
        state.stopwatch.elapsed;

    if(state.stopwatch.running){
        elapsed=
            Date.now()-
            state.stopwatch.started;
    }

    el.textContent=
        formatDuration(elapsed);
}

function updateTimer(){
    if(
        state.page!=="clock"||
        state.clockTab!=="timer"
    )return;

    const el=$("#timerDisplay");

    if(!el)return;

    let remaining=
        state.timer.duration-
        state.timer.elapsed;

    if(state.timer.running){
        remaining=
            state.timer.duration-
            (
                Date.now()-
                state.timer.started
            );

        if(remaining<=0){
            remaining=0;

            state.timer.running=false;
            state.timer.elapsed=
                state.timer.duration;

            persist(
                KEYS.settings,
                state.settings
            );

            notify(
                "Timer",
                "Timer finished."
            );

            playNotificationSound();
        }
    }

    el.textContent=
        formatDuration(remaining);
}

function schedulerTick(){
    updateClockDisplays();
    checkAlarms();
    checkBedtime();
    checkTaskReminders();
    updateStopwatch();
    updateTimer();
}

window.addEventListener(
    "beforeunload",
    ()=>{
        try{
            state.voice.stream?.getTracks()
                .forEach(t=>t.stop());
        }catch(e){}
    }
);

setInterval(
    schedulerTick,
    1000
);

setInterval(
    updateStopwatch,
    100
);

setInterval(
    updateTimer,
    250
);

try{
    render();
}catch(e){}

schedulerTick();
