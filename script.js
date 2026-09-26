"use strict";

const nav=document.getElementById("mainNav"),app=document.getElementById("app"),clock=document.getElementById("liveClock"),toast=document.getElementById("toast");
let page="home",timer=null,sw=null,swOn=false,swStart=0,swTime=0,alarmTimer=null;

const K={notes:"bv_notes",trash:"bv_trash",tasks:"bv_tasks",money:"bv_money",apps:"bv_apps",alarms:"bv_alarms"};
const get=(k,d=[])=>JSON.parse(localStorage.getItem(k)||JSON.stringify(d));
const put=(k,v)=>localStorage.setItem(k,JSON.stringify(v));
const esc=s=>String(s||"").replace(/[&<>"']/g,x=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[x]));
const msg=x=>{if(!toast)return;toast.textContent=x;toast.classList.add("show");clearTimeout(msg.t);msg.t=setTimeout(()=>toast.classList.remove("show"),2000)};

function css(){
if(document.getElementById("bvcss"))return;
let s=document.createElement("style");s.id="bvcss";s.textContent=`
*{box-sizing:border-box}body{margin:0;font-family:Arial;background:#101114;color:#fff}
#app{padding:16px;max-width:850px;margin:auto}.card,.item{background:#191b20;border:1px solid #292c33;border-radius:15px;padding:15px;margin:10px 0}
.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:9px}
button,input,textarea,select{font:inherit;border:0;border-radius:11px;padding:11px}
button{background:#292d35;color:#fff;cursor:pointer}.primary{background:#fff;color:#111}
input,textarea,select{width:100%;background:#0c0d10;color:#fff;border:1px solid #333;margin:5px 0}
textarea{min-height:110px}.row{display:flex;gap:7px;flex-wrap:wrap}.row>*{flex:1}
.navButton{margin:3px}.navButton.active{background:#fff;color:#111}
.item small{display:block;color:#999;margin:5px 0}.dots{float:right}.menu{margin-top:7px}.menu button{display:block;width:100%;text-align:left;margin:3px 0}
.done{text-decoration:line-through;color:#777}.display{padding:18px;background:#08090b;border-radius:12px;text-align:center;font-size:25px}
.preview{max-width:100%;max-height:500px;border-radius:12px;margin:8px 0}.danger{background:#702222}.money{font-size:30px;font-weight:bold}
#toast{position:fixed;bottom:18px;left:50%;transform:translateX(-50%);background:#fff;color:#111;padding:11px 17px;border-radius:12px;opacity:0;transition:.2s;z-index:99}
#toast.show{opacity:1}
`;document.head.appendChild(s)}

const pages=[["home","Home 🏠"],["clock","Clock"],["notes","Note"],["tasks","Tasks"],["store","UI store"],["earn","Earn"],["apps","My apps"],["voices","Voices"],["photo","Photo AI|crazy AI"],["calculator","Calculator"],["converter","Converter"]];

function navRender(){
nav.innerHTML=pages.map(x=>`<button class="navButton ${page==x[0]?"active":""}" data-p="${x[0]}">${x[1]}</button>`).join("");
nav.querySelectorAll("[data-p]").forEach(b=>b.onclick=()=>{page=b.dataset.p;renderNavAndPage()});
}

const home=()=>`<div class="card"><h1>Barmaan Utility</h1><p>Fast, simple and useful tools.</p></div><div class="grid">${pages.slice(1).map(x=>`<button data-open="${x[0]}"><b>${x[1]}</b></button>`).join("")}</div>`;

function clockPage(){
return `<div class="card"><h1>Clock</h1><div class="grid">
<button data-clock="alarm">Alarm</button><button data-clock="world">World Clock</button><button data-clock="sw">Stopwatch</button><button data-clock="timer">Timer</button></div></div><div id="clockArea"></div>`}

function clockPart(t){
let a=get(K.alarms);
if(t=="alarm")return `<div class="card"><h2>Alarm</h2><input id="at" type="time"><select id="as"><option value="0">Snooze off</option><option>1</option><option>5</option><option>10</option><option>15</option><option>30</option><option>60</option></select><select id="ac"><option value="forever">Forever</option><option>1</option><option>2</option><option>5</option><option>10</option></select><button id="add" class="primary">Add alarm</button>${a.map((x,i)=>`<div class="item"><b>${x.time}</b><small>Snooze ${x.snooze?x.snooze+" min":"off"} · ${x.count}</small><button data-da="${i}" class="danger">Delete</button></div>`).join("")}</div>`;
if(t=="world")return `<div class="card"><h2>World Clock</h2><select id="zone"><option>UTC</option><option>Europe/Amsterdam</option><option>Europe/London</option><option>Europe/Paris</option><option>Asia/Tehran</option><option>Asia/Tokyo</option><option>Asia/Bangkok</option><option>America/New_York</option><option>America/Los_Angeles</option></select><div id="world" class="display"></div></div>`;
if(t=="sw")return `<div class="card"><h2>Stopwatch</h2><div id="sd" class="display">00:00.000</div><div class="row"><button id="ss" class="primary">Start</button><button id="sr">Reset</button></div></div>`;
return `<div class="card"><h2>Timer</h2><input id="tm" type="number" placeholder="Minutes"><input id="ts" type="number" placeholder="Seconds"><div id="td" class="display">00:00</div><div class="row"><button id="tgo" class="primary">Start</button><button id="tre">Restart</button><button id="tz">Reset</button></div></div>`}

function notes(){
let n=get(K.notes),d=get(K.trash);
return `<div class="card"><h1>Note</h1><input id="nt" placeholder="Title"><textarea id="nx" placeholder="Write your note"></textarea><button id="ns" class="primary">Save</button></div><div class="card"><h2>Notes</h2>${n.map((x,i)=>`<div class="item"><button class="dots" data-nm="${i}">...</button><b>${esc(x.title||"Untitled")}</b><small>${esc(x.text)}</small><div id="nm${i}"></div></div>`).join("")||"<p>No notes.</p>"}</div><div class="card"><h2>Recently Deleted</h2>${d.map((x,i)=>`<div class="item"><button class="dots" data-dm="${i}">...</button><b>${esc(x.title||"Untitled")}</b><small>${esc(x.text)}</small><div id="dm${i}"></div></div>`).join("")||"<p>Empty.</p>"}</div>`}

function tasks(){
let t=get(K.tasks);
return `<div class="card"><h1>Tasks</h1><textarea id="ti" placeholder="One task per line"></textarea><button id="ta" class="primary">Add tasks</button></div><div class="card">${t.map((x,i)=>`<div class="item"><input type="checkbox" data-tc="${i}"> ${esc(x.text)} <button class="dots" data-tm="${i}">...</button><div id="tm${i}"></div></div>`).join("")||"<p>No tasks.</p>"}</div>`}

function store(){
return `<div class="card"><h1>UI store</h1><p>Apps from posts.json</p></div><div id="store"></div>`}

let posts=[];
async function loadPosts(){try{posts=await (await fetch("posts.json",{cache:"no-store"})).json()}catch{posts=[]}}

function earn(){
return `<div class="card"><h1>Earn</h1><div class="money">${Number(localStorage.getItem(K.money)||0).toFixed(2)}¢</div><button id="mission" class="primary">Missions</button></div><div id="qa"></div>`}

const qs=[
["ریاضی","آسان","12 + 8",["20","18","22"],"20",20],["ریاضی","متوسط","15 × 4",["50","60","70"],"60",50],
["ریاضی","سخت","144 ÷ 12",["10","12","14"],"12",100],["علوم","آسان","آب در چند درجه یخ می‌زند؟",["0","50","100"],"0",20],
["علوم","متوسط","سیاره سرخ کدام است؟",["زهره","مریخ","مشتری"],"مریخ",50],["جغرافیا","سخت","پایتخت ژاپن؟",["توکیو","سئول","پکن"],"توکیو",100]];

function mission(){
let q=qs[Math.floor(Math.random()*qs.length)];
qa.innerHTML=`<div class="card"><small>${q[0]} · ${q[1]} · ${q[5]}¢</small><h3>${q[2]}</h3><div class="grid">${q[3].map(x=>`<button data-a="${esc(x)}">${esc(x)}</button>`).join("")}</div></div>`;
qa.querySelectorAll("[data-a]").forEach(b=>b.onclick=()=>{if(b.dataset.a==q[4]){let m=Number(localStorage.getItem(K.money)||0)+q[5];localStorage.setItem(K.money,m);msg("Correct! +"+q[5]+"¢")}else msg("Wrong. No money.");mission()})}

function apps(){
let a=get(K.apps);return `<div class="card"><h1>My apps</h1></div>${a.map((x,i)=>`<div class="item"><b>${esc(x.name)}</b><button data-openapp="${i}">Open</button></div>`).join("")||`<div class="card">No installed apps.</div>`}

function voices(){
let v=get("bv_voice_names");return `<div class="card"><h1>Voices</h1><button id="rec" class="primary">🎙 Record</button><button id="stop">Stop</button><p id="vs"></p></div>${v.map((x,i)=>`<div class="item"><b>${esc(x)}</b><button data-vm="${i}">...</button><div id="vm${i}"></div></div>`).join("")}`}

let recorder,chunks=[];
async function record(){
try{let s=await navigator.mediaDevices.getUserMedia({audio:true});recorder=new MediaRecorder(s);chunks=[];recorder.ondataavailable=e=>chunks.push(e.data);recorder.onstop=()=>{s.getTracks().forEach(x=>x.stop());let b=new Blob(chunks,{type:"audio/webm"});window.lastVoice=URL.createObjectURL(b);let v=get("bv_voice_names");v.push("Voice "+new Date().toLocaleString());put("bv_voice_names",v);msg("Voice saved");renderNavAndPage()};recorder.start();vs.textContent="Recording..."}catch{msg("Microphone permission required")}}
function stopRec(){if(recorder&&recorder.state!="inactive")recorder.stop()}

function photo(){
return `<div class="card"><h1>Photo AI | crazy AI</h1><div class="grid"><button data-pm="quality">Quality</button><button data-pm="delete">Delete subjects</button><button data-pm="create">Create photo</button></div></div><div id="pa"></div>`}

function photoPart(m="quality"){
if(m=="quality")return `<div class="card"><h2>Quality</h2><input id="pf" type="file" accept="image/*"><div class="row"><button id="low">Change to low quality</button><button id="high">Change to high quality</button></div><button id="ps" class="primary">Send</button><div id="pr"></div></div>`;
if(m=="delete")return `<div class="card"><h2>Delete subjects</h2><button>Humans</button><button>Subjects</button><input id="df" type="file" accept="image/*"><p>Draw around subject</p><canvas id="dc"></canvas><button id="ds" class="primary">Send it</button><div id="dr"></div></div>`;
return `<div class="card"><h2>Create photo</h2><textarea id="cp" placeholder="Write here"></textarea><button id="cs" class="primary">Send</button><div id="cr"></div></div>`}

let photoImg=null,points=[];
function loadPhoto(file,cb){let r=new FileReader;r.onload=()=>{let i=new Image;i.onload=()=>cb(i);i.src=r.result};r.readAsDataURL(file)}

function calculator(){
return `<div class="card"><h1>Calculator</h1><input id="ci" type="text" inputmode="text" placeholder="Example: 12 * 8"><button id="cb" class="primary">Calculate</button><div id="co" class="display">Result</div></div>`}

function converter(){
return `<div class="card"><h1>Converter</h1><input id="cv" type="number"><select id="ct"><option value="km">KM → Miles</option><option value="mi">Miles → KM</option><option value="kg">KG → LB</option><option value="lb">LB → KG</option><option value="cf">°C → °F</option><option value="fc">°F → °C</option></select><button id="convert" class="primary">Convert</button><div id="crv" class="display"></div></div>`}

function render(){
if(!app)return;
let h={home,clock:clockPage,notes,tasks,store,earn,apps,voices,photo,calculator,converter};
app.innerHTML=(h[page]||home)();
bind();
}

function bind(){
app.querySelectorAll("[data-open]").forEach(b=>b.onclick=()=>{page=b.dataset.open;renderNavAndPage()});

if(page=="clock"){
app.querySelectorAll("[data-clock]").forEach(b=>b.onclick=()=>{document.getElementById("clockArea").innerHTML=clockPart(b.dataset.clock);clockBind(b.dataset.clock)});
document.querySelector("[data-clock]")?.click()
}

if(page=="notes"){
document.getElementById("ns")?.addEventListener("click",()=>{let n=get(K.notes);let t=nt.value.trim(),x=nx.value.trim();if(!x)return msg("Write something first");n.push({title:t,text:x});put(K.notes,n);render()});
document.querySelectorAll("[data-nm]").forEach(b=>b.onclick=()=>{let i=+b.dataset.nm;document.getElementById("nm"+i).innerHTML=`<div class="menu"><button data-edit="${i}">Edit</button><button data-down="${i}">Download document</button><button data-del="${i}">Delete</button></div>`;bindNoteMenu()});
document.querySelectorAll("[data-dm]").forEach(b=>b.onclick=()=>{let i=+b.dataset.dm;document.getElementById("dm"+i).innerHTML=`<div class="menu"><button data-res="${i}">Restore</button><button data-for="${i}" class="danger">Delete forever</button></div>`;bindNoteMenu()})}

if(page=="tasks"){
ta?.addEventListener("click",()=>{let a=get(K.tasks);ti.value.split("\n").map(x=>x.trim()).filter(Boolean).forEach(x=>a.push({text:x}));put(K.tasks,a);render()});
document.querySelectorAll("[data-tc]").forEach(b=>b.onchange=()=>{let a=get(K.tasks);a.splice(+b.dataset.tc,1);put(K.tasks,a);render()});
document.querySelectorAll("[data-tm]").forEach(b=>b.onclick=()=>{let i=+b.dataset.tm;document.getElementById("tm"+i).innerHTML=`<div class="menu"><button data-rem="${i}">Remind me</button><button data-td="${i}">Delete</button></div>`;document.querySelector("[data-rem]").onclick=()=>remind(i);document.querySelector("[data-td]").onclick=()=>{let a=get(K.tasks);a.splice(i,1);put(K.tasks,a);render()}})}

if(page=="store"){
let box=document.getElementById("store");box.innerHTML=posts.map((p,i)=>`<div class="item"><b>${esc(p.name)}</b><small>${esc(p.description)}</small><small>${Number(p.price||0)==0?"free":Number(p.price).toFixed(2)+"¢"}</small><button data-inst="${i}" class="primary">Install</button></div>`).join("")||"<p>No posts found.</p>";
box.querySelectorAll("[data-inst]").forEach(b=>b.onclick=()=>{let p=posts[+b.dataset.inst],a=get(K.apps);if(!a.some(x=>x.name==p.name)){a.push({name:p.name,url:p.url||p.link||""});put(K.apps,a)}msg("Installed")})}

if(page=="earn")document.getElementById("mission")?.addEventListener("click",mission);

if(page=="apps")document.querySelectorAll("[data-openapp]").forEach(b=>b.onclick=()=>{let x=get(K.apps)[+b.dataset.openapp];if(x.url)location.href=x.url;else msg("No URL")});

if(page=="voices"){rec?.addEventListener("click",record);stop?.addEventListener("click",stopRec)}

if(page=="photo"){
document.querySelectorAll("[data-pm]").forEach(b=>b.onclick=()=>{pa.innerHTML=photoPart(b.dataset.pm);photoBind(b.dataset.pm)})
photoBind("quality")
}

if(page=="calculator"){
cb.onclick=()=>{try{if(!/^[0-9+\-*/().%\s]+$/.test(ci.value))throw 0;co.textContent=Function('"use strict";return('+ci.value+')')()}catch{co.textContent="Invalid calculation."}};
ci.onkeydown=e=>{if(e.key=="Enter")cb.click()}
}

if(page=="converter")convert.onclick=()=>{let x=+cv.value,a={km:[.621371,"mi"],mi:[1.609344,"km"],kg:[2.20462,"lb"],lb:[.453592,"kg"],cf:[x=>x*9/5+32,"°F"],fc:[x=>(x-32)*5/9,"°C"]}[ct.value];let v=typeof a[0]=="function"?a[0](x):x*a[0];crv.textContent=v.toFixed(5)+" "+a[1]}
}

function bindNoteMenu(){
document.querySelectorAll("[data-edit]").forEach(b=>b.onclick=()=>{let a=get(K.notes),i=+b.dataset.edit;a[i].title=prompt("Title",a[i].title)??a[i].title;a[i].text=prompt("Note",a[i].text)??a[i].text;put(K.notes,a);render()});
document.querySelectorAll("[data-down]").forEach(b=>b.onclick=()=>{let x=get(K.notes)[+b.dataset.down],a=document.createElement("a");a.href=URL.createObjectURL(new Blob([x.title+"\n\n"+x.text],{type:"text/plain"}));a.download=(x.title||"note")+".txt";a.click()});
document.querySelectorAll("[data-del]").forEach(b=>b.onclick=()=>{let a=get(K.notes),d=get(K.trash);d.push(a.splice(+b.dataset.del,1)[0]);put(K.notes,a);put(K.trash,d);render()});
document.querySelectorAll("[data-res]").forEach(b=>b.onclick=()=>{let d=get(K.trash),a=get(K.notes);a.push(d.splice(+b.dataset.res,1)[0]);put(K.notes,a);put(K.trash,d);render()});
document.querySelectorAll("[data-for]").forEach(b=>b.onclick=()=>{let d=get(K.trash);d.splice(+b.dataset.for,1);put(K.trash,d);render()})
}

function clockBind(t){
if(t=="alarm"){add.onclick=()=>{if(!at.value)return msg("Choose time");let a=get(K.alarms);a.push({time:at.value,snooze:+as.value,count:ac.value,last:""});put(K.alarms,a);render()};document.querySelectorAll("[data-da]").forEach(b=>b.onclick=()=>{let a=get(K.alarms);a.splice(+b.dataset.da,1);put(K.alarms,a);render()})}
if(t=="world"){let f=()=>world.textContent=new Date().toLocaleString([],{timeZone:zone.value,dateStyle:"medium",timeStyle:"medium"});zone.onchange=f;f()}
if(t=="sw"){ss.onclick=()=>{if(!swOn){swOn=true;swStart=performance.now()}else{swTime+=performance.now()-swStart;swOn=false}swUpdate();ss.textContent=swOn?"Pause":"Start"};sr.onclick=()=>{swOn=false;swTime=0;swUpdate()};swUpdate()}
if(t=="timer"){tgo.onclick=()=>{if(timer){clearInterval(timer);timer=null;return}if(!window.tt)window.tt=(+tm.value||0)*60+(+ts.value||0);timer=setInterval(()=>{tt--;timerDisplay();if(tt<=0){clearInterval(timer);timer=null;notify("Timer","بیپ بیپ\nبوپ بوپ\nبیپ بیپ")}},1000);timerDisplay()};tre.onclick=()=>{clearInterval(timer);window.tt=(+tm.value||0)*60+(+ts.value||0);timer=null;tgo.click()};tz.onclick=()=>{clearInterval(timer);timer=null;window.tt=0;timerDisplay()};window.timerDisplay=()=>td.textContent=String(Math.floor((window.tt||0)/60)).padStart(2,"0")+":"+String((window.tt||0)%60).padStart(2,"0");timerDisplay()}
}

function swUpdate(){let x=swTime+(swOn?performance.now()-swStart:0);sd.textContent=String(Math.floor(x/60000)).padStart(2,"0")+":"+String(Math.floor(x%60000/1000)).padStart(2,"0")+"."+String(Math.floor(x%1000)).padStart(3,"0");if(swOn)sw=requestAnimationFrame(swUpdate)}

function remind(i){let a=get(K.tasks),d=prompt("Date YYYY-MM-DD",new Date().toISOString().slice(0,10)),t=prompt("Time HH:MM","09:00");if(!d||!t)return;let when=new Date(d+"T"+t);if(when<=new Date())return msg("Choose future time");setTimeout(()=>notify("Task reminder",a[i].text),when-Date.now());msg("Reminder saved")}

async function notify(title,body){if("Notification"in window){if(Notification.permission=="default")await Notification.requestPermission();if(Notification.permission=="granted")new Notification(title,{body})}msg(body)}

function photoBind(m){
if(m=="quality"){pf.onchange=()=>loadPhoto(pf.files[0],i=>photoImg=i);low.onclick=()=>makeQuality(.35);high.onclick=()=>makeQuality(1);ps.onclick=()=>makeQuality(1)}
if(m=="delete"){df.onchange=()=>loadPhoto(df.files[0],drawCanvas);ds.onclick=deleteSubject}
if(m=="create")cs.onclick=()=>{cr.innerHTML="<p>Making.......</p>";setTimeout(()=>{let c=document.createElement("canvas"),x=c.getContext("2d");c.width=800;c.height=500;x.fillStyle="#181a20";x.fillRect(0,0,800,500);x.fillStyle="#fff";x.textAlign="center";x.font="35px Arial";x.fillText(cp.value,400,250);let u=c.toDataURL();cr.innerHTML=`<p>Your photo is ready</p><img class="preview" src="${u}"><button onclick="downloadImg('${u}')">Download photo</button><button onclick="cr.innerHTML=''">Delete</button>`},600)}
}

function makeQuality(q){if(!photoImg)return msg("Upload your photo first");let c=document.createElement("canvas");c.width=photoImg.width*q;c.height=photoImg.height*q;c.getContext("2d").drawImage(photoImg,0,0,c.width,c.height);let u=c.toDataURL("image/jpeg",q);pr.innerHTML=`<p>Your photo is ready</p><img class="preview" src="${u}"><button onclick="downloadImg('${u}')">Download photo</button><button onclick="pr.innerHTML=''">Delete</button>`}

function drawCanvas(img){dc.width=Math.min(img.width,800);dc.height=img.height*(dc.width/img.width);dc.getContext("2d").drawImage(img,0,0,dc.width,dc.height);dc.onpointerdown=e=>{points=[[e.offsetX,e.offsetY]]};dc.onpointermove=e=>{if(!points.length)return;points.push([e.offsetX,e.offsetY]);let x=dc.getContext("2d"),p=points.at(-2),q=points.at(-1);x.strokeStyle="red";x.lineWidth=3;x.beginPath();x.moveTo(...p);x.lineTo(...q);x.stroke()};dc.onpointerup=()=>{}}

function deleteSubject(){if(points.length<3)return msg("Draw around subject first");let x=dc.getContext("2d"),p=points;x.save();x.beginPath();x.moveTo(...p[0]);p.slice(1).forEach(q=>x.lineTo(...q));x.closePath();x.clip();x.fillStyle="#777";x.fillRect(0,0,dc.width,dc.height);x.restore();dr.innerHTML=`<p>Your photo is ready</p><img class="preview" src="${dc.toDataURL()}"><button onclick="downloadImg('${dc.toDataURL()}')">Download photo</button><button onclick="dr.innerHTML=''">Delete</button>`;points=[]}

function downloadImg(u){let a=document.createElement("a");a.href=u;a.download="photo.png";a.click()}

function renderNavAndPage(){navRender();render()}

document.addEventListener("keydown",e=>{if(e.key=="Escape"&&page!="home"){page="home";renderNavAndPage()}});

function tick(){
  if(clock)clock.textContent=new Date().toLocaleTimeString([],{
    hour:"2-digit",
    minute:"2-digit",
    second:"2-digit"
  });

  let a=get(K.alarms),
      now=new Date(),
      t=now.toTimeString().slice(0,5),
      changed=false;

  a.forEach(x=>{
    if(x.time===t && x.last!==now.toDateString()){
      x.last=now.toDateString();
      changed=true;

      notify(
        "Alarm",
        "بیپ بیپ\nبوپ بوپ\nبیپ بیپ"
      );

      if(x.count!=="forever"){
        x.count=Number(x.count)-1;

        if(x.count<=0){
          a.splice(a.indexOf(x),1);
        }
      }
    }
  });

  if(changed)put(K.alarms,a);
}

async function init(){
  css();
  await loadPosts();
  navRender();
  render();
  setInterval(tick,1000);
}

if(document.readyState==="loading"){
  document.addEventListener(
    "DOMContentLoaded",
    init,
    {once:true}
  );
}else{
  init();
}
