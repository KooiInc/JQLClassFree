/*
  This is a classfree object oriented version of JQL
  see https://github.com/KooiInc/JQL
  nou fijn
*/

/* region imports */
import {
  createElementFromHtmlString,
  insertPositions,
} from "./src/DOM.js";

import {
  isHtmlString,
  isArrayOfHtmlStrings,
  isArrayOfHtmlElements,
  inject2DOMTree,
  ElemArray2HtmlString,
  input2Collection,
  setCollectionFromCssSelector,
  truncateHtmlStr,
  loop
} from "./src/JQLExtensionHelpers.js";

import {
  debugLog,
  Log, } from "./src/JQLLog.js";

import JQLMethods from "./src/JQLMethods.js";
import popupFactory from "./src/Popup.js";
import handling from "./src/HandlerFactory.js";
/* endregion imports */

/* region MAIN */
const exts = JQLMethods.instanceExtensions;
const loops = JQLMethods.straigthLoops;
let logSystem = false;
const logLineLength = 80;
const styleFactory = (await import("https://kooiinc.github.io/LifeCSS/index.js")).default;
const setStyle = styleFactory({createWithId: `JQLStylesheet`});
const createStyle = id => styleFactory({createWithId: id});
let JQL = {
  $: JQLFactory(),
  setStyle,
  createStyle,
  debugLog,
  log: Log,
  setSystemLogActiveState: activeState => logSystem = activeState,
};
const { $ }= JQL;
const virtual = html => $(html, document.createElement("br"));
const proxify = instance => {
  const runExt =(method) => (...args) =>
    method && method instanceof Function && method(proxify(instance), ...args);
  const runLoop = (method) => (...args) =>
    method && method instanceof Function && loop(proxify(instance), el => method(el, ...args));
  const proxyMe = { get(obj, name) {
      return loops[name] ?
        runLoop(loops[name]) : exts[name] ?
        runExt(exts[name]) : obj[name]; } };
  return new Proxy( instance, proxyMe ); };
const staticMethods = {
  setStyle,
  createStyle,
  virtual,
  insertPositions,
  popup: () => popupFactory($),
  text: (str, isComment = false) => isComment ? document.createComment(str) : document.createTextNode(str),
  node: (selector, root = document.body)  => document.querySelector(selector, root),
  nodes: (selector, root = document.body) => document.querySelectorAll(selector, root),
  delegate: (type, origin, ...handlers) => {
    if (!origin || origin instanceof Function) {
      origin instanceof Function && handlers.push(origin);
      return handling(null, type, null, ...handlers);
    }
    return handling(null, type, origin, ...handlers);
  },
};
Object.entries(staticMethods).forEach( ([name, method]) => JQL.$[name] = method);

export default JQL;
/* endregion MAIN */

/* region factory */
function JQLFactory() {
  return instantiate;

  function instantiate(input, root = document.body, position = insertPositions.BeforeEnd) {
    const isRawHtml = isHtmlString(input);
    const isRawHtmlArray = isArrayOfHtmlStrings(input);
    const shouldCreateElements = !(root instanceof HTMLBRElement) && isRawHtmlArray || isRawHtml;
    let instance = {
      collection: input2Collection(input) ?? [],
      isVirtual: root instanceof HTMLBRElement,
      setStyle,
      virtual,
      isJQL: true,
      insertPositions,
    };

    const isRawElemCollection = isArrayOfHtmlElements(instance.collection);

    const logStr = (`(JQL log) raw input: [${
      truncateHtmlStr(isRawHtmlArray
        ? input.join(``)
        : isRawElemCollection ? `Element(s): ${instance.collection.map(el => el.outerHTML || el.textContent).join(``)}`
          : input, logLineLength)}]`);

    if (instance.collection.length && isRawElemCollection) {
      logSystem && Log(logStr);
      return proxify(instance);
    }

    if (shouldCreateElements) {
      [input].flat()
        .forEach(htmlFragment => instance.collection.push(createElementFromHtmlString(htmlFragment)));
    }

    if (shouldCreateElements && instance.collection.length > 0) {
      const errors = instance.collection.filter( el => el.dataset?.jqlcreationerror );
      instance.collection = instance.collection.filter(el => !el.dataset?.jqlcreationerror);

      logSystem && Log(`${logStr}\n  Created ${instance.isVirtual ? ` VIRTUAL` : ``} (outerHTML truncated) [${
        truncateHtmlStr(ElemArray2HtmlString(instance.collection) ||
          "sanitized: no elements remaining", logLineLength)}]`);

      errors.length && console.error(`JQL: not rendered illegal html: "${
        errors.reduce( (acc, el) => acc.concat(`${el.textContent}\n`), ``).trim()}"` );

      if (!instance.isVirtual) {
        inject2DOMTree(instance.collection, root, position);
      }

      errors.length && console.error(`JQL: not rendered illegal html: "${
        errors.reduce( (acc, el) => acc.concat(`${el.textContent}\n`), ``).trim()}"` );

      return proxify(instance);
  }

    const forLog = setCollectionFromCssSelector(input, root, instance);
    logSystem && Log(forLog);
    return proxify(instance);
  }
}
/* endregion factory */