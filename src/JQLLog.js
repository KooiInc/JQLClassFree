import jql from "../index.js";
import {createElementFromHtmlString, element2DOM, insertPositions} from "./DOM.js";
import {IS, time, isVisible} from "./JQLExtensionHelpers.js";
let logStyling = await fetch(`../src/Resource/defaultLogStyling.txt`).then(r => r.text()).then(r => r.split(`~RULE~`));
const debugLog = {
  get isOn() { return useLogging; },
  isVisible: () => isVisible(logBox()),
  on() {
    useLogging = true;
    if (!log2Console) {
      const box = logBox() || createLogElement();
      box?.parentNode["classList"].add(`visible`);
    }
    Log(`Logging started (to ${log2Console ? `console` : `document`})`);
  },
  off() {
    if (logBox()) {
      Log(`Logging stopped`);
      logBox()?.parentNode.classList.remove(`visible`);
    }
    useLogging = false;
  },
  toConsole(console = false) {
    log2Console = console;
    useLogging = console;
    console && document.querySelector(`#logBox`)?.remove();
  },
  remove: () => {
    useLogging = false;
    document.querySelector(`#logBox`).remove();
  },
  hide: () => logBox()?.parentNode.classList.remove(`visible`),
  show: () => logBox()?.parentNode.classList.add(`visible`),
  reversed(reverse = true) {
    reverseLogging = reverse;
    Log(`Reverse logging reset: now logging ${
      reverse ? `bottom to top (latest first)` : `top to bottom (latest last)`}`);
  },
  clear() {
    const box = logBox();
    box && (box.textContent = ``);
    Log(`Cleared`);
  }
};
let logSystem = false;
let useLogging = false;
let log2Console = false;
let reverseLogging = true;
let logBox = () => document.querySelector(`#jql_logger`);
let useHtml = true;
const createLogElement = () => {
  if (logStyling) {
    setStyling4Log(jql.createStyle(`JQLLogCSS`));
  }
  const jql_logger_element_name = useHtml ? `div` : `pre`;
  const loggingFieldSet = `<div id="logBox"><div class="legend"><div></div></div><${
    jql_logger_element_name} id="jql_logger"></${jql_logger_element_name}></div>`;
  element2DOM(createElementFromHtmlString(loggingFieldSet), undefined, insertPositions.AfterBegin);
  return document.querySelector(`#jql_logger`);
};
const decodeForConsole = something => IS(something, String) &&
  Object.assign(document.createElement(`textarea`), {innerHTML: something}).textContent ||
  something;
const Log = (...args) => {
    if (!useLogging) { return; }
    if (!log2Console && !logBox()) {
      createLogElement();
    }
    const logLine = arg => `${arg instanceof Object ? JSON.stringify(arg, null, 2) : arg}\n`;
    args.forEach( arg => log2Console
      ? console.log(decodeForConsole(arg))
      : logBox().insertAdjacentHTML(
          reverseLogging ? `afterbegin` : `beforeend`,
          `${time()} ${logLine(arg.replace(/\n/g, `<br>`))}`)
    );
};
const setSystemLogActiveState = tf => logSystem = tf;
const systemLog = (...logTxt) => logSystem && Log(...logTxt);

function setStyling4Log(setStyle) {
  logStyling?.forEach(selector => setStyle(selector));
  logStyling = undefined;
}


export { Log, debugLog, setSystemLogActiveState, systemLog };