"use strict";

const $=s=>document.querySelector(s);
const $$=s=>document.querySelectorAll(s);

const nav=$("#mainNav");
const app=$("#app");
const clock=$("#liveClock");
const toast=$("#toast");

let page="home";
let timer=null;
let timerValue=0;
let swFrame=null;
let swOn=false;
let swStart=0;
let swTime=0;
let recorder=null;
let chunks=[];
let photoImg=null;
let points=[];
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
 }catch{
  return d;
 }
}

function put(k,v){
 localStorage.setItem(k,JSON.stringify(v));
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
 msg.t=setTimeout(()=>toast.classList.remove("show"),1800);
}

function css(){
 if($("#bvcss"))return;

 const s=document.createElement("style");
 s.id="bvcss";
 s.textContent=`
 *{box-sizing:border-box}
 body{margin:0;font-family:Arial,sans-serif;background:#101114;color:#fff}
 #app{padding:16px;max-width:850px;margin:auto}
 .card,.item{background:#191b20;border:1px solid #292c33;border-radius:15px;padding:15px;margin:10px 0}
 .grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:9px}
 button,input,textarea,select{font:inherit;border:0;border-radius:11px;padding:11px}
 button{background:#292d35;color:#fff;cursor:pointer}
 button:active{transform:scale(.98)}
 .primary{background:#fff;color:#111}
 input,textarea,select{width:100%;background:#0c0d10;color:#fff;border:1px solid #333;margin:5px 0}
 textarea{min-height:110px;resize:vertical}
 .row{display:flex;gap:7px;flex-wrap:wrap}
 .row>*{flex:1}
 .navButton{margin:3px}
 .navButton.active{background:#fff;color:#111}
 .item small{display:block;color:#999;margin:5px 0}
 .dots{float:right}
 .menu{margin-top:8px}
 .menu button{display:block;width:100%;text-align:left;margin:3px 0}
 .display{padding:18px;background:#08090b;border-radius:12px;text-align:center;font-size:25px}
 .preview{max-width:100%;max-height:500px;border-radius:12px;margin:8px 0}
 .danger{background:#702222}
 .money{font-size:30px;font-weight:bold}
 canvas{max-width:100%;border:1px solid #444;border-radius:10px}
 #toast{position:fixed;bottom:18px;left:50%;transform:translateX(-50%);
 background:#fff;color:#111;padding:11px 17px;border-radius:12px;
 opacity:0;transition:.2s;z-index:99;pointer-events:none}
 #toast.show{opacity:1}
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
 ["photo","Photo AI|crazy AI"],
 ["calculator","Calculator"],
 ["converter","Converter"]
];

function navRender(){
 nav.innerHTML=pages.map(x=>
  `<button class="navButton ${page===x[0]?"active":""}" data-p="${x[0]}">${x[1]}</button>`
 ).join("");

 $$("[data-p]").forEach(b=>{
  b.onclick=()=>{
   page=b.dataset.p;
   renderNavAndPage();
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
 const alarms=get(K.alarms);

 if(type==="alarm"){
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

   ${alarms.map((x,i)=>`
    <div class="item">
     <button class="dots" data-delete-alarm="${i}">Delete</button>
     <b>${esc(x.time)}</b>
     <small>
      Snooze:
      ${x.snooze?x.snooze+" min":"off"}
      · ${x.count==="forever"?"Forever":x.count+" time(s)"}
     </small>
    </div>
   `).join("")||"<p>No alarms.</p>"}
  </div>`;
 }

 if(type==="world"){
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
   <div id="worldDisplay" class="display"></div>
  </div>`;
 }

 if(type==="sw"){
  return `
  <div class="card">
   <h2>Stopwatch</h2>
   <div id="stopwatchDisplay" class="display">00:00.000</div>
   <div class="row">
    <button id="startStopwatch" class="primary">Start</button>
    <button id="resetStopwatch">Reset</button>
   </div>
  </div>`;
 }

 return `
 <div class="card">
  <h2>Timer</h2>
  <input id="timerMin" type="number" min="0" placeholder="Minutes">
  <input id="timerSec" type="number" min="0" max="59" placeholder="Seconds">

  <div id="timerDisplay" class="display">00:00</div>

  <div class="row">
   <button id="startTimer" class="primary">Start</button>
   <button id="restartTimer">Restart</button>
   <button id="resetTimer">Reset</button>
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
  <textarea id="noteText" placeholder="Write your note"></textarea>
  <button id="saveNote" class="primary">Save</button>
 </div>

 <div class="card">
  <h2>Notes</h2>
  ${
   n.map((x,i)=>`
    <div class="item">
     <button class="dots" data-note-menu="${i}">...</button>
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
     <button class="dots" data-trash-menu="${i}">...</button>
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
  <textarea id="taskInput" placeholder="One task per line"></textarea>
  <button id="addTasks" class="primary">Add tasks</button>
 </div>

 <div class="card">
 ${
  t.map((x,i)=>`
   <div class="item">
    <input type="checkbox" data-task-check="${i}">
    <span>${esc(x.text)}</span>
    <button class="dots" data-task-menu="${i}">...</button>
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
  const r=await fetch("posts.json",{cache:"no-store"});
  if(!r.ok)throw new Error();
  const data=await r.json();
  posts=Array.isArray(data)?data:[];
 }catch{
  posts=[];
 }
}

function earn(){
 return `
 <div class="card">
  <h1>Earn</h1>
  <div class="money">
   ${Number(localStorage.getItem(K.money)||0).toFixed(2)}¢
  </div>
  <button id="missions" class="primary">Missions</button>
 </div>
 <div id="questionArea"></div>`;
}

const qs=[
 ["ریاضی","آسان","12 + 8",["20","18","22"],"20",20],
 ["ریاضی","متوسط","15 × 4",["50","60","70"],"60",50],
 ["ریاضی","سخت","144 ÷ 12",["10","12","14"],"12",100],
 ["علوم","آسان","آب در چند درجه یخ می‌زند؟",["0","50","100"],"0",20],
 ["علوم","متوسط","سیاره سرخ کدام است؟",["زهره","مریخ","مشتری"],"مریخ",50],
 ["جغرافیا","سخت","پایتخت ژاپن کدام است؟",["توکیو","سئول","پکن"],"توکیو",100]
];

function mission(){
 const area=$("#questionArea");
 if(!area)return;

 const q=qs[Math.floor(Math.random()*qs.length)];

 area.innerHTML=`
 <div class="card">
  <small>${q[0]} · ${q[1]} · ${q[5]}¢</small>
  <h3>${esc(q[2])}</h3>
  <div class="grid">
   ${q[3].map(x=>
    `<button data-answer="${esc(x)}">${esc(x)}</button>`
   ).join("")}
  </div>
 </div>`;

 area.querySelectorAll("[data-answer]").forEach(b=>{
  b.onclick=()=>{
   if(b.dataset.answer===q[4]){
    const money=Number(localStorage.getItem(K.money)||0)+q[5];
    localStorage.setItem(K.money,money);
    msg("Correct! +"+q[5]+"¢");
   }else{
    msg("Wrong. No money.");
   }
   render();
   setTimeout(mission,50);
  };
 });
}

function apps(){
 const a=get(K.apps);

 return `
 <div class="card"><h1>My apps</h1></div>

 ${
  a.map((x,i)=>`
   <div class="item">
    <b>${esc(x.name)}</b>
    <button data-open-app="${i}">Open</button>
   </div>
  `).join("")||`
   <div class="card">No installed apps.</div>
  `
 }`;
}

function voices(){
 const v=get(K.voices);

 return `
 <div class="card">
  <h1>Voices</h1>
  <button id="recordVoice" class="primary">🎙 Record</button>
  <button id="stopVoice">Stop</button>
  <p id="voiceStatus"></p>
 </div>

 ${
  v.map((x,i)=>`
   <div class="item">
    <button class="dots" data-voice-menu="${i}">...</button>
    <b>${esc(x.name)}</b>
    <div id="voiceMenu${i}"></div>
   </div>
  `).join("")
 }`;
}

async function record(){
 try{
  const stream=await navigator.mediaDevices.getUserMedia({audio:true});

  recorder=new MediaRecorder(stream);
  chunks=[];

  recorder.ondataavailable=e=>{
   if(e.data.size)chunks.push(e.data);
  };

  recorder.onstop=()=>{
   stream.getTracks().forEach(x=>x.stop());

   const blob=new Blob(chunks,{type:"audio/webm"});
   const url=URL.createObjectURL(blob);

   const v=get(K.voices);
   v.push({
    name:"Voice "+new Date().toLocaleString(),
    url
   });

   put(K.voices,v);

   msg("Voice saved");
   render();
  };

  recorder.start();

  const status=$("#voiceStatus");
  if(status)status.textContent="Recording...";
 }catch{
  msg("Microphone permission required");
 }
}

function stopRec(){
 if(recorder&&recorder.state!=="inactive"){
  recorder.stop();
 }
}

function photo(){
 return `
 <div class="card">
  <h1>Photo AI | crazy AI</h1>
  <div class="grid">
   <button data-photo-mode="quality">Quality</button>
   <button data-photo-mode="delete">Delete subjects</button>
   <button data-photo-mode="create">Create photo</button>
  </div>
 </div>

 <div id="photoArea"></div>`;
}

function photoPart(mode){
 if(mode==="quality"){
  return `
  <div class="card">
   <h2>Quality</h2>
   <input id="qualityFile" type="file" accept="image/*">

   <div class="row">
    <button id="lowQuality">Change to low quality</button>
    <button id="highQuality">Change to high quality</button>
   </div>

   <button id="qualitySend" class="primary">Send</button>
   <div id="qualityResult"></div>
  </div>`;
 }

 if(mode==="delete"){
  return `
  <div class="card">
   <h2>Delete subjects</h2>
   <button id="humanMode">Humans</button>
   <button id="subjectMode">Subjects</button>

   <input id="deleteFile" type="file" accept="image/*">

   <p>Draw around subject</p>
   <canvas id="drawCanvas"></canvas>

   <button id="deleteSend" class="primary">Send</button>
   <div id="deleteResult"></div>
  </div>`;
 }

 return `
 <div class="card">
  <h2>Create photo</h2>
  <textarea id="createPrompt" placeholder="Write here"></textarea>
  <button id="createSend" class="primary">Send</button>
  <div id="createResult"></div>
 </div>`;
}

function loadPhoto(file,cb){
 if(!file)return;

 const reader=new FileReader();

 reader.onload=()=>{
  const img=new Image();

  img.onload=()=>cb(img);
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
   placeholder="Example: 12 * 8 or 10+5"
  >

  <button id="calculate" class="primary">Calculate</button>

  <div id="calcResult" class="display">Result</div>
 </div>`;
}

function converter(){
 return `
 <div class="card">
  <h1>Converter</h1>

  <input id="convertValue" type="number">

  <select id="convertType">
   <option value="km">KM → Miles</option>
   <option value="mi">Miles → KM</option>
   <option value="kg">KG → LB</option>
   <option value="lb">LB → KG</option>
   <option value="cf">°C → °F</option>
   <option value="fc">°F → °C</option>
  </select>

  <button id="convertButton" class="primary">Convert</button>

  <div id="convertResult" class="display"></div>
 </div>`;
}

function render(){
 const pagesMap={
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

 if(!app)return;

 const fn=pagesMap[page]||home;
 app.innerHTML=fn();

 bind();
}

function bind(){
 $$("[data-open]").forEach(b=>{
  b.onclick=()=>{
   page=b.dataset.open;
   renderNavAndPage();
  };
 });

 if(page==="clock"){
  $$("[data-clock]").forEach(b=>{
   b.onclick=()=>{
    const area=$("#clockArea");
    area.innerHTML=clockPart(b.dataset.clock);
    clockBind(b.dataset.clock);
   };
  });

  const first=$("[data-clock]");
  if(first)first.click();
 }

 if(page==="notes")bindNotes();
 if(page==="tasks")bindTasks();
 if(page==="store")bindStore();
 if(page==="earn"){
  const b=$("#missions");
  if(b)b.onclick=mission;
 }
 if(page==="apps")bindApps();
 if(page==="voices")bindVoices();
 if(page==="photo")bindPhoto();
 if(page==="calculator")bindCalculator();
 if(page==="converter")bindConverter();
}

function bindNotes(){
 const save=$("#saveNote");

 if(save){
  save.onclick=()=>{
   const title=$("#noteTitle").value.trim();
   const text=$("#noteText").value.trim();

   if(!text){
    msg("Write something first");
    return;
   }

   const n=get(K.notes);
   n.push({title,text});
   put(K.notes,n);
   render();
   msg("Note saved");
  };
 }

 $$("[data-note-menu]").forEach(b=>{
  b.onclick=()=>{
   const i=Number(b.dataset.noteMenu);
   const box=$("#noteMenu"+i);

   box.innerHTML=`
   <div class="menu">
    <button data-edit-note="${i}">Edit</button>
    <button data-download-note="${i}">Download document</button>
    <button data-delete-note="${i}">Delete</button>
   </div>`;

   bindNoteMenu();
  };
 });

 $$("[data-trash-menu]").forEach(b=>{
  b.onclick=()=>{
   const i=Number(b.dataset.trashMenu);
   const box=$("#trashMenu"+i);

   box.innerHTML=`
   <div class="menu">
    <button data-restore-note="${i}">Restore</button>
    <button data-delete-forever="${i}" class="danger">Delete forever</button>
   </div>`;

   bindNoteMenu();
  };
 });
}

function bindNoteMenu(){
 $$("[data-edit-note]").forEach(b=>{
  b.onclick=()=>{
   const i=Number(b.dataset.editNote);
   const n=get(K.notes);

   const title=prompt("Title",n[i].title||"");
   if(title!==null)n[i].title=title;

   const text=prompt("Note",n[i].text||"");
   if(text!==null)n[i].text=text;

   put(K.notes,n);
   render();
  };
 });

 $$("[data-download-note]").forEach(b=>{
  b.onclick=()=>{
   const i=Number(b.dataset.downloadNote);
   const x=get(K.notes)[i];

   const blob=new Blob(
    [x.title+"\n\n"+x.text],
    {type:"text/plain"}
   );

   const a=document.createElement("a");
   a.href=URL.createObjectURL(blob);
   a.download=(x.title||"note")+".txt";
   a.click();

   setTimeout(()=>URL.revokeObjectURL(a.href),1000);
  };
 });

 $$("[data-delete-note]").forEach(b=>{
  b.onclick=()=>{
   const i=Number(b.dataset.deleteNote);
   const n=get(K.notes);
   const d=get(K.trash);

   d.push(n.splice(i,1)[0]);

   put(K.notes,n);
   put(K.trash,d);
   render();
  };
 });

 $$("[data-restore-note]").forEach(b=>{
  b.onclick=()=>{
   const i=Number(b.dataset.restoreNote);
   const d=get(K.trash);
   const n=get(K.notes);

   n.push(d.splice(i,1)[0]);

   put(K.notes,n);
   put(K.trash,d);
   render();
  };
 });

 $$("[data-delete-forever]").forEach(b=>{
  b.onclick=()=>{
   const i=Number(b.dataset.deleteForever);
   const d=get(K.trash);

   d.splice(i,1);
   put(K.trash,d);
   render();
  };
 });
}

function bindTasks(){
 const add=$("#addTasks");

 if(add){
  add.onclick=()=>{
   const input=$("#taskInput");
   const a=get(K.tasks);

   input.value
    .split("\n")
    .map(x=>x.trim())
    .filter(Boolean)
    .forEach(text=>a.push({text}));

   put(K.tasks,a);
   render();
  };
 }

 $$("[data-task-check]").forEach(b=>{
  b.onchange=()=>{
   const i=Number(b.dataset.taskCheck);
   const a=get(K.tasks);

   a.splice(i,1);
   put(K.tasks,a);
   render();
  };
 });

 $$("[data-task-menu]").forEach(b=>{
  b.onclick=()=>{
   const i=Number(b.dataset.taskMenu);
   const box=$("#taskMenu"+i);

   box.innerHTML=`
   <div class="menu">
    <button data-remind-task="${i}">Remind me</button>
    <button data-delete-task="${i}" class="danger">Delete</button>
   </div>`;

   const r=box.querySelector("[data-remind-task]");
   const d=box.querySelector("[data-delete-task]");

   r.onclick=()=>remind(i);

   d.onclick=()=>{
    const a=get(K.tasks);
    a.splice(i,1);
    put(K.tasks,a);
    render();
   };
  };
 });
}

function bindStore(){
 const box=$("#store");
 if(!box)return;

 box.innerHTML=posts.map((p,i)=>`
  <div class="item">
   <b>${esc(p.name||"Unnamed app")}</b>
   <small>${esc(p.description||"")}</small>
   <small>
    ${
     Number(p.price||0)===0
     ?"free"
     :Number(p.price).toFixed(2)+"¢"
    }
   </small>
   <button data-install="${i}" class="primary">Install</button>
  </div>
 `).join("")||"<p>No posts found.</p>";

 $$("[data-install]").forEach(b=>{
  b.onclick=()=>{
   const p=posts[Number(b.dataset.install)];
   const a=get(K.apps);

   if(!a.some(x=>x.name===p.name)){
    a.push({
     name:p.name,
     url:p.url||p.link||""
    });

    put(K.apps,a);
   }

   msg("Installed");
  };
 });
}

function bindApps(){
 $$("[data-open-app]").forEach(b=>{
  b.onclick=()=>{
   const x=get(K.apps)[Number(b.dataset.openApp)];

   if(!x)return;

   if(x.url){
    window.location.href=x.url;
   }else{
    msg("No URL");
   }
  };
 });
}

function bindVoices(){
 const recordButton=$("#recordVoice");
 const stopButton=$("#stopVoice");

 if(recordButton)recordButton.onclick=record;
 if(stopButton)stopButton.onclick=stopRec;

 $$("[data-voice-menu]").forEach(b=>{
  b.onclick=()=>{
   const i=Number(b.dataset.voiceMenu);
   const box=$("#voiceMenu"+i);

   box.innerHTML=`
   <div class="menu">
    <button data-play-voice="${i}">Play</button>
    <button data-delete-voice="${i}" class="danger">Delete</button>
   </div>`;

   const play=box.querySelector("[data-play-voice]");
   const del=box.querySelector("[data-delete-voice]");

   play.onclick=()=>{
    const v=get(K.voices)[i];
    if(v&&v.url){
     const audio=new Audio(v.url);
     audio.play().catch(()=>msg("Cannot play voice"));
    }else{
     msg("Voice data unavailable after reload");
    }
   };

   del.onclick=()=>{
    const v=get(K.voices);
    v.splice(i,1);
    put(K.voices,v);
    render();
   };
  };
 });
}

function bindPhoto(){
 $$("button[data-photo]").forEach(b=>{
  b.onclick=()=>{
   const type=b.dataset.photo;

   if(type==="quality") photoQuality();
   if(type==="subjects") photoSubjects();
   if(type==="create") photoCreate();
  };
 });
}

function photoQuality(){
 app.innerHTML=`
  <section class="card">
   <h2>Quality</h2>
   <input id="pqFile" type="file" accept="image/*">
   <select id="pqMode">
    <option value="low">Low</option>
    <option value="high">High</option>
   </select>
   <button id="pqSend">Send</button>
   <div id="pqResult"></div>
  </section>
 `;

 $("#pqSend").onclick=()=>{
  const f=$("#pqFile").files[0];
  const mode=$("#pqMode").value;

  if(!f){
   msg("Upload a photo first");
   return;
  }

  const r=new FileReader();

  r.onload=()=>{
   const im=new Image();

   im.onload=()=>{
    const c=document.createElement("canvas");
    const x=c.getContext("2d");

    const scale=mode==="high"?1.5:.75;

    c.width=Math.max(1,Math.round(im.width*scale));
    c.height=Math.max(1,Math.round(im.height*scale));

    x.drawImage(im,0,0,c.width,c.height);

    const url=c.toDataURL("image/jpeg",.92);

    $("#pqResult").innerHTML=`
     <div class="card">
      <img src="${url}" style="max-width:100%;border-radius:12px">
      <br>
      <button id="pqDownload">Download</button>
      <button id="pqDelete">Delete</button>
     </div>
    `;

    $("#pqDownload").onclick=()=>{
     downloadImg(url,"barmaan-quality.jpg");
    };

    $("#pqDelete").onclick=()=>{
     $("#pqResult").innerHTML="";
    };
   };

   im.src=r.result;
  };

  r.readAsDataURL(f);
 };
}

function photoSubjects(){
 app.innerHTML=`
  <section class="card">
   <h2>Delete Subjects</h2>

   <div class="row">
    <button id="humanBtn">Humans</button>
    <button id="subjectBtn">Subjects</button>
   </div>

   <input id="dsFile" type="file" accept="image/*">

   <canvas id="dsCanvas"
    style="max-width:100%;touch-action:none;border-radius:12px">
   </canvas>

   <button id="dsSend">Send</button>

   <div id="dsResult"></div>
  </section>
 `;

 let mode="subject";
 let img=null;
 let drawing=false;
 let startX=0;
 let startY=0;
 let endX=0;
 let endY=0;

 $("#humanBtn").onclick=()=>{
  mode="human";
  msg("Humans mode");
 };

 $("#subjectBtn").onclick=()=>{
  mode="subject";
  msg("Subjects mode");
 };

 $("#dsFile").onchange=e=>{
  const file=e.target.files[0];
  if(!file)return;

  const r=new FileReader();

  r.onload=()=>{
   img=new Image();

   img.onload=()=>{
    const c=$("#dsCanvas");
    const x=c.getContext("2d");

    const max=900;
    const scale=Math.min(1,max/img.width,max/img.height);

    c.width=Math.round(img.width*scale);
    c.height=Math.round(img.height*scale);

    x.drawImage(img,0,0,c.width,c.height);
   };

   img.src=r.result;
  };

  r.readAsDataURL(file);
 };

 const pos=e=>{
  const c=$("#dsCanvas");
  const r=c.getBoundingClientRect();

  return {
   x:(e.clientX-r.left)*(c.width/r.width),
   y:(e.clientY-r.top)*(c.height/r.height)
  };
 };

 $("#dsCanvas").onpointerdown=e=>{
  if(!img)return;

  drawing=true;

  const p=pos(e);

  startX=p.x;
  startY=p.y;
  endX=p.x;
  endY=p.y;
 };

 $("#dsCanvas").onpointermove=e=>{
  if(!drawing)return;

  const p=pos(e);

  endX=p.x;
  endY=p.y;

  const c=$("#dsCanvas");
  const x=c.getContext("2d");

  x.clearRect(0,0,c.width,c.height);
  x.drawImage(img,0,0,c.width,c.height);

  x.strokeStyle="red";
  x.lineWidth=3;
  x.setLineDash([8,5]);

  x.strokeRect(
   startX,
   startY,
   endX-startX,
   endY-startY
  );

  x.setLineDash([]);
 };

 $("#dsCanvas").onpointerup=()=>{
  drawing=false;
 };

 $("#dsSend").onclick=()=>{
  if(!img){
   msg("Upload a photo first");
   return;
  }

  const c=$("#dsCanvas");
  const x=c.getContext("2d");

  const left=Math.min(startX,endX);
  const top=Math.min(startY,endY);
  const width=Math.abs(endX-startX);
  const height=Math.abs(endY-startY);

  if(width<5||height<5){
   msg("Draw around a subject first");
   return;
  }

  x.fillStyle="rgba(120,120,120,.95)";
  x.fillRect(left,top,width,height);

  const result=c.toDataURL("image/jpeg",.92);

  $("#dsResult").innerHTML=`
   <div class="card">
    <p>Ready</p>
    <img src="${result}" style="max-width:100%;border-radius:12px">
    <br>
    <button id="dsDownload">Download</button>
   </div>
  `;

  $("#dsDownload").onclick=()=>{
   downloadImg(result,"barmaan-subjects.jpg");
  };
 };
}

function photoCreate(){
 app.innerHTML=`
  <section class="card">
   <h2>Create Photo</h2>

   <textarea id="cpPrompt"
    placeholder="Describe your photo..."></textarea>

   <button id="cpSend">Send</button>

   <div id="cpResult"></div>
  </section>
 `;

 $("#cpSend").onclick=()=>{
  const prompt=$("#cpPrompt").value.trim();

  if(!prompt){
   msg("Enter a prompt first");
   return;
  }

  const result=$("#cpResult");

  result.innerHTML=`
   <div class="card">
    <p>Making...</p>
   </div>
  `;

  setTimeout(()=>{
   const c=document.createElement("canvas");
   c.width=1000;
   c.height=700;

   const x=c.getContext("2d");

   x.fillStyle="#101828";
   x.fillRect(0,0,c.width,c.height);

   x.fillStyle="#ffffff";
   x.textAlign="center";
   x.font="bold 42px Arial";

   const words=prompt.match(/.{1,35}/g)||[prompt];

   words.slice(0,8).forEach((line,i)=>{
    x.fillText(
     line,
     c.width/2,
     180+i*55
    );
   });

   x.font="24px Arial";
   x.fillText(
    "Created by Barmaan Utility",
    c.width/2,
    620
   );

   const url=c.toDataURL("image/png");

   result.innerHTML=`
    <div class="card">
     <p>Ready</p>
     <img src="${url}"
      style="max-width:100%;border-radius:12px">
     <br>
     <button id="cpDownload">Download</button>
    </div>
   `;

   $("#cpDownload").onclick=()=>{
    downloadImg(url,"barmaan-created.png");
   };
  },700);
 };
}

function downloadImg(url,name){
 const a=document.createElement("a");
 a.href=url;
 a.download=name;
 document.body.appendChild(a);
 a.click();
 a.remove();
}

function calculator(){
 app.innerHTML=`
  <section class="card">
   <h2>Calculator</h2>

   <input id="calcInput"
    type="text"
    inputmode="text"
    autocomplete="off"
    placeholder="Example: 12*8+5">

   <button id="calcBtn">Calculate</button>

   <div id="calcResult"></div>
  </section>
 `;

 $("#calcBtn").onclick=()=>{
  const value=$("#calcInput").value.trim();

  if(!value){
   msg("Enter a calculation");
   return;
  }

  if(!/^[0-9+*/().%\\-\\s]+$/.test(value)){
   msg("Invalid calculation");
   return;
  }

  try{
   const answer=Function(
    '"use strict";return ('+value+')'
   )();

   if(!Number.isFinite(answer)){
    msg("Invalid result");
    return;
   }

   $("#calcResult").innerHTML=`
    <div class="card">
     <b>${esc(String(answer))}</b>
    </div>
   `;
  }catch{
   msg("Invalid calculation");
  }
 };
}

function converter(){
 app.innerHTML=`
  <section class="card">
   <h2>Converter</h2>

   <input id="cvValue"
    type="text"
    inputmode="decimal"
    placeholder="Value">

   <select id="cvType">
    <option value="kmmi">Kilometers → Miles</option>
    <option value="mikm">Miles → Kilometers</option>
    <option value="kglb">Kilograms → Pounds</option>
    <option value="lbkg">Pounds → Kilograms</option>
    <option value="cf">Celsius → Fahrenheit</option>
    <option value="fc">Fahrenheit → Celsius</option>
   </select>

   <button id="cvBtn">Convert</button>

   <div id="cvResult"></div>
  </section>
 `;

 $("#cvBtn").onclick=()=>{
  const n=Number($("#cvValue").value);

  if(!Number.isFinite(n)){
   msg("Enter a valid number");
   return;
  }

  const type=$("#cvType").value;
  let result;

  if(type==="kmmi") result=n*.621371;
  if(type==="mikm") result=n*1.609344;
  if(type==="kglb") result=n*2.2046226218;
  if(type==="lbkg") result=n*.45359237;
  if(type==="cf") result=n*9/5+32;
  if(type==="fc") result=(n-32)*5/9;

  $("#cvResult").innerHTML=`
   <div class="card">
    ${esc(result.toFixed(4))}
   </div>
  `;
 };
}

function render(){
 navRender();

 if(page==="home") home();
 else if(page==="clock") clockPage();
 else if(page==="notes") notes();
 else if(page==="tasks") tasks();
 else if(page==="store") store();
 else if(page==="earn") earn();
 else if(page==="apps") apps();
 else if(page==="voices") voices();
 else if(page==="photo") photo();
 else if(page==="calculator") calculator();
 else if(page==="converter") converter();

 bind();
}

function bind(){
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
}

function bindNav(){
 $$("#mainNav button").forEach(b=>{
  b.onclick=()=>{
   page=b.dataset.page;
   render();
  };
 });
}

function bindHome(){}

function bindClock(){
 $$("#clockTabs button").forEach(b=>{
  b.onclick=()=>{
   clockPageMode=b.dataset.clock;
   clockPage();
   bindClock();
  };
 });

 const start=$("#swStart");
 const stop=$("#swStop");
 const reset=$("#swReset");

 if(start) start.onclick=startStopwatch;
 if(stop) stop.onclick=stopStopwatch;
 if(reset) reset.onclick=resetStopwatch;

 const timerStart=$("#timerStart");
 const timerStop=$("#timerStop");
 const timerReset=$("#timerReset");

 if(timerStart) timerStart.onclick=startTimer;
 if(timerStop) timerStop.onclick=stopTimer;
 if(timerReset) timerReset.onclick=resetTimer;

 const alarmAdd=$("#alarmAdd");

 if(alarmAdd){
  alarmAdd.onclick=()=>{
   const time=$("#alarmTime").value;
   const snooze=Number($("#alarmSnooze").value);
   const count=$("#alarmCount").value;

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
    enabled:true
   });

   put(K.alarms,alarms);

   clockPage();
   bindClock();

   msg("Alarm added");
  };
 }
}

function bindNotes(){
 const save=$("#noteSave");
 const text=$("#noteText");

 if(save&&text){
  save.onclick=()=>{
   const value=text.value.trim();

   if(!value){
    msg("Write something first");
    return;
   }

   const notes=get(K.notes);

   notes.push({
    id:Date.now(),
    text:value,
    date:new Date().toISOString()
   });

   put(K.notes,notes);

   render();
   msg("Note saved");
  };
 }

 $$("[data-note-menu]").forEach(b=>{
  b.onclick=()=>{
   const id=Number(b.dataset.noteMenu);
   bindNoteMenu(id);
  };
 });
}

function bindNoteMenu(id){
 const notes=get(K.notes);
 const n=notes.find(x=>x.id===id);

 if(!n)return;

 const action=prompt(
  "1 = Edit\n2 = Download document\n3 = Delete"
 );

 if(action==="1"){
  const value=prompt("Edit note",n.text);

  if(value!==null){
   n.text=value;
   put(K.notes,notes);
   render();
  }
 }

 if(action==="2"){
  const blob=new Blob(
   [n.text],
   {type:"text/plain"}
  );

  const url=URL.createObjectURL(blob);

  const a=document.createElement("a");
  a.href=url;
  a.download="barmaan-note.txt";
  a.click();

  URL.revokeObjectURL(url);
 }

 if(action==="3"){
  const index=notes.findIndex(x=>x.id===id);

  if(index>-1){
   const deleted=notes.splice(index,1)[0];
   const trash=get(K.trash);

   trash.push(deleted);

   put(K.notes,notes);
   put(K.trash,trash);

   render();
   msg("Moved to Recently Deleted");
  }
 }
}

function bindTasks(){
 const add=$("#taskAdd");
 const input=$("#taskInput");

 if(add&&input){
  add.onclick=()=>{
   const text=input.value.trim();

   if(!text){
    msg("Enter a task");
    return;
   }

   const tasks=get(K.tasks);

   tasks.push({
    id:Date.now(),
    text,
    done:false,
    reminder:null
   });

   put(K.tasks,tasks);

   render();
  };
 }

 $$("[data-task-check]").forEach(c=>{
  c.onchange=()=>{
   const id=Number(c.dataset.taskCheck);
   const tasks=get(K.tasks);
   const i=tasks.findIndex(x=>x.id===id);

   if(i<0)return;

   if(c.checked){
    tasks.splice(i,1);
   }else{
    tasks[i].done=false;
   }

   put(K.tasks,tasks);
   render();
  };
 });

 $$("[data-task-menu]").forEach(b=>{
  b.onclick=()=>{
   const id=Number(b.dataset.taskMenu);
   const tasks=get(K.tasks);
   const t=tasks.find(x=>x.id===id);

   if(!t)return;

   const action=prompt(
    "1 = Remind me\n2 = Delete"
   );

   if(action==="1"){
    const date=prompt(
     "Gregorian date YYYY-MM-DD"
    );

    const time=prompt(
     "Time HH:MM"
    );

    if(!date||!time)return;

    const when=new Date(
     date+"T"+time
    ).getTime();

    if(!Number.isFinite(when)){
     msg("Invalid date");
     return;
    }

    t.reminder=when;
    put(K.tasks,tasks);

    setTimeout(()=>{
     notify("Barmaan Utility",t.text);
    },Math.max(0,when-Date.now()));

    msg("Reminder saved");
   }

   if(action==="2"){
    const i=tasks.findIndex(x=>x.id===id);

    if(i>-1){
     tasks.splice(i,1);
     put(K.tasks,tasks);
     render();
    }
   }
  };
 });
}

function bindStore(){
 $$("[data-app-install]").forEach(b=>{
  b.onclick=()=>{
   const id=b.dataset.appInstall;
   const posts=get(K.apps);

   if(!posts.some(x=>x.id===id)){
    const name=b.dataset.appName||id;

    posts.push({
     id,
     name,
     type:"PWA"
    });

    put(K.apps,posts);
   }

   msg("App saved");
   render();
  };
 });
}

function bindEarn(){
 const missionsBtn=$("#missionsBtn");

 if(missionsBtn){
  missionsBtn.onclick=mission;
 }

 $$("[data-answer]").forEach(b=>{
  b.onclick=()=>{
   const correct=b.dataset.answer==="true";

   if(correct){
    const money=Number(localStorage.getItem(K.money)||0);
    const level=$("#earnLevel")?.value||"easy";

    const reward=
     level==="easy"?20:
     level==="medium"?50:100;

    localStorage.setItem(
     K.money,
     String(money+reward)
    );

    msg("Correct! +"+reward+"¢");
   }else{
    msg("Wrong answer");
   }

   earn();
  };
 });
}

function bindApps(){
 $$("[data-open-app]").forEach(b=>{
  b.onclick=()=>{
   const url=b.dataset.openApp;

   if(url){
    location.href=url;
   }
  };
 });
}

function bindVoices(){
 const rec=$("#voiceRecord");

 if(rec) rec.onclick=record;

 const stop=$("#voiceStop");

 if(stop) stop.onclick=stopRec;

 $$("[data-voice-menu]").forEach(b=>{
  b.onclick=()=>{
   const id=Number(b.dataset.voiceMenu);
   const voices=get(K.voices);
   const v=voices.find(x=>x.id===id);

   if(!v)return;

   const action=prompt(
    "1 = Play\n2 = Delete"
   );

   if(action==="1"){
    if(v.url){
     const audio=new Audio(v.url);
     audio.play().catch(()=>msg("Cannot play voice"));
    }else{
     msg("Voice unavailable");
    }
   }

   if(action==="2"){
    const index=voices.findIndex(x=>x.id===id);

    if(index>-1){
     voices.splice(index,1);
     put(K.voices,voices);
     render();
    }
   }
  };
 });
}

function tick(){
 const d=new Date();

 if(clock){
  clock.textContent=
   d.toLocaleTimeString();
 }

 checkAlarms();
 updateStopwatch();
 updateTimer();
}

function checkAlarms(){
 const alarms=get(K.alarms);
 const now=new Date();

 const current=
  String(now.getHours()).padStart(2,"0")+
  ":"+
  String(now.getMinutes()).padStart(2,"0");

 let changed=false;

 alarms.forEach(a=>{
  if(!a.enabled)return;

  if(a.time!==current)return;

  const stamp=
   now.getFullYear()+"-"+now.getMonth()+"-"+now.getDate()+
   "-"+now.getHours()+"-"+now.getMinutes();

  if(a.last===stamp)return;

  a.last=stamp;
  changed=true;

  notify(
   "Barmaan Alarm",
   "بیپ بیپ / بوپ بوپ / بیپ بیپ"
  );

  msg(
   "⏰ "+a.time+
   " — بیپ بیپ / بوپ بوپ / بیپ بیپ"
  );
 });

 if(changed)put(K.alarms,alarms);
}

async function notify(title,body){
 if(!("Notification" in window)){
  msg(body);
  return;
 }

 if(Notification.permission==="default"){
  try{
   await Notification.requestPermission();
  }catch{}
 }

 if(Notification.permission==="granted"){
  try{
   new Notification(title,{body});
  }catch{
   msg(body);
  }
 }else{
  msg(body);
 }
}

function startStopwatch(){
 if(sw) return;

 sw=true;
 swStart=performance.now()-swTime;

 updateStopwatch();
}

function stopStopwatch(){
 if(!sw)return;

 swTime=performance.now()-swStart;
 sw=false;

 updateStopwatch();
}

function resetStopwatch(){
 sw=false;
 swTime=0;
 swStart=0;

 updateStopwatch();
}

function updateStopwatch(){
 if(!sw)return;

 swTime=performance.now()-swStart;

 const el=$("#swDisplay");

 if(el){
  el.textContent=formatMs(swTime);
 }
}

function formatMs(ms){
 const total=Math.floor(ms/1000);
 const h=Math.floor(total/3600);
 const m=Math.floor((total%3600)/60);
 const s=total%60;

 return(
  String(h).padStart(2,"0")+":"+
  String(m).padStart(2,"0")+":"+
  String(s).padStart(2,"0")
 );
}

function startTimer(){
 if(timer)return;

 const min=Math.max(
  0,
  Number($("#timerMin")?.value||0)
 );

 const sec=Math.max(
  0,
  Number($("#timerSec")?.value||0)
 );

 if(timerValue<=0){
  timerValue=(min*60+sec)*1000;
 }

 if(timerValue<=0){
  msg("Set timer first");
  return;
 }

 timer=true;
 timerLast=performance.now();
}

function stopTimer(){
 timer=false;
 timerLast=0;
}

function resetTimer(){
 timer=false;
 timerLast=0;
 timerValue=0;

 const el=$("#timerDisplay");

 if(el){
  el.textContent="00:00";
 }
}

function updateTimer(){
 if(!timer)return;

 const now=performance.now();

 if(!timerLast){
  timerLast=now;
 }

 timerValue-=now-timerLast;
 timerLast=now;

 if(timerValue<=0){
  timerValue=0;
  timer=false;
  timerLast=0;

  notify(
   "Barmaan Timer",
   "Timer finished"
  );

  msg("⏱️ Timer finished");
 }

 const el=$("#timerDisplay");

 if(el){
  const total=Math.max(
   0,
   Math.ceil(timerValue/1000)
  );

  const m=Math.floor(total/60);
  const s=total%60;

  el.textContent=
   String(m).padStart(2,"0")+":"+
   String(s).padStart(2,"0");
 }
}

function init(){
 css();
 navRender();
 render();

 loadPosts().then(()=>{
  if(page==="store")render();
 });

 setInterval(tick,1000);
 tick();
}

init();
