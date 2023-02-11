import {  createElementFromHtmlString, element2DOM, insertPositions } from "./DOM.js";
import allMethods from "./JQLMethods.js";
import { debugLog, Log, setSystemLogActiveState, systemLog } from "./JQLLog.js";
import popupFactory from "./Popup.js";
import HandleFactory from "./HandlerFactory.js";
import styleFactory from "../LifeCSS/index.js";
const exts = allMethods.instanceExtensions;
const loops = allMethods.straigthLoops;
const pad0 = (nr, n=2) => `${nr}`.padStart(n, `0`);
const ISOneOf = (obj, ...params) => !!params.find( param => IS(obj, param) );
const IS = (obj, ...shouldBe) => {
  if (shouldBe.length > 1) { return ISOneOf(obj, ...shouldBe); }
  shouldBe = shouldBe.shift();
  const invalid = `Invalid parameter(s)`;
  const self = obj === 0 ? Number : obj === `` ? String :
    !obj ? {name: invalid} : Object.getPrototypeOf(obj)?.constructor;
  return shouldBe ? shouldBe === self?.__proto__ || shouldBe === self : self?.name ?? invalid;
};
const isCommentOrTextNode = elem => IS(elem, Comment, Text);
const isNode = input => IS(input, Text, HTMLElement, Comment);
const isHtmlString = input => IS(input, String) && /^<|>$/.test(`${input}`.trim());
const isArrayOfHtmlStrings = input => IS(input, Array) && !input?.find(s => !isHtmlString(s));
const isArrayOfHtmlElements = input => IS(input, Array) && !input?.find(el => !isNode(el));
const ElemArray2HtmlString = elems => elems?.filter(el => el)
  .reduce((acc, el) => acc.concat(isCommentOrTextNode(el) ? el.textContent : el.outerHTML), ``);
const input2Collection = input => !input ? []
    : IS(input, NodeList) ? [...input]
      : isNode(input) ? [input]
        : isArrayOfHtmlElements(input) ? input
          : input.isJQL ? input.collection : undefined;
const setCollectionFromCssSelector = (input, root, self) => {
  const selectorRoot = root !== document.body &&
      (IS(input, String) && input.toLowerCase() !== "body") ? root : document;
  let errorStr = undefined;

  try {
    self.collection = [...selectorRoot.querySelectorAll(input)];
  } catch (err) {
    errorStr =  `Invalid CSS querySelector. [${input}]`;
  }

  return errorStr ??
    `(JQL log) css querySelector [${input}], output ${self.collection.length} element(s)`;
};
const proxify = instance => {
  const runExt = method => (...args) =>
    IS(method, Function) && method(proxify(instance), ...args);
  const runLoop = method => (...args) =>
    IS(method, Function) && loop(proxify(instance), el => method(el, ...args));
  const method2RunTrial = name => loops[name] && runLoop(loops[name]) || exts[name] && runExt(exts[name]);
  const proxyMe = { get: (obj, name) => method2RunTrial(name) ??
      (IS(+name, Number) ? obj.collection?.[name] : obj[name]) };
  return new Proxy( instance, proxyMe ); };
const randomString = (() => {
  const characters = [...Array(26)]
    .map((x, i) => String.fromCharCode(i + 65))
    .concat([...Array(26)].map((x, i) => String.fromCharCode(i + 97)))
    .concat([...Array(10)].map((x, i) => `${i}`));
  const getCharacters = excludes =>
    excludes && characters.filter(c => !~excludes.indexOf(c)) || characters;
  const random = (len = 12, excludes = []) => {
    const chars = getCharacters(excludes);
    return [...Array(len)]
      .map(() => chars[Math.floor(Math.random() * chars.length)])
      .join("");
  };

  return {
    random,
    randomHtmlElementId: (len = 12, excludes = []) => {
      const charsWithoutNumbers = getCharacters(excludes.concat('0123456789'.split("")));
      const firstChr = charsWithoutNumbers[Math.floor(Math.random() * charsWithoutNumbers.length)];
      return firstChr.concat(random(len - 1, excludes));
    },
  };
})();
const toDashedNotation = str2Convert =>
  str2Convert
    .replace(/[A-Z]/g, a => `-${a.toLowerCase()}`)
    .replace(/^-|-$/, ``);
const loop = (instance, callback) => {
  const cleanCollection = instance.collection.filter(el => !isCommentOrTextNode(el))
  for (let i = 0; i < cleanCollection.length; i += 1) {
    callback(cleanCollection[i], i);
  }
  return instance;
};
const inject2DOMTree = (collection = [], root = document.body, position = insertPositions.BeforeEnd) =>
  collection.reduce((acc, elem) => {
    const created = isNode(elem) && element2DOM(elem, root, position);
    return created ? [...acc, created] : acc;
  }, []);
const addHandlerId = instance => {
  const handleId = instance.first().dataset.hid || randomString.random(8);
  instance.setData({hid: handleId});
  return `[data-hid="${handleId}"]`;
};
const isVisible = function (el) {
  if (!el) { return false; }
  const elStyle = el.style;
  const computedStyle = getComputedStyle(el);
  const invisible = [elStyle.visibility, computedStyle.visibility].includes("hidden");
  const noDisplay = [elStyle.display, computedStyle.display].includes("none");
  const offscreen = el.offsetTop < 0 ||
    (el.offsetLeft + el.offsetWidth) < 0 ||
    el.offsetLeft > document.body.offsetWidth;
  const noOpacity = +computedStyle.opacity === 0 || +(elStyle.opacity || 1) === 0;
  return !(offscreen || noOpacity || noDisplay || invisible);
};
const getAllDataAttributeValues = el => {
  const getKey = attr => attr.nodeName.slice(attr.nodeName.indexOf(`-`) + 1);
  const data = [...el.attributes]
    .filter(da => da.nodeName.startsWith(`data-`))
    .reduce((acc, val) =>
      ({...acc, [getKey(val)]: val.nodeValue}), {});
  return Object.keys(data).length && data || undefined;
};

const truncateHtmlStr = (str, maxLength = 120) => str.trim()
  .slice(0, maxLength)
  .replace(/>\s+</g, `><`)
  .replace(/</g, `&lt;`)
  .replace(/\s{2,}/g, ` `)
  .replace(/\n/g, `\\n`) + (str.length > maxLength ? `&hellip;` : ``).trim();

const truncate2SingleStr = (str, maxLength = 120) =>
  truncateHtmlStr(str, maxLength).replace(/&lt;/g, `<`).replace(/&hellip;/g, `...`);
const time = () => ((d) =>
  `[${pad0(d.getHours())}:${pad0(d.getMinutes())}:${
    pad0(d.getSeconds())}.${pad0(d.getMilliseconds(), 3)}]`)(new Date());
const hex2Full = hex => {
  hex = (hex.trim().startsWith("#") ? hex.slice(1) : hex).trim();
  return hex.length === 3 ? [...hex].map(v => v + v).join("") : hex;
};
const hex2RGBA = function (hex, opacity = 100) {
  hex = hex2Full(hex.slice(1));
  const op = opacity % 100 !== 0;
  return `rgb${op ? "a" : ""}(${
    parseInt(hex.slice(0, 2), 16)}, ${
    parseInt(hex.slice(2, 4), 16)}, ${
    parseInt(hex.slice(-2), 16)}${op ? `, ${opacity / 100}` : ""})`;
};
const defaultStaticMethods = {
  debugLog,
  log: Log,
  setSystemLogActiveState,
  insertPositions,
  text: (str, isComment = false) => isComment ? document.createComment(str) : document.createTextNode(str),
  node: (selector, root = document.body) => document.querySelector(selector, root),
  nodes: (selector, root = document.body) => document.querySelectorAll(selector, root),
};
const addJQLStatics = $ => {
  const virtual = html => $(html, document.createElement("br"));
  const setStyle = styleFactory( { createWithId: `JQLStylesheet` } );
  const createStyle = id => styleFactory( { createWithId: id } );
  const handle = HandleFactory($);
  const delegate = (type, origin, ...handlers) => {
    if (IS(origin, Function)) {
      handlers.push(origin);
      return handle(null, type, null, ...handlers);
    }
    return handle(null, type, origin, ...handlers);
  };
  const staticMethods = {
    ...defaultStaticMethods,
    setStyle,
    createStyle,
    virtual,
    handle,
    popup: () => popupFactory($),
    delegate: (type, origin, ...handlers) => {
      if (IS(origin, Function)) {
        handlers.push(origin);
        return handle(null, type, null, ...handlers);
      }
      return handle(null, type, origin, ...handlers);
    },
  };
  Object.entries(staticMethods).forEach(([name, method]) => $[name] = method);
  return $;
};

export {
  loop,
  hex2RGBA,
  isVisible,
  addHandlerId,
  isHtmlString,
  isNode,
  time,
  toDashedNotation,
  randomString,
  isArrayOfHtmlStrings,
  isArrayOfHtmlElements,
  isCommentOrTextNode,
  inject2DOMTree,
  ElemArray2HtmlString,
  input2Collection,
  setCollectionFromCssSelector,
  truncateHtmlStr,
  truncate2SingleStr,
  proxify,
  addJQLStatics,
  createElementFromHtmlString,
  insertPositions,
  systemLog,
  IS,
};
