"use strict";

const $=s=>document.querySelector(s);
const $$=s=>document.querySelectorAll(s);

const nav=$("#mainNav");
const app=$("#app");
const clock=$("#liveClock");
const toast=$("#toast");

let page="home";
let clockMode="alarm";

let timerRunning=false;
let timerValue=0;
let timerLast=0;

let swRunning=false;
let swStart=0;
let swTime=0;

let recorder=null;
let chunks=[];
let posts=[];

const K={
 notes:"bv_notes",
 trash:"bv_trash",
 tasks:"bv_tasks",
 money:"bv_money",
 apps:"bv_apps",
 alarms:"bv_alarms",
 voices:"bv_voices"
};

function get(k,d=[]){
 try{
  const x=localStorage.getItem(k);
  return x?JSON.parse(x):d;
 }catch(e){
  return d;
 }
}

function put(k,v){
 try{
  localStorage.setItem(k,JSON.stringify(v));
 }catch(e){
  msg("Storage error");
 }
}

function esc(s){
 return String(s??"").replace(/[&<>"']/g,x=>({
  "&":"&amp;",
  "<":"&lt;",
  ">":"&gt;",
  '"':"&quot;",
  "'":"&#39;"
 }[x]));
}

function msg(text){
 if(!toast)return;

 toast.textContent=text;
 toast.classList.add("show");

 clearTimeout(msg.t);

 msg.t=setTimeout(()=>{
  toast.classList.remove("show");
 },1800);
}

function css(){
 if($("#bvcss"))return;

 const s=document.createElement("style");

 s.id="bvcss";

 s.textContent=`
 *{box-sizing:border-box}
 body{
  margin:0;
  font-family:Arial,sans-serif;
  background:#101114;
  color:#fff
 }
 #app{
  padding:16px;
  max-width:850px;
  margin:auto
 }
 .card,.item{
  background:#191b20;
  border:1px solid #292c33;
  border-radius:15px;
  padding:15px;
  margin:10px 0
 }
 .grid{
  display:grid;
  grid-template-columns:repeat(auto-fit,minmax(150px,1fr));
  gap:9px
 }
 button,input,textarea,select{
  font:inherit;
  border:0;
  border-radius:11px;
  padding:11px
 }
 button{
  background:#292d35;
  color:#fff;
  cursor:pointer
 }
 button:active{
  transform:scale(.98)
 }
 .primary{
  background:#fff;
  color:#111
 }
 input,textarea,select{
  width:100%;
  background:#0c0d10;
  color:#fff;
  border:1px solid #333;
  margin:5px 0
 }
 textarea{
  min-height:110px;
  resize:vertical
 }
 .row{
  display:flex;
  gap:7px;
  flex-wrap:wrap
 }
 .row>*{
  flex:1
 }
 .navButton{
  margin:3px
 }
 .navButton.active{
  background:#fff;
  color:#111
 }
 .item small{
  display:block;
  color:#999;
  margin:5px 0
 }
 .dots{
  float:right
 }
 .menu{
  margin-top:8px
 }
 .menu button{
  display:block;
  width:100%;
  text-align:left;
  margin:3px 0
 }
 .display{
  padding:18px;
  background:#08090b;
  border-radius:12px;
  text-align:center;
  font-size:25px
 }
 .danger{
  background:#702222
 }
 .money{
  font-size:30px;
  font-weight:bold
 }
 canvas{
  max-width:100%;
  border:1px solid #444;
  border-radius:10px;
  touch-action:none
 }
 #toast{
  position:fixed;
  bottom:18px;
  left:50%;
  transform:translateX(-50%);
  background:#fff;
  color:#111;
  padding:11px 17px;
  border-radius:12px;
  opacity:0;
  transition:.2s;
  z-index:99;
  pointer-events:none
 }
 #toast.show{
  opacity:1
 }
 `;

 document.head.appendChild(s);
}

const pages=[
 ["home","Home 🏠"],
 ["clock","Clock"],
 ["notes","Note"],
 ["tasks","Tasks"],
 ["store","UI store"],
 ["earn","Earn"],
 ["apps","My apps"],
 ["voices","Voices"],
 ["photo","Photo AI | crazy AI"],
 ["calculator","Calculator"],
 ["converter","Converter"]
];

function navRender(){
 if(!nav)return;

 nav.innerHTML=pages.map(x=>
  `<button class="navButton ${page===x[0]?"active":""}" data-p="${x[0]}">${x[1]}</button>`
 ).join("");

 $$("[data-p]").forEach(b=>{
  b.onclick=()=>{
   page=b.dataset.p;
   render();
  };
 });
}

function home(){
 return `
 <div class="card">
  <h1>Barmaan Utility</h1>
  <p>Fast, simple and useful tools.</p>
 </div>

 <div class="grid">
  ${pages.slice(1).map(x=>
   `<button data-open="${x[0]}"><b>${x[1]}</b></button>`
  ).join("")}
 </div>`;
}

function clockPage(){
 return `
 <div class="card">
  <h1>Clock</h1>

  <div class="grid">
   <button data-clock="alarm">Alarm</button>
   <button data-clock="world">World Clock</button>
   <button data-clock="sw">Stopwatch</button>
   <button data-clock="timer">Timer</button>
  </div>
 </div>

 <div id="clockArea"></div>`;
}

function clockPart(type){
 if(type==="alarm")return alarmPart();
 if(type==="world")return worldPart();
 if(type==="sw")return stopwatchPart();
 return timerPart();
}

function alarmPart(){
 const alarms=get(K.alarms);

 return `
 <div class="card">
  <h2>Alarm</h2>

  <input id="alarmTime" type="time">

  <select id="alarmSnooze">
   <option value="0">Snooze off</option>
   <option value="1">1 minute</option>
   <option value="2">2 minutes</option>
   <option value="5">5 minutes</option>
   <option value="10">10 minutes</option>
   <option value="15">15 minutes</option>
   <option value="30">30 minutes</option>
   <option value="60">60 minutes</option>
  </select>

  <select id="alarmCount">
   <option value="forever">Forever</option>
   <option value="1">1 time</option>
   <option value="2">2 times</option>
   <option value="5">5 times</option>
   <option value="10">10 times</option>
   <option value="0">Snooze off</option>
  </select>

  <button id="addAlarm" class="primary">Add alarm</button>

  <div id="alarmList">
   ${
    alarms.map((x,i)=>`
     <div class="item">
      <button class="dots" data-delete-alarm="${i}">
       Delete
      </button>

      <b>${esc(x.time)}</b>

      <small>
       Snooze:
       ${x.snooze?x.snooze+" min":"off"}
       ·
       ${
        x.count==="forever"
        ?"Forever"
        :x.count+" time(s)"
       }
      </small>
     </div>
    `).join("")||"<p>No alarms.</p>"
   }
  </div>
 </div>`;
}

function worldPart(){
 return `
 <div class="card">
  <h2>World Clock</h2>

  <select id="worldZone">
   <option value="UTC">UTC</option>
   <option value="Europe/Amsterdam">Amsterdam</option>
   <option value="Europe/London">London</option>
   <option value="Europe/Paris">Paris</option>
   <option value="Asia/Tehran">Tehran</option>
   <option value="Asia/Tokyo">Tokyo</option>
   <option value="Asia/Bangkok">Bangkok</option>
   <option value="America/New_York">New York</option>
   <option value="America/Los_Angeles">Los Angeles</option>
  </select>

  <div id="worldDisplay" class="display">--:--:--</div>
 </div>`;
}

function stopwatchPart(){
 return `
 <div class="card">
  <h2>Stopwatch</h2>

  <div id="stopwatchDisplay" class="display">
   00:00:00.000
  </div>

  <div class="row">
   <button id="startStopwatch" class="primary">
    Start
   </button>

   <button id="stopStopwatch">
    Stop
   </button>

   <button id="resetStopwatch">
    Reset
   </button>
  </div>
 </div>`;
}

function timerPart(){
 return `
 <div class="card">
  <h2>Timer</h2>

  <input
   id="timerMin"
   type="number"
   min="0"
   placeholder="Minutes"
  >

  <input
   id="timerSec"
   type="number"
   min="0"
   max="59"
   placeholder="Seconds"
  >

  <div id="timerDisplay" class="display">
   00:00
  </div>

  <div class="row">
   <button id="startTimer" class="primary">
    Start
   </button>

   <button id="restartTimer">
    Restart
   </button>

   <button id="resetTimer">
    Reset
   </button>
  </div>
 </div>`;
}

function notes(){
 const n=get(K.notes);
 const d=get(K.trash);

 return `
 <div class="card">
  <h1>Note</h1>

  <input id="noteTitle" placeholder="Title">

  <textarea
   id="noteText"
   placeholder="Write your note"
  ></textarea>

  <button id="saveNote" class="primary">
   Save
  </button>
 </div>

 <div class="card">
  <h2>Notes</h2>

  ${
   n.map((x,i)=>`
    <div class="item">
     <button
      class="dots"
      data-note-menu="${i}">
      ...
     </button>

     <b>${esc(x.title||"Untitled")}</b>

     <small>${esc(x.text)}</small>

     <div id="noteMenu${i}"></div>
    </div>
   `).join("")||"<p>No notes.</p>"
  }
 </div>

 <div class="card">
  <h2>Recently Deleted</h2>

  ${
   d.map((x,i)=>`
    <div class="item">
     <button
      class="dots"
      data-trash-menu="${i}">
      ...
     </button>

     <b>${esc(x.title||"Untitled")}</b>

     <small>${esc(x.text)}</small>

     <div id="trashMenu${i}"></div>
    </div>
   `).join("")||"<p>Empty.</p>"
  }
 </div>`;
}

function tasks(){
 const t=get(K.tasks);

 return `
 <div class="card">
  <h1>Tasks</h1>

  <textarea
   id="taskInput"
   placeholder="One task per line"
  ></textarea>

  <button id="addTasks" class="primary">
   Add tasks
  </button>
 </div>

 <div class="card">
  ${
   t.map((x,i)=>`
    <div class="item">

     <input
      type="checkbox"
      data-task-check="${i}"
     >

     <span>${esc(x.text)}</span>

     <button
      class="dots"
      data-task-menu="${i}">
      ...
     </button>

     <div id="taskMenu${i}"></div>
    </div>
   `).join("")||"<p>No tasks.</p>"
  }
 </div>`;
}

function store(){
 return `
 <div class="card">
  <h1>UI store</h1>
  <p>Apps from posts.json</p>
 </div>

 <div id="store"></div>`;
}

async function loadPosts(){
 try{
  const r=await fetch(
   "posts.json",
   {cache:"no-store"}
  );

  if(!r.ok)throw new Error();

  const data=await r.json();

  posts=Array.isArray(data)?data:[];
 }catch(e){
  posts=[];
 }
}

function earn(){
 const money=Number(
  localStorage.getItem(K.money)||0
 );

 return `
 <div class="card">
  <h1>Earn</h1>

  <div class="money">
   ${money.toFixed(2)}¢
  </div>

  <button id="missions" class="primary">
   Missions
  </button>
 </div>

 <div id="questionArea"></div>`;
}

const qs=[
 ["ریاضی","آسان","12 + 8",
  ["20","18","22"],"20",20],

 ["ریاضی","متوسط","15 × 4",
  ["50","60","70"],"60",50],

 ["ریاضی","سخت","144 ÷ 12",
  ["10","12","14"],"12",100],

 ["علوم","آسان",
  "آب در چند درجه یخ می‌زند؟",
  ["0","50","100"],"0",20],

 ["علوم","متوسط",
  "سیاره سرخ کدام است؟",
  ["زهره","مریخ","مشتری"],"مریخ",50],

 ["جغرافیا","سخت",
  "پایتخت ژاپن کدام است؟",
  ["توکیو","سئول","پکن"],"توکیو",100]
];

function mission(){
 const area=$("#questionArea");

 if(!area)return;

 const q=qs[
  Math.floor(Math.random()*qs.length)
 ];

 area.innerHTML=`
 <div class="card">
  <small>
   ${esc(q[0])} ·
   ${esc(q[1])} ·
   ${q[5]}¢
  </small>

  <h3>${esc(q[2])}</h3>

  <div class="grid">
   ${q[3].map(x=>`
    <button data-answer="${esc(x)}">
     ${esc(x)}
    </button>
   `).join("")}
  </div>
 </div>`;

 area.querySelectorAll(
  "[data-answer]"
 ).forEach(b=>{
  b.onclick=()=>{
   if(b.dataset.answer===q[4]){
    const money=
     Number(localStorage.getItem(K.money)||0)
     +q[5];

    localStorage.setItem(
     K.money,
     String(money)
    );

    msg("Correct! +"+q[5]+"¢");
   }else{
    msg("Wrong. No money.");
   }

   render();
  };
 });
}

function apps(){
 const a=get(K.apps);

 return `
 <div class="card">
  <h1>My apps</h1>
 </div>

 ${
  a.map((x,i)=>`
   <div class="item">
    <b>${esc(x.name)}</b>

    <button data-open-app="${i}">
     Open
    </button>
   </div>
  `).join("")||`
   <div class="card">
    No installed apps.
   </div>
  `
 }`;
}

function voices(){
 const v=get(K.voices);

 return `
 <div class="card">
  <h1>Voices</h1>

  <button id="recordVoice" class="primary">
   🎙 Record
  </button>

  <button id="stopVoice">
   Stop
  </button>

  <p id="voiceStatus"></p>
 </div>

 ${
  v.map((x,i)=>`
   <div class="item">

    <button
     class="dots"
     data-voice-menu="${i}">
     ...
    </button>

    <b>${esc(x.name||"Voice")}</b>

    <div id="voiceMenu${i}"></div>
   </div>
  `).join("")||"<p>No voices.</p>"
 }`;
}

async function record(){
 try{
  if(!navigator.mediaDevices||
     !navigator.mediaDevices.getUserMedia){
   msg("Microphone is not supported");
   return;
  }

  const stream=
   await navigator.mediaDevices.getUserMedia({
    audio:true
   });

  const type=
   MediaRecorder.isTypeSupported(
    "audio/webm"
   )
   ?"audio/webm"
   :"audio/ogg";

  recorder=new MediaRecorder(
   stream,
   {mimeType:type}
  );

  chunks=[];

  recorder.ondataavailable=e=>{
   if(e.data&&e.data.size){
    chunks.push(e.data);
   }
  };

  recorder.onstop=()=>{
   stream.getTracks().forEach(
    x=>x.stop()
   );

   const blob=new Blob(
    chunks,
    {type:recorder.mimeType}
   );

   const reader=new FileReader();

   reader.onload=()=>{
    const v=get(K.voices);

    v.push({
     id:Date.now(),
     name:"Voice "+new Date().toLocaleString(),
     data:reader.result
    });

    put(K.voices,v);

    recorder=null;
    chunks=[];

    msg("Voice saved");
    render();
   };

   reader.readAsDataURL(blob);
  };

  recorder.start();

  const status=$("#voiceStatus");

  if(status){
   status.textContent="Recording...";
  }

  msg("Recording...");
 }catch(e){
  msg("Microphone permission required");
 }
}

function stopRec(){
 if(
  recorder &&
  recorder.state!=="inactive"
 ){
  recorder.stop();
  msg("Saving voice...");
 }
}

function photo(){
 return `
 <div class="card">
  <h1>Photo AI | crazy AI</h1>

  <div class="grid">
   <button data-photo-mode="quality">
    Quality
   </button>

   <button data-photo-mode="delete">
    Delete subjects
   </button>

   <button data-photo-mode="create">
    Create photo
   </button>
  </div>
 </div>

 <div id="photoArea"></div>`;
}

function photoPart(mode){
 if(mode==="quality"){
  return `
  <div class="card">
   <h2>Quality</h2>

   <input
    id="qualityFile"
    type="file"
    accept="image/*"
   >

   <div class="row">
    <button id="lowQuality">
     Low
    </button>

    <button id="highQuality">
     High
    </button>
   </div>

   <button id="qualitySend" class="primary">
    Send
   </button>

   <div id="qualityResult"></div>
  </div>`;
 }

 if(mode==="delete"){
  return `
  <div class="card">
   <h2>Delete subjects</h2>

   <div class="row">
    <button id="humanMode">
     Humans
    </button>

    <button id="subjectMode">
     Subjects
    </button>
   </div>

   <input
    id="deleteFile"
    type="file"
    accept="image/*"
   >

   <p>Draw around subject</p>

   <canvas id="drawCanvas"></canvas>

   <button id="deleteSend" class="primary">
    Send
   </button>

   <div id="deleteResult"></div>
  </div>`;
 }

 return `
 <div class="card">
  <h2>Create photo</h2>

  <textarea
   id="createPrompt"
   placeholder="Write here"
  ></textarea>

  <button id="createSend" class="primary">
   Send
  </button>

  <div id="createResult"></div>
 </div>`;
}

function loadPhoto(file,cb){
 if(!file)return;

 const reader=new FileReader();

 reader.onload=()=>{
  const img=new Image();

  img.onload=()=>{
   cb(img);
  };

  img.src=reader.result;
 };

 reader.readAsDataURL(file);
}

function calculator(){
 return `
 <div class="card">
  <h1>Calculator</h1>

  <input
   id="calcInput"
   type="text"
   inputmode="text"
   autocomplete="off"
   placeholder="Example: 12 * 8"
  >

  <button
   id="calculate"
   class="primary">
   Calculate
  </button>

  <div id="calcResult" class="display">
   Result
  </div>
 </div>`;
}

function converter(){
 return `
 <div class="card">
  <h1>Converter</h1>

  <input
   id="convertValue"
   type="text"
   inputmode="decimal"
   placeholder="Value"
  >

  <select id="convertType">
   <option value="km">
    KM → Miles
   </option>

   <option value="mi">
    Miles → KM
   </option>

   <option value="kg">
    KG → LB
   </option>

   <option value="lb">
    LB → KG
   </option>

   <option value="cf">
    °C → °F
   </option>

   <option value="fc">
    °F → °C
   </option>
  </select>

  <button
   id="convertButton"
   class="primary">
   Convert
  </button>

  <div
   id="convertResult"
   class="display">
  </div>
 </div>`;
}

function render(){
 if(!app)return;

 navRender();

 const map={
  home,
  clock:clockPage,
  notes,
  tasks,
  store,
  earn,
  apps,
  voices,
  photo,
  calculator,
  converter
 };

 app.innerHTML=
  (map[page]||home)();

 bind();

 if(page==="store"){
  bindStore();
 }
}

function bind(){
 $$("[data-open]").forEach(b=>{
  b.onclick=()=>{
   page=b.dataset.open;
   render();
  };
 });

 if(page==="clock")bindClock();
 if(page==="notes")bindNotes();
 if(page==="tasks")bindTasks();
 if(page==="store")bindStore();
 if(page==="earn")bindEarn();
 if(page==="apps")bindApps();
 if(page==="voices")bindVoices();
 if(page==="photo")bindPhoto();
 if(page==="calculator")bindCalculator();
 if(page==="converter")bindConverter();
}

function bindClock(){
 const tabs=$$("[data-clock]");

 tabs.forEach(b=>{
  b.onclick=()=>{
   clockMode=b.dataset.clock;

   const area=$("#clockArea");

   if(!area)return;

   area.innerHTML=
    clockPart(clockMode);

   bindClockPart(clockMode);
  };
 });

 const first=$("[data-clock]");

 if(first){
  const area=$("#clockArea");

  if(area&&!area.innerHTML){
   first.click();
  }
 }
}

function bindClockPart(type){
 if(type==="alarm"){
  bindAlarm();
  return;
 }

 if(type==="world"){
  updateWorldClock();

  const z=$("#worldZone");

  if(z){
   z.onchange=updateWorldClock;
  }

  return;
 }

 if(type==="sw"){
  const start=$("#startStopwatch");
  const stop=$("#stopStopwatch");
  const reset=$("#resetStopwatch");

  if(start)start.onclick=startStopwatch;
  if(stop)stop.onclick=stopStopwatch;
  if(reset)reset.onclick=resetStopwatch;

  updateStopwatch();
  return;
 }

 const start=$("#startTimer");
 const restart=$("#restartTimer");
 const reset=$("#resetTimer");

 if(start)start.onclick=startTimer;
 if(restart)restart.onclick=restartTimer;
 if(reset)reset.onclick=resetTimer;

 updateTimerDisplay();
}

function bindAlarm(){
 const add=$("#addAlarm");

 if(add){
  add.onclick=()=>{
   const time=$("#alarmTime")?.value;
   const snooze=Number(
    $("#alarmSnooze")?.value||0
   );
   const count=
    $("#alarmCount")?.value||"forever";

   if(!time){
    msg("Select a time");
    return;
   }

   const alarms=get(K.alarms);

   alarms.push({
    id:Date.now(),
    time,
    snooze,
    count,
    snoozes:0,
    enabled:true,
    last:"",
    snoozeUntil:0
   });

   put(K.alarms,alarms);

   render();

   msg("Alarm added");
  };
 }

 $$("[data-delete-alarm]").forEach(b=>{
  b.onclick=()=>{
   const i=Number(
    b.dataset.deleteAlarm
   );

   const alarms=get(K.alarms);

   alarms.splice(i,1);

   put(K.alarms,alarms);

   render();
  };
 });
}

function updateWorldClock(){
 const z=$("#worldZone");
 const d=$("#worldDisplay");

 if(!z||!d)return;

 try{
  d.textContent=new Intl.DateTimeFormat(
   undefined,
   {
    timeZone:z.value,
    dateStyle:"medium",
    timeStyle:"medium"
   }
  ).format(new Date());
 }catch(e){
  d.textContent="Invalid timezone";
 }
}

function bindNotes(){
 const save=$("#saveNote");

 if(save){
  save.onclick=()=>{
   const title=
    $("#noteTitle")?.value.trim()||"";

   const text=
    $("#noteText")?.value.trim()||"";

   if(!text){
    msg("Write something first");
    return;
   }

   const n=get(K.notes);

   n.push({
    id:Date.now(),
    title,
    text,
    date:new Date().toISOString()
   });

   put(K.notes,n);

   render();

   msg("Note saved");
  };
 }

 $$("[data-note-menu]").forEach(b=>{
  b.onclick=()=>{
   const i=Number(
    b.dataset.noteMenu
   );

   const box=$("#noteMenu"+i);

   if(!box)return;

   box.innerHTML=`
    <div class="menu">
     <button data-edit-note="${i}">
      Edit
     </button>

     <button data-download-note="${i}">
      Download document
     </button>

     <button
      data-delete-note="${i}"
      class="danger">
      Delete
     </button>
    </div>`;

   bindNoteActions();
  };
 });

 $$("[data-trash-menu]").forEach(b=>{
  b.onclick=()=>{
   const i=Number(
    b.dataset.trashMenu
   );

   const box=$("#trashMenu"+i);

   if(!box)return;

   box.innerHTML=`
    <div class="menu">
     <button data-restore-note="${i}">
      Restore
     </button>

     <button
      data-delete-forever="${i}"
      class="danger">
      Delete forever
     </button>
    </div>`;

   bindNoteActions();
  };
 });
}

function bindNoteActions(){
 $$("[data-edit-note]").forEach(b=>{
  b.onclick=()=>{
   const i=Number(
    b.dataset.editNote
   );
const n=get(K.notes);

if(!n[i])return;

const title=prompt(
  "Title",
  n[i].title||""
);

if(title===null)return;

const text=prompt(
  "Note",
  n[i].text||""
);

if(text===null)return;

n[i].title=title;
n[i].text=text;

put(K.notes,n);

render();
}

function deleteNote(i){
  const n=get(K.notes);
  if(!n[i])return;

  const deleted=get(K.deletedNotes)||[];
  deleted.push(n[i]);

  n.splice(i,1);

  put(K.notes,n);
  put(K.deletedNotes,deleted);

  render();
}

function downloadNote(i){
  const n=get(K.notes);

  if(!n[i])return;

  const note=n[i];

  const content=
    (note.title||"Untitled")+
    "\n\n"+
    (note.text||"");

  const blob=new Blob(
    [content],
    {type:"text/plain;charset=utf-8"}
  );

  const a=document.createElement("a");
  a.href=URL.createObjectURL(blob);
  a.download=(note.title||"note")+".txt";
  a.click();

  setTimeout(
    ()=>URL.revokeObjectURL(a.href),
    1000
  );
}

function restoreNote(i){
  const d=get(K.deletedNotes)||[];

  if(!d[i])return;

  const n=get(K.notes)||[];

  n.push(d[i]);
  d.splice(i,1);

  put(K.notes,n);
  put(K.deletedNotes,d);

  render();
}

function deleteNoteForever(i){
  const d=get(K.deletedNotes)||[];

  if(!d[i])return;

  d.splice(i,1);

  put(K.deletedNotes,d);

  render();
}

function bindNotes(){
  const save=$("#saveNote");

  if(save){
    save.onclick=()=>{
      const title=$("#noteTitle").value.trim();
      const text=$("#noteText").value.trim();

      if(!title&&!text){
        notify("Write something first");
        return;
      }

      const n=get(K.notes)||[];

      n.push({
        id:Date.now(),
        title:title||"Untitled",
        text:text
      });

      put(K.notes,n);

      $("#noteTitle").value="";
      $("#noteText").value="";

      render();
    };
  }

  $$("[data-note-edit]").forEach(b=>{
    b.onclick=()=>{
      editNote(Number(b.dataset.noteEdit));
    };
  });

  $$("[data-note-download]").forEach(b=>{
    b.onclick=()=>{
      downloadNote(Number(b.dataset.noteDownload));
    };
  });

  $$("[data-note-delete]").forEach(b=>{
    b.onclick=()=>{
      deleteNote(Number(b.dataset.noteDelete));
    };
  });

  $$("[data-deleted-restore]").forEach(b=>{
    b.onclick=()=>{
      restoreNote(Number(b.dataset.deletedRestore));
    };
  });

  $$("[data-deleted-delete]").forEach(b=>{
    b.onclick=()=>{
      deleteNoteForever(Number(b.dataset.deletedDelete));
    };
  });
}


/* =========================
   TASKS
========================= */

function tasks(){
  const t=get(K.tasks)||[];

  return `
    <section class="card">
      <h2>Tasks</h2>

      <textarea
        id="taskInput"
        placeholder="Write one task per line..."
      ></textarea>

      <button id="taskAdd">
        Add Tasks
      </button>
    </section>

    <section class="card">
      ${
        t.length
        ? t.map((x,i)=>`
          <div class="listRow">
            <input
              type="checkbox"
              data-task-check="${i}"
              ${x.done?"checked":""}
            >

            <span class="${x.done?"done":""}">
              ${esc(x.text)}
            </span>

            <button data-task-remind="${i}">
              ...
            </button>
          </div>

          ${
            x.reminder
            ? `<small>
                Reminder:
                ${new Date(x.reminder).toLocaleString()}
              </small>`
            :""
          }
        `).join("")
        : "<p>No tasks yet.</p>"
      }
    </section>
  `;
}

function bindTasks(){
  const add=$("#taskAdd");

  if(add){
    add.onclick=()=>{
      const input=$("#taskInput");

      const lines=input.value
        .split("\n")
        .map(x=>x.trim())
        .filter(Boolean);

      if(!lines.length)return;

      const t=get(K.tasks)||[];

      lines.forEach(text=>{
        t.push({
          id:Date.now()+Math.random(),
          text,
          done:false,
          reminder:null,
          reminded:false
        });
      });

      put(K.tasks,t);

      input.value="";

      render();
    };
  }

  $$("[data-task-check]").forEach(b=>{
    b.onchange=()=>{
      const i=Number(b.dataset.taskCheck);
      const t=get(K.tasks)||[];

      if(!t[i])return;

      if(b.checked){
        t.splice(i,1);
      }else{
        t[i].done=false;
      }

      put(K.tasks,t);
      render();
    };
  });

  $$("[data-task-remind]").forEach(b=>{
    b.onclick=()=>{
      const i=Number(b.dataset.taskRemind);
      const t=get(K.tasks)||[];

      if(!t[i])return;

      const value=prompt(
        "Enter Gregorian date and time.\nExample: 2026-09-27 18:30"
      );

      if(!value)return;

      const date=new Date(
        value.replace(" ","T")
      );

      if(isNaN(date.getTime())){
        notify("Invalid date");
        return;
      }

      t[i].reminder=date.getTime();
      t[i].reminded=false;

      put(K.tasks,t);

      notify("Reminder saved");
      render();
    };
  });
}


/* =========================
   STORE
========================= */

function store(){
  return `
    <section class="card">
      <h2>Barmaan Vebs Store</h2>

      ${
        posts.length
        ? posts.map((p,i)=>`
          <div class="storeItem">
            <h3>${esc(p.name||"Unnamed")}</h3>

            <p>
              ${esc(p.description||"No description")}
            </p>

            <b>
              ${
                Number(p.price||0)===0
                ?"Free"
                :Number(p.price).toFixed(2)+"¢"
              }
            </b>

            <br>

            <button data-install="${i}">
              Install
            </button>
          </div>
        `).join("")
        : "<p>No apps available.</p>"
      }
    </section>
  `;
}

function bindStore(){
  $$("[data-install]").forEach(b=>{
    b.onclick=()=>{
      const i=Number(b.dataset.install);
      const p=posts[i];

      if(!p)return;

      const apps=get(K.apps)||[];

      if(!apps.some(x=>x.url===p.url)){
        apps.push({
          id:Date.now(),
          name:p.name||"Unnamed",
          url:p.url||"",
          type:"PWA"
        });

        put(K.apps,apps);
      }

      if(p.url){
        window.open(p.url,"_blank");
      }else{
        notify("Saved to My Apps");
      }
    };
  });
}


/* =========================
   EARN
========================= */

const questions=[
  {
    q:"5 + 7 = ?",
    a:["10","12","14"],
    c:1,
    r:20
  },
  {
    q:"9 × 3 = ?",
    a:["27","21","24"],
    c:0,
    r:20
  },
  {
    q:"20 − 8 = ?",
    a:["10","12","14"],
    c:1,
    r:20
  },
  {
    q:"50 ÷ 5 = ?",
    a:["5","10","15"],
    c:1,
    r:50
  },
  {
    q:"12 × 4 = ?",
    a:["48","42","46"],
    c:0,
    r:50
  },
  {
    q:"100 − 37 = ?",
    a:["63","67","73"],
    c:0,
    r:100
  }
];

function earn(){
  const balance=Number(
    localStorage.getItem("barmaan_balance")||0
  );

  return `
    <section class="card">
      <h2>Earn</h2>

      <div class="balance">
        ${balance.toFixed(2)}¢
      </div>

      <button id="missions">
        Missions
      </button>

      <div id="missionArea"></div>
    </section>
  `;
}

function showMission(){
  const q=
    questions[
      Math.floor(Math.random()*questions.length)
    ];

  const area=$("#missionArea");

  if(!area)return;

  area.innerHTML=`
    <div class="mission">
      <h3>${esc(q.q)}</h3>

      ${
        q.a.map((a,i)=>`
          <button
            data-answer="${i}"
            data-correct="${q.c}"
            data-reward="${q.r}"
          >
            ${esc(a)}
          </button>
        `).join("")
      }
    </div>
  `;

  $$("[data-answer]").forEach(b=>{
    b.onclick=()=>{
      const answer=Number(b.dataset.answer);
      const correct=Number(b.dataset.correct);
      const reward=Number(b.dataset.reward);

      if(answer===correct){
        const balance=Number(
          localStorage.getItem("barmaan_balance")||0
        );

        localStorage.setItem(
          "barmaan_balance",
          balance+reward
        );

        notify("Correct! +"+reward.toFixed(2)+"¢");
      }else{
        notify("Wrong answer");
      }

      render();
    };
  });
}

function bindEarn(){
  const m=$("#missions");

  if(m){
    m.onclick=showMission;
  }
}


/* =========================
   MY APPS
========================= */

function apps(){
  const a=get(K.apps)||[];

  return `
    <section class="card">
      <h2>My Apps</h2>

      ${
        a.length
        ? a.map((x,i)=>`
          <div class="listRow">
            <span>${esc(x.name)}</span>

            <button data-open-app="${i}">
              Open
            </button>
          </div>
        `).join("")
        : "<p>No saved apps.</p>"
      }
    </section>
  `;
}

function bindApps(){
  $$("[data-open-app]").forEach(b=>{
    b.onclick=()=>{
      const i=Number(b.dataset.openApp);
      const a=get(K.apps)||[];

      if(!a[i])return;

      if(a[i].url){
        window.open(a[i].url,"_blank");
      }else{
        notify("This app has no URL");
      }
    };
  });
}


/* =========================
   VOICES
========================= */

function voices(){
  const v=get(K.voices)||[];

  return `
    <section class="card">
      <h2>Voices</h2>

      <button id="voiceRecord">
        Record
      </button>

      <button id="voiceStop" disabled>
        Stop
      </button>
    </section>

    <section class="card">
      ${
        v.length
        ? v.map((x,i)=>`
          <div class="listRow">
            <span>${esc(x.name)}</span>

            <button data-voice-play="${i}">
              Play
            </button>

            <button data-voice-edit="${i}">
              ...
            </button>
          </div>
        `).join("")
        : "<p>No recordings.</p>"
      }
    </section>
  `;
}

function bindVoices(){
  const record=$("#voiceRecord");
  const stop=$("#voiceStop");

  if(record){
    record.onclick=async()=>{
      try{
        const stream=
          await navigator.mediaDevices.getUserMedia({
            audio:true
          });

        recorder=new MediaRecorder(stream);
        voiceChunks=[];

        recorder.ondataavailable=e=>{
          if(e.data.size){
            voiceChunks.push(e.data);
          }
        };

        recorder.onstop=()=>{
          const blob=new Blob(
            voiceChunks,
            {
              type:recorder.mimeType||"audio/webm"
            }
          );

          const reader=new FileReader();

          reader.onload=()=>{
            const v=get(K.voices)||[];

            v.push({
              id:Date.now(),
              name:"Voice "+new Date().toLocaleString(),
              url:reader.result,
              start:0,
              end:null
            });

            put(K.voices,v);

            stream
              .getTracks()
              .forEach(track=>track.stop());

            render();
          };

          reader.readAsDataURL(blob);
        };

        recorder.start();

        record.disabled=true;

        if(stop){
          stop.disabled=false;
        }

      }catch(e){
        notify("Microphone permission required");
      }
    };
  }

  if(stop){
    stop.onclick=()=>{
      if(!recorder)return;

      recorder.stop();

      recorder=null;

      stop.disabled=true;
    };
  }

  $$("[data-voice-play]").forEach(b=>{
    b.onclick=()=>{
      const i=Number(b.dataset.voicePlay);
      playVoice(i);
    };
  });

  $$("[data-voice-edit]").forEach(b=>{
    b.onclick=()=>{
      editVoice(i=Number(b.dataset.voiceEdit));
    };
  });
}

let currentAudio=null;

function playVoice(i){
  const v=get(K.voices)||[];

  if(!v[i])return;

  if(currentAudio){
    currentAudio.pause();
    currentAudio=null;
  }

  const x=v[i];

  const audio=new Audio(x.url);

  currentAudio=audio;

  const start=Math.max(
    0,
    Number(x.start||0)
  );

  const end=
    x.end===null||x.end===undefined
    ?Infinity
    :Number(x.end);

  audio.currentTime=start;

  audio.ontimeupdate=()=>{
    if(audio.currentTime>=end){
      audio.pause();
      audio.currentTime=start;
    }
  };

  audio.play().catch(()=>{
    notify("Could not play recording");
  });
}

function editVoice(i){
  const v=get(K.voices)||[];

  if(!v[i])return;

  const currentStart=Number(v[i].start||0);

  const start=prompt(
    "Trim start (seconds)",
    currentStart
  );

  if(start===null)return;

  const currentEnd=
    v[i].end===null
    ? ""
    :v[i].end;

  const end=prompt(
    "Trim end (seconds). Leave empty for full end.",
    currentEnd
  );

  if(end===null)return;

  const s=Number(start);

  const e=
    end.trim()===""
    ?null
    :Number(end);

  if(
    !Number.isFinite(s)||
    s<0||
    (e!==null&&(!Number.isFinite(e)||e<=s))
  ){
    notify("Invalid trim range");
    return;
  }

  v[i].start=s;
  v[i].end=e;

  put(K.voices,v);

  notify("Trim saved");
  render();
}

function deleteVoice(i){
  const v=get(K.voices)||[];

  if(!v[i])return;

  v.splice(i,1);

  put(K.voices,v);

  render();
}


/* =========================
   PHOTO
========================= */

function photo(){
  return `
    <section class="card">
      <h2>Photo AI</h2>

      <div class="photoModes">
        <button data-photo-mode="quality">
          Quality
        </button>

        <button data-photo-mode="delete">
          Delete Subjects
        </button>

        <button data-photo-mode="create">
          Create Photo
        </button>
      </div>

      <div id="photoArea">
        <p>Select a mode.</p>
      </div>
    </section>
  `;
}

function bindPhoto(){
  $$("[data-photo-mode]").forEach(b=>{
    b.onclick=()=>{
      const mode=b.dataset.photoMode;

      const area=$("#photoArea");

      if(!area)return;

      if(mode==="quality"){
        area.innerHTML=`
          <h3>Improve Quality</h3>

          <input
            id="qualityFile"
            type="file"
            accept="image/*"
          >

          <select id="qualityLevel">
            <option value="low">Low</option>
            <option value="high">High</option>
          </select>

          <button id="qualitySend">
            Send
          </button>

          <div id="qualityResult"></div>
        `;

        $("#qualitySend").onclick=qualityProcess;
      }

      if(mode==="delete"){
        area.innerHTML=`
          <h3>Delete Subjects</h3>

          <select id="deleteType">
            <option>Humans</option>
            <option>Subjects</option>
          </select>

          <input
            id="deleteFile"
            type="file"
            accept="image/*"
          >

          <button id="deleteSend">
            Send
          </button>

          <div id="deleteResult"></div>
        `;

        $("#deleteSend").onclick=deleteSubjectProcess;
      }

      if(mode==="create"){
        area.innerHTML=`
          <h3>Create Photo</h3>

          <textarea
            id="createPrompt"
            placeholder="Describe the photo..."
          ></textarea>

          <button id="createSend">
            Send
          </button>

          <div id="createResult"></div>
        `;

        $("#createSend").onclick=createPhotoProcess;
      }
    };
  });
}

function qualityProcess(){
  const file=$("#qualityFile").files[0];

  if(!file){
    notify("Choose an image first");
    return;
  }

  const result=$("#qualityResult");

  result.innerHTML="<p>Making...</p>";

  const reader=new FileReader();

  reader.onload=()=>{
    setTimeout(()=>{
      result.innerHTML=`
        <p>Ready</p>

        <img
          src="${reader.result}"
          style="max-width:100%;border-radius:12px"
        >

        <br>

        <a
          href="${reader.result}"
          download="barmaan-quality.png"
        >
          Download
        </a>

        <button id="qualityDelete">
          Delete
        </button>
      `;

      $("#qualityDelete").onclick=()=>{
        result.innerHTML="";
      };
    },700);
  };

  reader.readAsDataURL(file);
}

function deleteSubjectProcess(){
  const file=$("#deleteFile").files[0];

  if(!file){
    notify("Choose an image first");
    return;
  }

  const result=$("#deleteResult");

  result.innerHTML="<p>Making...</p>";

  const reader=new FileReader();

  reader.onload=()=>{
    setTimeout(()=>{
      const img=new Image();

      img.onload=()=>{
        const canvas=document.createElement("canvas");

        canvas.width=img.width;
        canvas.height=img.height;

        const ctx=canvas.getContext("2d");

        ctx.drawImage(img,0,0);

        ctx.fillStyle="rgba(255,255,255,.7)";

        ctx.fillRect(
          img.width*.25,
          img.height*.25,
          img.width*.5,
          img.height*.5
        );

        const out=canvas.toDataURL("image/png");

        result.innerHTML=`
          <p>Ready</p>

          <img
            src="${out}"
            style="max-width:100%;border-radius:12px"
          >

          <br>

          <a
            href="${out}"
            download="barmaan-delete-subject.png"
          >
            Download
          </a>
        `;
      };

      img.src=reader.result;
    },700);
  };

  reader.readAsDataURL(file);
}

function createPhotoProcess(){
  const promptText=$("#createPrompt").value.trim();

  if(!promptText){
    notify("Write a prompt first");
    return;
  }

  const result=$("#createResult");

  result.innerHTML="<p>Making...</p>";

  setTimeout(()=>{
    const canvas=document.createElement("canvas");

    canvas.width=1200;
    canvas.height=800;

    const ctx=canvas.getContext("2d");

    ctx.fillStyle="#111827";
    ctx.fillRect(
      0,
      0,
      canvas.width,
      canvas.height
    );

    ctx.fillStyle="#ffffff";

    ctx.font="42px Arial";

    ctx.textAlign="center";

    ctx.fillText(
      "Barmaan AI",
      canvas.width/2,
      330
    );

    ctx.font="24px Arial";

    const words=promptText.slice(0,80);

    ctx.fillText(
      words,
      canvas.width/2,
      390
    );

    const out=canvas.toDataURL("image/png");

    result.innerHTML=`
      <p>Ready</p>

      <img
        src="${out}"
        style="max-width:100%;border-radius:12px"
      >

      <br>

      <a
        href="${out}"
        download="barmaan-created-photo.png"
      >
        Download
      </a>
    `;
  },700);
}


/* =========================
   CALCULATOR
========================= */

function calculator(){
  return `
    <section class="card">
      <h2>Calculator</h2>

      <input
        id="calcInput"
        type="text"
        inputmode="text"
        placeholder="Example: 12*8+5"
      >

      <button id="calculate">
        Calculate
      </button>

      <div id="calcResult"></div>
    </section>
  `;
}

function bindCalculator(){
  const button=$("#calculate");

  if(!button)return;

  button.onclick=()=>{
    const input=$("#calcInput").value.trim();

    if(!input){
      notify("Enter a calculation");
      return;
    }

    if(!/^[0-9+\-*/().%\s]+$/.test(input)){
      $("#calcResult").textContent=
        "Only numbers and math operators are allowed.";
      return;
    }

    try{
      const result=Function(
        '"use strict";return ('+input+')'
      )();

      $("#calcResult").textContent=
        Number.isFinite(result)
        ?String(result)
        :"Invalid result";
    }catch(e){
      $("#calcResult").textContent=
        "Invalid calculation";
    }
  };
}


/* =========================
   CONVERTER
========================= */

function converter(){
  return `
    <section class="card">
      <h2>Converter</h2>

      <input
        id="convertValue"
        type="number"
        placeholder="Value"
      >

      <select id="convertType">
        <option value="km-mi">Kilometers → Miles</option>
        <option value="mi-km">Miles → Kilometers</option>
        <option value="kg-lb">Kilograms → Pounds</option>
        <option value="lb-kg">Pounds → Kilograms</option>
        <option value="c-f">Celsius → Fahrenheit</option>
        <option value="f-c">Fahrenheit → Celsius</option>
      </select>

      <button id="convertButton">
        Convert
      </button>

      <div id="convertResult"></div>
    </section>
  `;
}

function bindConverter(){
  const button=$("#convertButton");

  if(!button)return;

  button.onclick=()=>{
    const value=Number(
      $("#convertValue").value
    );

    const type=$("#convertType").value;

    if(!Number.isFinite(value)){
      notify("Enter a value");
      return;
    }

    let result=0;

    switch(type){
      case"km-mi":
        result=value*0.621371;
        break;

      case"mi-km":
        result=value*1.609344;
        break;

      case"kg-lb":
        result=value*2.2046226218;
        break;

      case"lb-kg":
        result=value*0.45359237;
        break;

      case"c-f":
        result=value*9/5+32;
        break;

      case"f-c":
        result=(value-32)*5/9;
        break;
    }

    $("#convertResult").textContent=
      result.toFixed(4);
  };
}


/* =========================
   NAVIGATION
========================= */

function navRender(){
  nav.innerHTML=pages.map(p=>`
    <button
      data-page="${p.id}"
      class="${page===p.id?"active":""}"
    >
      ${p.name}
    </button>
  `).join("");
}

function bindNav(){
  $$("[data-page]").forEach(button=>{
    button.onclick=()=>{
      page=button.dataset.page;
      render();
    };
  });
}


/* =========================
   RENDER
========================= */

const views={
  home,
  clock:clockPage,
  notes,
  tasks,
  store,
  earn,
  apps,
  voices,
  photo,
  calculator,
  converter
};

function render(){
  navRender();

  const view=views[page]||home;

  app.innerHTML=view();

  bindNav();
  bindHome();
  bindClock();
  bindNotes();
  bindTasks();
  bindStore();
  bindEarn();
  bindApps();
  bindVoices();
  bindPhoto();
  bindCalculator();
  bindConverter();
}


/* =========================
   CLOCK UPDATE
========================= */

function updateClock(){
  const now=new Date();

  if(clock){
    clock.textContent=
      now.toLocaleTimeString();
  }

  const world=$("#worldDisplay");

  if(world){
    world.textContent=
      new Date().toLocaleString(
        undefined,
        {
          timeZone:
            world.dataset.zone||"UTC"
        }
      );
  }

  updateStopwatch();
  updateTimer();
  checkAlarms();
  checkTaskReminders();
}


/* =========================
   TASK REMINDERS
========================= */

function checkTaskReminders(){
  const t=get(K.tasks)||[];

  let changed=false;

  t.forEach(task=>{
    if(
      task.reminder &&
      !task.reminded &&
      Date.now()>=Number(task.reminder)
    ){
      task.reminded=true;

      notify(
        "Task reminder: "+
        task.text
      );

      changed=true;
    }
  });

  if(changed){
    put(K.tasks,t);
  }
}


/* =========================
   LOAD STORE POSTS
========================= */

async function loadPosts(){
  try{
    const response=await fetch(
      "posts.json",
      {
        cache:"no-store"
      }
    );

    if(!response.ok){
      throw new Error(
        "posts.json error"
      );
    }

    const data=
      await response.json();

    posts=
      Array.isArray(data)
      ?data
      :(data.posts||[]);

  }catch(error){
    posts=[];
  }

  if(page==="store"){
    render();
  }
}


/* =========================
   INIT
========================= */

function init(){
  render();

  updateClock();

  loadPosts();
}

init();

setInterval(
  updateClock,
  1000
);
