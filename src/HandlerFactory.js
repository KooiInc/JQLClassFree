import jql from "../index.js";

let handlers = {};
let _$;
let set_$ = () => {
  if (!_$) {
    const {$} = jql;
    _$ = $;
  }
};

const metaHandler = evt => handlers[evt.type].forEach(handler => handler(evt));

const createHandlerForHID = (HID, callback) => {
  set_$();
  return evt => {
    const target = evt.target.closest(HID)
    return target && callback(evt, _$(target));
  };
};

const addListenerIfNotExisting = type =>
  !Object.keys(handlers).find(registeredType => registeredType === type) && document.addEventListener(type, metaHandler);

export default (extCollection, type, HIDselector, callback) => {
  addListenerIfNotExisting(type);
  const fn = !HIDselector ? callback : createHandlerForHID(HIDselector, callback);
  handlers = handlers[type]
    ? {...handlers, [type]: handlers[type].concat(fn)}
    : {...handlers, [type]: [fn]};
};