"use strict";

const nav = document.getElementById("mainNav");
const app = document.getElementById("app");
const clock = document.getElementById("liveClock");
const toast = document.getElementById("toast");

let page = "home";
let toastTimer = null;

const pages = [
    ["home", "Home"],
    ["calculator", "Calculator"],
    ["converter", "Converter"],
    ["stopwatch", "Stopwatch"],
    ["about", "About"]
];

function showToast(text) {
    if (!toast) return;

    clearTimeout(toastTimer);
    toast.textContent = text;
    toast.classList.add("show");

    toastTimer = setTimeout(() => {
        toast.classList.remove("show");
    }, 2200);
}

function updateClock() {
    if (!clock) return;

    clock.textContent = new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit"
    });
}

function renderNav() {
    if (!nav) return;

    nav.innerHTML = pages.map(function (item) {
        return `
            <button class="navButton ${page === item[0] ? "active" : ""}"
                data-page="${item[0]}">
                ${item[1]}
            </button>
        `;
    }).join("");

    nav.querySelectorAll("[data-page]").forEach(function (button) {
        button.onclick = function () {
            page = button.dataset.page;
            renderNav();
            render();
        };
    });
}

function homePage() {
    return `
        <section class="utilityPage">

            <div class="card">
                <h1>Barmaan Utility</h1>
                <p>Welcome to Barmaan Utility.</p>
                <p>Fast, simple and useful tools.</p>
            </div>

            <div class="grid">

                <button class="toolCard" data-open="calculator">
                    <strong>Calculator</strong>
                    <span>Quick calculations</span>
                </button>

                <button class="toolCard" data-open="converter">
                    <strong>Converter</strong>
                    <span>Convert common units</span>
                </button>

                <button class="toolCard" data-open="stopwatch">
                    <strong>Stopwatch</strong>
                    <span>Simple accurate timer</span>
                </button>

                <button class="toolCard" data-action="time">
                    <strong>Current Time</strong>
                    <span>Show device time</span>
                </button>

            </div>

        </section>
    `;
}

function calculatorPage() {
    return `
        <section class="utilityPage">

            <div class="card">

                <h1>Calculator</h1>

                <input
                    id="calcInput"
                    type="text"
                    inputmode="decimal"
                    autocomplete="off"
                    placeholder="Example: 12 * 8">

                <button id="calcButton" class="primaryButton">
                    Calculate
                </button>

                <div id="calcResult" class="result">
                    Result will appear here
                </div>

            </div>

        </section>
    `;
}

function calculate() {
    const input = document.getElementById("calcInput");
    const result = document.getElementById("calcResult");

    if (!input || !result) return;

    const value = input.value.trim();

    if (!value) {
        result.textContent = "Enter a calculation.";
        return;
    }

    if (!/^[0-9+\-*/().%\s]+$/.test(value)) {
        result.textContent = "Invalid calculation.";
        return;
    }

    try {
        const answer = Function(
            '"use strict"; return (' + value + ')'
        )();

        if (typeof answer !== "number" || !Number.isFinite(answer)) {
            result.textContent = "Invalid result.";
            return;
        }

        result.textContent = answer;
    } catch (error) {
        result.textContent = "Invalid calculation.";
    }
}

function converterPage() {
    return `
        <section class="utilityPage">

            <div class="card">

                <h1>Converter</h1>

                <input
                    id="convertValue"
                    type="number"
                    inputmode="decimal"
                    placeholder="Enter value">

                <select id="convertType">

                    <option value="km-mi">Kilometers → Miles</option>
                    <option value="mi-km">Miles → Kilometers</option>
                    <option value="kg-lb">Kilograms → Pounds</option>
                    <option value="lb-kg">Pounds → Kilograms</option>
                    <option value="c-f">Celsius → Fahrenheit</option>
                    <option value="f-c">Fahrenheit → Celsius</option>
                    <option value="cm-in">Centimeters → Inches</option>
                    <option value="in-cm">Inches → Centimeters</option>

                </select>

                <button id="convertButton" class="primaryButton">
                    Convert
                </button>

                <div id="convertResult" class="result">
                    Result will appear here
                </div>

            </div>

        </section>
    `;
}

function convert() {
    const input = document.getElementById("convertValue");
    const type = document.getElementById("convertType");
    const result = document.getElementById("convertResult");

    if (!input || !type || !result) return;

    const value = Number(input.value);

    if (!Number.isFinite(value)) {
        result.textContent = "Enter a valid number.";
        return;
    }

    let answer = 0;
    let unit = "";

    switch (type.value) {

        case "km-mi":
            answer = value * 0.621371;
            unit = "mi";
            break;

        case "mi-km":
            answer = value * 1.609344;
            unit = "km";
            break;

        case "kg-lb":
            answer = value * 2.2046226218;
            unit = "lb";
            break;

        case "lb-kg":
            answer = value * 0.45359237;
            unit = "kg";
            break;

        case "c-f":
            answer = value * 9 / 5 + 32;
            unit = "°F";
            break;

        case "f-c":
            answer = (value - 32) * 5 / 9;
            unit = "°C";
            break;

        case "cm-in":
            answer = value / 2.54;
            unit = "in";
            break;

        case "in-cm":
            answer = value * 2.54;
            unit = "cm";
            break;
    }

    answer = Math.round(answer * 100000) / 100000;
    result.textContent = answer + " " + unit;
}

let stopwatchRunning = false;
let stopwatchStart = 0;
let stopwatchElapsed = 0;
let stopwatchFrame = null;

function stopwatchPage() {
    return `
        <section class="utilityPage">

            <div class="card">

                <h1>Stopwatch</h1>

                <div id="stopwatchDisplay" class="stopwatchDisplay">
                    00:00.000
                </div>

                <div class="buttonRow">

                    <button id="stopwatchStart" class="primaryButton">
                        Start
                    </button>

                    <button id="stopwatchReset" class="secondaryButton">
                        Reset
                    </button>

                </div>

            </div>

        </section>
    `;
}

function formatTime(ms) {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    const milliseconds = Math.floor(ms % 1000);

    return (
        String(minutes).padStart(2, "0") +
        ":" +
        String(seconds).padStart(2, "0") +
        "." +
        String(milliseconds).padStart(3, "0")
    );
}

function updateStopwatch() {
    const display = document.getElementById("stopwatchDisplay");

    if (!display) {
        stopwatchFrame = null;
        return;
    }

    let elapsed = stopwatchElapsed;

    if (stopwatchRunning) {
        elapsed =
            stopwatchElapsed +
            performance.now() -
            stopwatchStart;
    }

    display.textContent = formatTime(elapsed);

    if (stopwatchRunning) {
        stopwatchFrame =
            requestAnimationFrame(updateStopwatch);
    }
}

function toggleStopwatch() {
    const button =
        document.getElementById("stopwatchStart");

    if (!button) return;

    if (!stopwatchRunning) {

        stopwatchRunning = true;
        stopwatchStart = performance.now();

        button.textContent = "Pause";

        updateStopwatch();

    } else {

        stopwatchElapsed +=
            performance.now() -
            stopwatchStart;

        stopwatchRunning = false;

        button.textContent = "Start";

        if (stopwatchFrame !== null) {
            cancelAnimationFrame(stopwatchFrame);
            stopwatchFrame = null;
        }

        updateStopwatch();
    }
}

function resetStopwatch() {
    stopwatchRunning = false;
    stopwatchStart = 0;
    stopwatchElapsed = 0;

    if (stopwatchFrame !== null) {
        cancelAnimationFrame(stopwatchFrame);
        stopwatchFrame = null;
    }

    const display =
        document.getElementById("stopwatchDisplay");

    const button =
        document.getElementById("stopwatchStart");

    if (display) {
        display.textContent = "00:00.000";
    }

    if (button) {
        button.textContent = "Start";
    }
}

function aboutPage() {
    return `
        <section class="utilityPage">

            <div class="card">

                <h1>About</h1>

                <p>Barmaan Utility</p>
                <p>Barmaan Vebs UI</p>

                <p>
                    A lightweight utility interface
                    for everyday tools.
                </p>

            </div>

        </section>
    `;
}

function render() {
    if (!app) return;

    if (page !== "stopwatch" && stopwatchRunning) {

        stopwatchElapsed +=
            performance.now() -
            stopwatchStart;

        stopwatchRunning = false;

        if (stopwatchFrame !== null) {
            cancelAnimationFrame(stopwatchFrame);
            stopwatchFrame = null;
        }
    }

    switch (page) {

        case "calculator":
            app.innerHTML = calculatorPage();
            break;

        case "converter":
            app.innerHTML = converterPage();
            break;

        case "stopwatch":
            app.innerHTML = stopwatchPage();
            break;

        case "about":
            app.innerHTML = aboutPage();
            break;

        default:
            app.innerHTML = homePage();
            break;
    }

    bindEvents();
}

function bindEvents() {

    app.querySelectorAll("[data-open]")
        .forEach(function (button) {

            button.onclick = function () {

                page = button.dataset.open;

                renderNav();
                render();
            };
        });

    const timeButton =
        app.querySelector('[data-action="time"]');

    if (timeButton) {

        timeButton.onclick = function () {
            showToast(
                new Date().toLocaleTimeString()
            );
        };
    }

    const calcButton =
        document.getElementById("calcButton");

    const calcInput =
        document.getElementById("calcInput");

    if (calcButton) {
        calcButton.onclick = calculate;
    }

    if (calcInput) {

        calcInput.onkeydown = function (event) {

            if (event.key === "Enter") {
                calculate();
            }
        };
    }

    const convertButton =
        document.getElementById("convertButton");

    if (convertButton) {
        convertButton.onclick = convert;
    }

    const startButton =
        document.getElementById("stopwatchStart");

    const resetButton =
        document.getElementById("stopwatchReset");

    if (startButton) {
        startButton.onclick = toggleStopwatch;
    }

    if (resetButton) {
        resetButton.onclick = resetStopwatch;
    }
}

document.addEventListener("keydown", function (event) {

    if (
        event.key === "Escape" &&
        page !== "home"
    ) {

        page = "home";

        renderNav();
        render();
    }
});

document.addEventListener(
    "visibilitychange",
    function () {

        if (!document.hidden) {
            updateClock();
        }
    }
);

function init() {

    if (!nav || !app || !clock) {
        console.error(
            "Barmaan Utility: HTML elements are missing."
        );
        return;
    }

    renderNav();
    render();
    updateClock();

    setInterval(updateClock, 1000);
}

if (document.readyState === "loading") {

    document.addEventListener(
        "DOMContentLoaded",
        init,
        { once: true }
    );

} else {

    init();

}
