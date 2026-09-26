"use strict";

const $=id=>document.getElementById(id),
nav=$("mainNav"),app=$("app"),toast=$("toast"),clock=$("liveClock");

const S={page:"home",timer:null,sw:{run:false,start:0,elapsed:0,raf:null}};

const pages=[
 ["home","Home"],
 ["calculator","Calculator"],
 ["converter","Converter"],
 ["stopwatch","Stopwatch"],
 ["about","About"]
];

function toastMsg(x,t=2200){
 if(!toast)return;
 clearTimeout(S.timer);
 toast.textContent=x;
 toast.classList.add("show");
 S.timer=setTimeout(()=>toast.classList.remove("show"),t);
}

function clockUpdate(){
 if(clock)clock.textContent=new Date().toLocaleTimeString([],
 {hour:"2-digit",minute:"2-digit",second:"2-digit"});
}

function navRender(){
 nav.innerHTML=pages.map(p=>
 `<button class="navButton ${S.page===p[0]?"active":""}" data-page="${p[0]}">${p[1]}</button>`
 ).join("");

 nav.querySelectorAll("[data-page]").forEach(b=>
 b.onclick=()=>{
  S.page=b.dataset.page;
  navRender();
  render();
 });
}

function home(){
 return `<section class="utilityPage">
 <div class="card"><h1>Barmaan Utility</h1>
 <p>Welcome to Barmaan Utility.</p>
 <p>Fast, simple and useful tools.</p></div>
 <div class="grid">
 <button class="toolCard" data-open="calculator"><strong>Calculator</strong><span>Quick calculations</span></button>
 <button class="toolCard" data-open="converter"><strong>Converter</strong><span>Convert common units</span></button>
 <button class="toolCard" data-open="stopwatch"><strong>Stopwatch</strong><span>Simple accurate timer</span></button>
 <button class="toolCard" data-action="time"><strong>Current Time</strong><span>Show your device time</span></button>
 </div></section>`;
}

function calculator(){
 return `<section class="utilityPage"><div class="card">
 <h1>Calculator</h1>
 <input id="calcInput" type="text" inputmode="decimal" autocomplete="off" placeholder="Example: 12 * 8">
 <button id="calcButton" class="primaryButton">Calculate</button>
 <div id="calcResult" class="result">Result will appear here</div>
 </div></section>`;
}

function calc(){
 const i=$("calcInput"),r=$("calcResult"),x=i.value.trim();
 if(!x)return r.textContent="Enter a calculation.";
 if(!/^[0-9+\-*/().%\s]+$/.test(x))
  return r.textContent="Invalid calculation.";
 try{
  const n=Function('"use strict";return('+x+')')();
  r.textContent=typeof n==="number"&&Number.isFinite(n)?n:"Invalid result.";
 }catch{
  r.textContent="Invalid calculation.";
 }
}

function converter(){
 return `<section class="utilityPage"><div class="card">
 <h1>Converter</h1>
 <label>Value</label>
 <input id="cv" type="number" inputmode="decimal" placeholder="Enter value">
 <label>Conversion</label>
 <select id="ct">
 <option value="km-mi">Kilometers → Miles</option>
 <option value="mi-km">Miles → Kilometers</option>
 <option value="kg-lb">Kilograms → Pounds</option>
 <option value="lb-kg">Pounds → Kilograms</option>
 <option value="c-f">Celsius → Fahrenheit</option>
 <option value="f-c">Fahrenheit → Celsius</option>
 <option value="cm-in">Centimeters → Inches</option>
 <option value="in-cm">Inches → Centimeters</option>
 </select>
 <button id="cb" class="primaryButton">Convert</button>
 <div id="cr" class="result">Result will appear here</div>
 </div></section>`;
}

function convert(){
 const v=Number($("cv").value),t=$("ct").value,r=$("cr");
 if(!Number.isFinite(v))return r.textContent="Enter a valid number.";

 const m={
  "km-mi":[.621371,"mi"],
  "mi-km":[1.609344,"km"],
  "kg-lb":[2.2046226218,"lb"],
  "lb-kg":[.45359237,"kg"],
  "cm-in":[1/2.54,"in"],
  "in-cm":[2.54,"cm"]
 };

 let n,u;

 if(m[t]){n=v*m[t][0];u=m[t][1]}
 else if(t==="c-f"){n=v*9/5+32;u="°F"}
 else if(t==="f-c"){n=(v-32)*5/9;u="°C"}

 n=Math.round(n*1e5)/1e5;
 r.textContent=`${n} ${u}`;
}

function stopwatch(){
 return `<section class="utilityPage"><div class="card">
 <h1>Stopwatch</h1>
 <div id="sd" class="stopwatchDisplay">00:00.000</div>
 <div class="buttonRow">
 <button id="ss" class="primaryButton">Start</button>
 <button id="sr" class="secondaryButton">Reset</button>
 </div></div></section>`;
}

function swFormat(ms){
 const m=Math.floor(ms/60000),
 s=Math.floor(ms%60000/1000),
 x=Math.floor(ms%1000);
 return `${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")}.${String(x).padStart(3,"0")}`;
}

function swUpdate(){
 const d=$("sd");
 if(!d){S.sw.raf=null;return}
 let e=S.sw.elapsed;
 if(S.sw.run)e=performance.now()-S.sw.start+S.sw.elapsed;
 d.textContent=swFormat(e);
 if(S.sw.run)S.sw.raf=requestAnimationFrame(swUpdate);
}

function swToggle(){
 const b=$("ss");
 if(!b)return;

 if(!S.sw.run){
  S.sw.run=true;
  S.sw.start=performance.now();
  b.textContent="Pause";
  swUpdate();
 }else{
  S.sw.elapsed+=performance.now()-S.sw.start;
  S.sw.run=false;
  b.textContent="Start";
  cancelAnimationFrame(S.sw.raf);
  S.sw.raf=null;
  swUpdate();
 }
}

function swReset(){
 S.sw.run=false;
 S.sw.start=0;
 S.sw.elapsed=0;
 cancelAnimationFrame(S.sw.raf);
 S.sw.raf=null;
 const d=$("sd"),b=$("ss");
 if(d)d.textContent="00:00.000";
 if(b)b.textContent="Start";
}

function about(){
 return `<section class="utilityPage"><div class="card">
 <h1>About</h1>
 <p>Barmaan Utility</p>
 <p>Barmaan Vebs UI</p>
 <p>A lightweight utility interface designed for simple everyday tools.</p>
 </div></section>`;
}

function render(){
 if(!app)return;

 if(S.page!=="stopwatch"&&S.sw.run){
  S.sw.elapsed+=performance.now()-S.sw.start;
  S.sw.run=false;
  cancelAnimationFrame(S.sw.raf);
  S.sw.raf=null;
 }

 app.innerHTML=
 S.page==="calculator"?calculator():
 S.page==="converter"?converter():
 S.page==="stopwatch"?stopwatch():
 S.page==="about"?about():home();

 bind();
}

function bind(){

 app.querySelectorAll("[data-open]").forEach(b=>
  b.onclick=()=>{
   S.page=b.dataset.open;
   navRender();
   render();
  });

 const tb=app.querySelector('[data-action="time"]');
 if(tb)tb.onclick=()=>toastMsg(new Date().toLocaleTimeString());

 const ci=$("calcInput");
 if($("calcButton"))$("calcButton").onclick=calc;
 if(ci)ci.onkeydown=e=>{if(e.key==="Enter")calc()};

 if($("cb"))$("cb").onclick=convert;

 if($("ss"))$("ss").onclick=swToggle;
 if($("sr"))$("sr").onclick=swReset;
}

document.addEventListener("keydown",e=>{
 if(e.key==="Escape"&&S.page!=="home"){
  S.page="home";
  navRender();
  render();
 }
});

document.addEventListener("visibilitychange",()=>{
 if(!document.hidden)clockUpdate();
});

function init(){
 if(!nav||!app||!clock)return;
 navRender();
 render();
 clockUpdate();
 setTimeout(()=>{
  clockUpdate();
  setInterval(clockUpdate,1000);
 },1000-new Date().getMilliseconds());
}

document.readyState==="loading"
 ?document.addEventListener("DOMContentLoaded",init,{once:true})
 :init();
