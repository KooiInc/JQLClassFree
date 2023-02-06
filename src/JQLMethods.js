import {createElementFromHtmlString, insertPositions} from "./DOM.js";
import {
  hex2RGBA,
  loop,
  addHandlerId,
  isVisible,
  isNode,
  isObjectAndNotArray,
  randomString,
  inject2DOMTree } from "./JQLExtensionHelpers.js";
import handlerFactory from "./HandlerFactory.js";
import jql from "../index.js";

const empty = el => el && (el.textContent = "");
const setData = (el, keyValuePairs) => {
  el && isObjectAndNotArray(keyValuePairs) &&
  Object.entries(keyValuePairs).forEach(([key, value]) => el.dataset[key] = value);
};

const inputElems = [HTMLInputElement, HTMLSelectElement, HTMLTextAreaElement];

const css = (el, keyOrKvPairs, value) => {
  const { setStyle } = jql;
  if (value && keyOrKvPairs.constructor === String) {
    keyOrKvPairs = {[keyOrKvPairs]: value === "-" ? "" : value};
  }

  let nwClass = undefined;

  if (keyOrKvPairs.className) {
    nwClass = keyOrKvPairs.className;
    delete keyOrKvPairs.className;
  }

  const classExists = ([...el.classList].find(c => c.startsWith(`JQLCreated`) || nwClass && c === nwClass));
  nwClass = classExists || nwClass || `JQLCreated_${randomString.randomHtmlElementId(12)}`;
  setStyle(`.${nwClass}`, keyOrKvPairs);
  el.classList.add(nwClass);
};
const assignAttrValues = (el, keyValuePairs) => {
  el && Object.entries(keyValuePairs).forEach(([key, value]) => {
    if (key.startsWith(`data`)) {
      setData(el, {[key]: value});
    }

    if (key.toLowerCase() === "class") {
      value.split(/\s+/).forEach(v => el.classList.add(`${v}`))
    }

    if (value.constructor === String) {
      el[key] = value;
    }
  });
};
const allMethods = {
  straigthLoops: {
    toggleClass: (el, className) => el.classList.toggle(className),
    toggleStyleFragments: (el, keyValuePairs) =>
      el && Object.entries(keyValuePairs).forEach(([key, value]) => {
        if (value instanceof Function) {
          value = value(el);
        }

        if (/color/i.test(key)) {
          value = value.startsWith(`#`)
            ? hex2RGBA(value)
            : value.replace(/(,|,\s{2,})(\w)/g, (...args) => `, ${args[2]}`);
        }

        el.style[key] = `${el.style[key]}` === `${value}` ? "" : value;
      }),
    removeAttr: (el, name) => el && el.removeAttribute(name),
    toggleAttr: (el, name, value) =>
      el && el.hasAttribute(name)
        ? el.removeAttribute(name)
        : el.setAttribute(name, value),
    empty,
    clear: empty,
    replaceClass: (el, className, ...nwClassNames) => {
      el.classList.remove(className);
      nwClassNames.forEach(name => el.classList.add(name))
    },
    removeClass: (el, ...classNames) =>
      classNames.forEach(cn => el.classList.remove(cn)),
    addClass: (el, ...classNames) => el && classNames.forEach(cn => el.classList.add(cn)),
    show: el => el.style.display = ``,
    hide: el => el.style.display = `none`,
    setData,
    assignAttrValues,
    attr(el, keyOrObj, value) {
      if (!el) {
        return true;
      }

      if (value !== undefined) {
        keyOrObj = {[keyOrObj]: value};
      }

      if (!value && keyOrObj.constructor === String) {
        return el.getAttribute(keyOrObj);
      }

      Object.entries(keyOrObj).forEach(([key, value]) => {
        const keyCompare = key.toLowerCase().trim();

        if (keyCompare === `style`) {
          return css(el, value, undefined);
        }

        if (keyCompare === `data`) {
          return setData(el, value);
        }

        if (value instanceof Object) {
          return assignAttrValues(el, value);
        }

        return el.setAttribute(key, value);
      });
    },
    style: (el, keyOrKvPairs, value) => {
      if (value && keyOrKvPairs.constructor === String) {
        keyOrKvPairs = {[keyOrKvPairs]: value || "none"};
      }

      if (!Array.isArray((keyOrKvPairs)) && keyOrKvPairs.constructor === Object) {
        Object.entries(keyOrKvPairs).forEach(([key, value]) => el.style[key] = value);
      }
    },
    css,
  },
  instanceExtensions: {
    text: (self, textValue, append) => {
      if (self.isEmpty()) {
        return self;
      }

      const cb = el => el.textContent = append ? el.textContent + textValue : textValue;

      if (!textValue) {
        return self.first().textContent;
      }

      return loop(self, cb);
    },
    each: (self, cb) => loop(self, cb),
    remove: (self, selector) => {
      const remover = el => el.remove();
      if (selector) {
        const selectedElements = self.find$(selector);
        !selectedElements.isEmpty() && loop(selectedElements, remover);
        return;
      }
      loop(self, remover);
    },
    computedStyle: (self, property) => self.first() && getComputedStyle(self.first())[property],
    getData: (self, dataAttribute, valueWhenFalsy) => self.first() &&
      self.first().dataset && self.first().dataset[dataAttribute] || valueWhenFalsy,
    isEmpty: self => self.collection.length < 1,
    is: (self, checkValue) => {
      const firstElem = self.first();

      if (!firstElem) {
        return true;
      }

      switch (checkValue) {
        case ":visible": {
          return isVisible(firstElem); // TODO
        }
        case ":hidden":
          return !isVisible(firstElem);
        case ":disabled":
          return firstElem.getAttribute("readonly") || firstElem.getAttribute("disabled");
        default:
          return true;
      }
    },
    hasClass: (self, ...classNames) => {
      const firstElem = self.first();
      return self.isEmpty() || !firstElem.classList.length
        ? false : classNames.find(cn => firstElem.classList.contains(cn)) || false;
    },
    replace: (self, oldChild, newChild) => {
      const firstElem = self.first();

      if (newChild.isJQL) {
        newChild = newChild.first();
      }

      if (firstElem && oldChild) {
        oldChild = oldChild.constructor === String
          ? firstElem.querySelector(oldChild)
          : oldChild.isJQL
            ? oldChild.first()
            : oldChild;

        if (oldChild && newChild) {
          oldChild.replaceWith(newChild);
        }
      }

      return self;
    },
    replaceMe: (self, newChild) => {
      newChild = newChild instanceof HTMLElement ? new self.constructor(newChild) : newChild;
      self.parent().replace(self, newChild)
      return newChild;
    },
    val: (self, value2Set) => {
      const firstElem = self.first();

      if (!firstElem || !inputElems.includes(firstElem["constructor"])) {
        return self;
      }

      if (value2Set === undefined) {
        return firstElem.value;
      }

      firstElem.value = `${value2Set}`.length < 1 ? "" : value2Set;

      return self;
    },
    parent: self => self.collection.length && self.first().parentNode &&
      new self.constructor(self.first().parentNode) || self,
    append: (self, ...elems2Append) => {
      if (self.collection.length && elems2Append.length) {

        for (let i = 0; i < elems2Append.length; i += 1) {
          const elem = elems2Append[i];
          if (elem.constructor === String) {
            self.collection.forEach(el => el.appendChild(createElementFromHtmlString(elem)));
            return self;
          }

          if (isNode(elems2Append[i])) {
            self.collection.forEach(el =>
              el.appendChild(elem instanceof Comment ? elem : elem.cloneNode(true)));
            return self;
          }

          if (elems2Append[i].isJQL && elems2Append[i].collection.length) {
            if (elems2Append[i].isVirtual) { elem.toDOM(); }
            const elems = elem.collection;
            elem.remove();
            elems.forEach( e2a =>
              self.collection.forEach( el =>
                el.appendChild( e2a instanceof Comment ? e2a : e2a.cloneNode(true) ) ) );
          }
        }
      }

      return self;
    },
    prepend: (self, ...elems2Prepend) => {
      if (!self.isEmpty() && elems2Prepend) {

        for (let i = 0; i < elems2Prepend.length; i += 1) {
          const elem2Prepend = elems2Prepend[i];

          if (elem2Prepend.constructor === String) {
            self.collection.forEach(el =>
              el.insertBefore(createElementFromHtmlString(elem2Prepend), el.firstChild))
            return self;
          }

          if (isNode(elem2Prepend)) {
            self.collection.forEach(el =>
              el.insertBefore(
                elem2Prepend instanceof Comment ? elem2Prepend : elem2Prepend.cloneNode(true), el.firstChild));
            return self;
          }

          if (elem2Prepend.isJQL && !elem2Prepend.isEmpty()) {
            const elems = elem2Prepend.collection.slice();
            elem2Prepend.remove();
            elems.forEach(e2a =>
              self.collection.forEach(el =>
                el && el.insertBefore(e2a instanceof Comment ? e2a : e2a.cloneNode(true), el.firstChild)));
          }
        }
      }

      return self;
    },
    appendTo: (self, self2AppendTo) => {
      if (!self2AppendTo.isJQL) {
        self2AppendTo = self.virtual(self2AppendTo);
      }
      return self2AppendTo.append(self);
    },
    prependTo: (self, self2PrependTo) => {
      if (!self2PrependTo.isJQL) {
        self2PrependTo = self.virtual(self2PrependTo);
      }

      return self2PrependTo.prepend(self);
    },
    single: (self, indexOrSelector = "0") => {
      if (self.collection.length > 0) {
        if (isNaN(+indexOrSelector) && self.find(indexOrSelector)) {
          return self.find$(indexOrSelector);
        }
        const index = +indexOrSelector;
        return index < self.collection.length
          ? $(self.collection[indexOrSelector])
          : $(self.collection.slice(-1));
      } else {
        return self;
      }
    },
    toNodeList: self => {
      const virtual = document.createElement(`div`);

      for (let elem of self.collection) {
        const nodeClone = document.importNode(elem, true);
        nodeClone.removeAttribute(`id`);
        virtual.append(nodeClone);
      }

      return virtual.childNodes;
    },
    duplicate: (self, toDOM = false) => {
      const clonedCollection = self.toNodeList();
      return toDOM ? $(clonedCollection) : self.virtual(clonedCollection);
    },
    toDOM: (self, root = document.body, position = insertPositions.BeforeEnd) => {
      if (self.isVirtual) {
        self.isVirtual = false;
        inject2DOMTree(self.collection, root, position);
      }
      return self;
    },
    first: (self, asself = false) => {
      if (self.collection.length > 0) {
        return asself
          ? self.single()
          : self.collection[0];
      }
      return undefined;
    },
    first$: (self, indexOrSelector) => self.single(indexOrSelector),
    find: (self, selector) => self.first()?.querySelectorAll(selector) || [],
    find$: (self, selector) => {
      const {$} = jql;
      const found = self.collection.reduce((acc, el) =>
        [...acc, [...el.querySelectorAll(selector)]], [])
        .flat()
        .filter(el => el && el instanceof HTMLElement);
      return found.length && $(found[0]) || $();
    },
    prop: (self, property, value) => {
      if (!value) {
        return self.collection.length ? self.first()[property] : self;
      }

      if (self.collection.length) {
        return loop(self, el => el[property] = value);
      }

      return self;
    },
    on: (self, type, callback) => {
      if (self.collection.length) {
        const cssSelector = addHandlerId(self);
        handlerFactory(self, type, cssSelector, callback);
      }

      return self;
    },

    html: (self, htmlValue, append) => {
      if (htmlValue === undefined) {
        return self.first()?.innerHTML;
      }

      if (!self.isEmpty()) {
        const nwElement = htmlValue.isJQL
          ? htmlValue.first() : createElementFromHtmlString(`<div>${htmlValue}</div>`);

        if (!(nwElement instanceof Comment)) {
          const cb = el => el.innerHTML = append ? el.innerHTML + nwElement.innerHTML : nwElement.innerHTML;
          return loop(self, cb);
        }
      }

      return self;
    },
    outerHtml: self => (self.first() || {outerHTML: undefined}).outerHTML,
    htmlFor: (self, forQuery, htmlString = "", append = false) => {
      if (forQuery && self.collection.length) {
        const el2Change = self.find$(forQuery);
        if (!el2Change) {
          return self;
        }

        if (`{htmlValue}`.trim().length < 1) {
          el2Change.textContent = "";
          return self;
        }

        const nwElement = createElementFromHtmlString(`<div>${htmlString}</div>`);
        nwElement && el2Change.html(nwElement.innerHTML, append);
      }
      return self;
    },
    dimensions: self => self.first()?.getBoundingClientRect(),
    delegate: (self, type, cssSelector, ...callbacks) => {
      callbacks.forEach(callback => handlerFactory(self, type, cssSelector, callback));
      return self;
    },
    ON: (self, type, ...callbacks) => {
      if (self.collection.length) {
        callbacks.forEach(cb => self.on(type, cb));
      }

      return self;
    },
    trigger: (self, evtType, SpecifiedEvent = Event, options = {}) => {
      if (self.collection.length) {
        const evObj = new SpecifiedEvent( evtType, { ...options, bubbles: options.bubbles??true} );
        for( let elem of self.collection ) { elem.dispatchEvent(evObj); }
      }
      return self;
    },
  },
};
export default allMethods;