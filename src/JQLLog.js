import {createElementFromHtmlString, element2DOM, insertPositions} from "./DOM.js";
import {time, isVisible} from "./JQLExtensionHelpers.js";
import jql from "../index.js";

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
const defaultStyling = defaultLogStyles();
let logSystem = false;
let useLogging = false;
let log2Console = false;
let reverseLogging = true;
let logBox = () => document.querySelector(`#jql_logger`);
const setStyling4Log = (styles = defaultStyling) => {
  const setStyle = jql.createStyle(`JQLLogCSS`);
  styles.forEach(selector => setStyle(selector));
}
let useHtml = true;
const createLogElement = () => {
  setStyling4Log();
  const jql_logger_element = useHtml ? `div` : `pre`;
  const loggingFieldSet = `
    <div id="logBox">
      <div class="legend">
        <div></div>
      </div>
      <${jql_logger_element} id="jql_logger"></${jql_logger_element}>
    </div>`;
  element2DOM(createElementFromHtmlString(loggingFieldSet), undefined, insertPositions.AfterBegin);
  return document.querySelector(`#jql_logger`);
};
const decodeForConsole = something => something.constructor === String &&
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

export { Log, debugLog, setSystemLogActiveState, systemLog };

function defaultLogStyles() {
  return [
    `#logBox {
      min-width: 0px;
      max-width: 0px;
      min-height: 0px;
      max-height: 0px;,
      width: 0;
      height: 0;
      z-index: -1;
      border: none;
      padding: 0px;
      overflow: hidden;
      transition: all 0.3s ease;
      position: fixed;
    }`,
    `#logBox.visible {
      background-color: rgb(255, 255, 224);
      z-index: 1;
      position: static;
      border: 1px dotted rgb(153, 153, 153);
      max-width: 33vw;
      min-width: 30vw;
      min-height: 10vh;
      max-height: 90vh;
      overflow: auto;
      width: 50vw;
      height: 20vh;
      margin: 1rem 0px;
      padding: 0px 8px 19px;
      resize: both;
    }`,
    `@media screen and (min-width: 320px) and (max-width: 1024px) {
      #logBox.visible: {
        max-width: 90vw;
        width: 90vw;
        resize: none;
      }
    }`,
    `#logBox .legend {
      text-align: center;
      position: absolute;
      margin-top: -1em;
      width: inherit;
      max-width: inherit;
    }`,
    `#logBox .legend div {
      text-align: center;
      display: inline-block;
      max-width: inherit;
      height: 1.2rem;
      background-color: rgb(119, 119, 119);
      padding: 2px 10px;
      color: rgb(255, 255, 255);
      box-shadow: rgb(119 119 119) 2px 1px 10px;
      border-radius: 4px;
    }`,
    `#logBox .legend div:before {
      content: 'JQL Logging';
    }`,
    `#logBox #jql_logger {
      marginTop: 0.7rem;
      lineHeight: 1.4em;
      fontFamily: consolas, monospace;
      whiteSpace: pre-wrap;
      maxWidth: inherit;
    }`
  ];
}