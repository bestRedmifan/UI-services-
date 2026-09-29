/* Barmaan Utility - script.js */
"use strict";

const app=document.getElementById("app");
const mainNav=document.getElementById("mainNav");
const liveClock=document.getElementById("liveClock");
const toast=document.getElementById("toast");

const state={
  page:"home",calc:"",
  notes:localStorage.getItem("barmaan_notes")||"",
  timer:0,timerId:null,
  stopwatch:0,stopwatchId:null,
  laps:JSON.parse(localStorage.getItem("barmaan_laps")||"[]"),
  worldClock:false
};

function $(id){return document.getElementById(id)}

function showToast(message){
  toast.textContent=message;
  toast.classList.add("show");
  clearTimeout(showToast.timer);
  showToast.timer=setTimeout(()=>toast.classList.remove("show"),1800);
}

function updateClock(){
  liveClock.textContent=new Date().toLocaleTimeString();
}

function buildNav(){
  mainNav.innerHTML="";
  const pages=[
    ["home","Home"],["calculator","Calculator"],["converter","Converter"],
    ["notes","Notes"],["tools","Tools"]
  ];
  pages.forEach(([id,label])=>{
    const button=document.createElement("button");
    button.textContent=label;
    button.type="button";
    button.addEventListener("click",()=>navigate(id));
    mainNav.appendChild(button);
  });
}

function navigate(page){
  state.page=page;
  render();
}

function render(){
  if(state.page==="home")renderHome();
  if(state.page==="calculator")renderCalculator();
  if(state.page==="converter")renderConverter();
  if(state.page==="notes")renderNotes();
  if(state.page==="tools")renderTools();
}

function renderHome(){
  app.innerHTML=`
    <section class="card">
      <h1>Barmaan Utility</h1>
      <p>Useful offline tools for Barmaan Vebs.</p>
      <button id="openCalc" type="button">Open Calculator</button>
      <button id="openConvert" type="button">Open Converter</button>
    </section>`;
  $("openCalc").onclick=()=>navigate("calculator");
  $("openConvert").onclick=()=>navigate("converter");
}

function renderCalculator(){
  app.innerHTML=`
    <section class="card calculator">
      <h1>Calculator</h1>
      <input id="calcDisplay" type="text" inputmode="text"
        autocomplete="off" spellcheck="false" placeholder="0">
      <div id="calcKeyboard" class="calc-keyboard"></div>
      <button id="calcClear" type="button">Clear</button>
      <button id="calcBack" type="button">Backspace</button>
    </section>`;
  const display=$("calcDisplay"),keyboard=$("calcKeyboard");
  const keys=["7","8","9","/","4","5","6","*","1","2","3","-","0",".","(",")","C","+","=","%"];
  keys.forEach(key=>{
    const button=document.createElement("button");
    button.type="button";
    button.textContent=key;
    button.addEventListener("click",()=>pressCalculatorKey(key));
    keyboard.appendChild(button);
  });
  display.value=state.calc;
  display.addEventListener("input",()=>state.calc=display.value);
  display.addEventListener("keydown",event=>{
    if(event.key==="Enter")calculate();
  });
  $("calcClear").onclick=()=>{
    state.calc="";
    display.value="";
  };
  $("calcBack").onclick=()=>{
    state.calc=state.calc.slice(0,-1);
    display.value=state.calc;
  };
}

function pressCalculatorKey(key){
  const display=$("calcDisplay");
  if(key==="C")state.calc="";
  else if(key==="="){
    calculate();
    return;
  }else state.calc+=key;
  display.value=state.calc;
  display.focus();
}

function calculate(){
  const display=$("calcDisplay");
  const expression=display.value.trim();
  if(!expression)return;
  if(!/^[0-9+\-*/().%\s]+$/.test(expression)){
    showToast("Invalid expression");
    return;
  }
  try{
    const normalized=expression.replace(/(\d+(?:\.\d+)?)%/g,"($1/100)");
    const result=Function(`"use strict"; return (${normalized})`)();
    if(!Number.isFinite(result))throw new Error("Invalid");
    state.calc=String(result);
    display.value=state.calc;
  }catch{
    showToast("Calculation error");
  }
}

function renderConverter(){
  app.innerHTML=`
    <section class="card">
      <h1>Converter</h1>
      <input id="convertValue" type="number" placeholder="Value">
      <select id="convertType">
        <option value="c-f">Celsius → Fahrenheit</option>
        <option value="f-c">Fahrenheit → Celsius</option>
        <option value="km-mi">Kilometers → Miles</option>
        <option value="mi-km">Miles → Kilometers</option>
        <option value="kg-lb">Kilograms → Pounds</option>
        <option value="lb-kg">Pounds → Kilograms</option>
      </select>
      <button id="convertButton" type="button">Convert</button>
      <div id="convertResult">Result: --</div>
    </section>`;
  $("convertButton").onclick=convertValue;
}

function convertValue(){
  const value=Number($("convertValue").value);
  const type=$("convertType").value;
  if(!Number.isFinite(value)){
    showToast("Enter a number");
    return;
  }
  let result;
  if(type==="c-f")result=value*9/5+32;
  if(type==="f-c")result=(value-32)*5/9;
  if(type==="km-mi")result=value*.621371;
  if(type==="mi-km")result=value/.621371;
  if(type==="kg-lb")result=value*2.2046226218;
  if(type==="lb-kg")result=value/2.2046226218;
  $("convertResult").textContent=`Result: ${formatNumber(result)}`;
}

function formatNumber(value){
  return Number(value.toFixed(8)).toString();
}

function renderNotes(){
  app.innerHTML=`
    <section class="card">
      <h1>Notes</h1>
      <textarea id="notesArea" rows="12" placeholder="Write your notes..."></textarea>
      <button id="saveNotes" type="button">Save</button>
      <button id="clearNotes" type="button">Clear</button>
    </section>`;
  $("notesArea").value=state.notes;
  $("saveNotes").onclick=()=>{
    state.notes=$("notesArea").value;
    localStorage.setItem("barmaan_notes",state.notes);
    showToast("Notes saved");
  };
  $("clearNotes").onclick=()=>{
    $("notesArea").value="";
    state.notes="";
    localStorage.removeItem("barmaan_notes");
  };
}

function renderTools(){
  app.innerHTML=`
    <section class="card">
      <h1>Tools</h1>
      <button id="timerTool" type="button">Timer</button>
      <button id="stopwatchTool" type="button">Stopwatch</button>
      <button id="lapTool" type="button">Lap</button>
      <button id="resetLap" type="button" style="display:${state.laps.length?"inline-block":"none"}">Reset Lap</button>
      <button id="worldClockTool" type="button">World Clock</button>
      <div id="toolOutput"></div>
      <div id="lapOutput"></div>
      <div id="worldClockOutput" style="display:none"></div>
    </section>`;
  $("timerTool").onclick=startTimer;
  $("stopwatchTool").onclick=startStopwatch;
  $("lapTool").onclick=addLap;
  $("resetLap").onclick=resetLaps;
  $("worldClockTool").onclick=toggleWorldClock;
  updateToolOutput();
  renderLaps();
}

function startTimer(){
  if(state.timerId){
    clearInterval(state.timerId);
    state.timerId=null;
    showToast("Timer stopped");
    return;
  }
  state.timer=60;
  updateToolOutput();
  state.timerId=setInterval(()=>{
    state.timer--;
    updateToolOutput();
    if(state.timer<=0){
      clearInterval(state.timerId);
      state.timerId=null;
      showToast("Timer finished");
    }
  },1000);
}

function startStopwatch(){
  if(state.stopwatchId){
    clearInterval(state.stopwatchId);
    state.stopwatchId=null;
    showToast("Stopwatch stopped");
    return;
  }
  state.stopwatchId=setInterval(()=>{
    state.stopwatch++;
    updateToolOutput();
  },1000);
}

function addLap(){
  if(state.stopwatch<=0){
    showToast("Start Stopwatch first");
    return;
  }

  const now=new Date();
  const previous=state.laps.length?state.laps[state.laps.length-1].elapsed:0;
  const lap={
    time:now.toLocaleTimeString(),
    elapsed:state.stopwatch,
    difference:state.stopwatch-previous,
    number:state.laps.length+1
  };

  state.laps.push(lap);
  localStorage.setItem("barmaan_laps",JSON.stringify(state.laps));
  renderLaps();

  const reset=$("resetLap");
  if(reset)reset.style.display="inline-block";

  showToast(`Lap ${lap.number} saved`);
}

function resetLaps(){
  state.laps=[];
  localStorage.removeItem("barmaan_laps");
  renderLaps();
  const reset=$("resetLap");
  if(reset)reset.style.display="none";
  showToast("Laps reset");
}

function renderLaps(){
  const output=$("lapOutput");
  if(!output)return;

  if(!state.laps.length){
    output.innerHTML="";
    return;
  }

  output.innerHTML=state.laps.map((lap,index)=>{
    if(index===0){
      return `<div class="lap">
        <strong>The first lap</strong><br>
        ${lap.time}<br>
        ${formatTime(lap.elapsed)}
      </div>`;
    }

    return `<div class="lap">
      ${lap.time}<br>
      ${formatTime(lap.difference)} since previous lap<br>
      Lap ${lap.number}<br>
      ${formatTime(lap.elapsed)}
    </div>`;
  }).join("");
}

function toggleWorldClock(){
  state.worldClock=!state.worldClock;
  const output=$("worldClockOutput");
  if(!output)return;

  output.style.display=state.worldClock?"block":"none";
  if(state.worldClock)updateWorldClock();
}

function updateWorldClock(){
  const output=$("worldClockOutput");
  if(!output||!state.worldClock)return;

  const now=new Date();
  const rows=[];

  for(let offset=-12;offset<=12;offset+=.5){
    const shifted=new Date(now.getTime()+offset*3600000);
    const time=new Intl.DateTimeFormat("en-US",{
      timeZone:"UTC",
      hour:"2-digit",
      minute:"2-digit",
      second:"2-digit",
      hour12:false
    }).format(shifted);

    const sign=offset<0?"-":"+";
    const abs=Math.abs(offset);
    const hours=Math.floor(abs);
    const minutes=Math.round((abs-hours)*60);
    const offsetText=`${sign}${String(hours).padStart(2,"0")}:${String(minutes).padStart(2,"0")} GMT`;

    rows.push(`<div>${offsetText} — ${time}</div>`);
  }

  output.innerHTML=`
    <h2>World Clock</h2>
    ${rows.join("")}`;
}

function updateToolOutput(){
  const output=$("toolOutput");
  if(!output)return;
  output.textContent=
    `Timer: ${state.timer}s | Stopwatch: ${formatTime(state.stopwatch)}`;
}

function formatTime(seconds){
  const h=Math.floor(seconds/3600);
  const m=Math.floor(seconds%3600/60);
  const s=seconds%60;
  return [h,m,s].map(v=>String(v).padStart(2,"0")).join(":");
}

document.addEventListener("keydown",event=>{
  if(state.page!=="calculator")return;
  if(event.target&&event.target.id==="calcDisplay")return;
  const allowed="0123456789+-*/().%";
  if(allowed.includes(event.key)){
    pressCalculatorKey(event.key);
    event.preventDefault();
  }
  if(event.key==="Enter"){
    calculate();
    event.preventDefault();
  }
  if(event.key==="Backspace"){
    const display=$("calcDisplay");
    if(display){
      state.calc=state.calc.slice(0,-1);
      display.value=state.calc;
    }
    event.preventDefault();
  }
});

buildNav();
updateClock();
setInterval(updateClock,1000);
setInterval(updateWorldClock,1000);
render();
