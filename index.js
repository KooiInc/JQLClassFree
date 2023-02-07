/*
  This is a classfree object oriented version of JQL:
    see https://github.com/KooiInc/JQL
  Inspired by Douglas Crockford:
    see https://youtu.be/XFTOG895C7c?t=2562
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
  proxify,
  addJQLStatics,
} from "./src/JQLExtensionHelpers.js";

import { Log, isLogSystem } from "./src/JQLLog.js";

/* endregion imports */

/* region MAIN */
const logLineLength = 80;
let JQL = JQLFactory();

export default addJQLStatics(JQL);
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
      isJQL: true,
      insertPositions, };

    const isRawElemCollection = isArrayOfHtmlElements(instance.collection);

    const logStr = (`(JQL log) raw input: [${
      truncateHtmlStr(isRawHtmlArray
        ? input.join(``)
        : isRawElemCollection ? `Element(s): ${instance.collection.map(el => el.outerHTML || el.textContent).join(``)}`
          : input, logLineLength)}]`);

    if (instance.collection.length && isRawElemCollection) {
      isLogSystem() && Log(logStr);
      return proxify(instance);
    }

    if (shouldCreateElements) {
      [input].flat().forEach(htmlFragment => instance.collection.push(createElementFromHtmlString(htmlFragment)));
    }

    if (shouldCreateElements && instance.collection.length > 0) {
      const errors = instance.collection.filter( el => el.dataset?.jqlcreationerror );
      instance.collection = instance.collection.filter(el => !el.dataset?.jqlcreationerror);

      isLogSystem() && Log(`${logStr}\n  Created ${instance.isVirtual ? ` VIRTUAL` : ``} (outerHTML truncated) [${
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
    isLogSystem() && Log(forLog);
    return proxify(instance);
  }
}
/* endregion factory */