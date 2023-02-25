import jql from "../index.js";
import {createElementFromHtmlString, element2DOM, insertPositions} from "./DOM.js";
import {IS, logTime, isVisible} from "./JQLExtensionHelpers.js";
import {logStyling} from "./EmbedResources.js";
let logSystem = false;
let useLogging = false;
let log2Console = true;
let reverseLogging = false;
let useHtml = true;
const setStyling4Log = setStyle => {
  logStyling?.forEach(selector => setStyle(selector));
};
let logBox = () => document.querySelector(`#jql_logger`);
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
    const logLine = arg => `${IS(arg, Object) ? JSON.stringify(arg, null, 2) : arg}\n`;
    args.forEach( arg => log2Console
      ? console.log(decodeForConsole(arg))
      : logBox().insertAdjacentHTML(
          reverseLogging ? `afterbegin` : `beforeend`,
          `${logTime()} ${logLine(arg.replace(/\n/g, `<br>`))}`)
    );
};
const logActive = {
  on() {  useLogging = true; Log(`Logging activated`); },
  off() { useLogging = false; console.log(`Logging deactivated`) },
}
const setSystemLog = {
  on() { logSystem = true; },
  off() { logSystem = false; },
};
const systemLog = (...logTxt) => logSystem && Log(...logTxt);
const debugLog = {
  isOn: () => useLogging,
  isVisible: () => isVisible(logBox()),
  on: () => {
    logActive.on();
    setSystemLog.on();
    if (!log2Console) {
      const box = logBox() || createLogElement();
      box?.parentNode["classList"].add(`visible`);
    }
    Log(`Debug logging started. Every call to [jql instance] is logged (${
      reverseLogging ? `ascending: latest last` : `descending: latest first`}).`);
    return debugLog;
  },
  off: () => {
    if (logBox()) {
      setSystemLog.off();
      Log(`Debug logging stopped`);
      logBox().parentNode.classList.remove(`visible`);
    }
    logActive.off();
    return debugLog;
  },
  toConsole: {
    on: () => {
      log2Console = true;
      Log(`Debug logging to console activated`);
      return debugLog;
    },
    off() {
      log2Console = false;
      Log(`Debug logging to document activated`);
      return debugLog;
    }
  },
  remove: () => {
    logActive.off();
    setSystemLog.off();
    logBox()?.remove();
    console?.clear();
    console.log(`${logTime()} logging completely disabled and all entries removed`);
    return debugLog;
  },
  hide: () => logBox()?.parentNode.classList.remove(`visible`),
  show: () => logBox()?.parentNode.classList.add(`visible`),
  reversed: {
    on: () => {
      reverseLogging = true;
      Log(`Reverse logging reset: now logging bottom to top (latest first)`);
      return debugLog;
    },
    off: () => {
      reverseLogging = false;
      Log(`Reverse logging reset: now logging top to bottom (latest last)`);
      return debugLog;
    },
  },
  clear: () => {
    jql(`#jql_logger`)?.text(``);
    console.clear();
    Log(`Logging cleared`);
    return debugLog;
  }
};

export { Log, debugLog, systemLog };