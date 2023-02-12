import {IS} from "./JQLExtensionHelpers.js";

export default popupFactory;
let popupStyling = await fetch(`../src/Resource/defaultPopupStyling.txt`).then(r => r.text()).then(r => r.split(`~RULE~`));
function popupFactory($) {
  const wrappedBody = $(document.body);
  const setStyle = $.createStyle(`JQLPopupCSS`);
  initStyling(setStyle);
  let savedTimer, savedCallback;
  const clickOrTouch =  "ontouchstart" in document.documentElement ? "touchend" : "click";
  $.delegate( clickOrTouch, `#closer, .between`,  remove );
  const stillOpen = () => {
    endTimer();
    modalWarner.hasClass(`active`) && modalWarner.removeClass(`active`);
    modalWarner.addClass(`active`);
    savedTimer = setTimeout(() => modalWarner.removeClass(`active`), 2500);
    return true;
  }
  const currentModalState = (() =>{
    let currentPopupIsModal = false;
    return {
      set isModal({state = false}) { currentPopupIsModal = state; },
      get isModal() { return currentPopupIsModal; },
      get isActive() { return currentPopupIsModal && popupBox.hasClass(`active`) && stillOpen() },
    };
  })();
  const createElements = _ => {
    const popupBox = $(`<div class="popupContainer">`)
      .append( $(`<span id="closer" class="closeHandleIcon"></span>`)
        .prop(`title`, `Click here or anywhere outside the box to close`))
      .append(`<div class="popupBox"><div id="modalWarning"></div><div data-modalcontent></div></div>`);
    const closer = $(`#closer`);
    const between = $(`<div class="between"></div>`);
    return [popupBox, between, closer, $(`#modalWarning`)];
  };
  const [popupBox, between, closer, modalWarner] = createElements();
  const deActivate = () => {
    $(`.between`).removeClass(`active`).style({top: 0});
    $(`#closer, .popupContainer, #modalWarning`).removeClass(`active`);
    $(`[data-modalcontent]`).empty();
  };
  const activate = (theBox, closeHndl) => {
    $(`.between, .popupContainer`).addClass(`active`);
    popupBox.style( { height: `auto`, width: `auto` } );
    between.style( { top: `${scrollY}px` } );
    wrappedBody.addClass(`popupActive`);

    if (closeHndl) {
      closeHndl.addClass(`active`);
    }
  };
  const endTimer = () => savedTimer && clearTimeout(savedTimer);
  const doCreate = ({message, reallyModal, callback}) => {
    currentModalState.isModal = {state: reallyModal};
    savedCallback = callback;

    if (!message.isJQL && !IS(message, String)) {
      return createTimed($(`<b style="color:red">Popup not created: invalid input</b>`), 2);    }

    endTimer();
    $(`.popupBox > [data-modalcontent]`).empty().append( message.isJQL ? message : $(`<div>${message}</div>`) );
    activate(popupBox, currentModalState.isModal ? undefined : closer);
  }
  const create = (message, reallyModal = false, callback = undefined) =>
    !currentModalState.isActive && doCreate({message, reallyModal, callback});
  const createTimed = (message, closeAfter = 2, callback = null ) => {
    if (currentModalState.isActive) { return; }
    deActivate();
    create(message, false, callback);
    const remover = callback ? () => remove(callback) : remove;
    savedTimer = setTimeout(remover, closeAfter * 1000);
  };
  function remove(evtOrCallback) {
    endTimer();

    if (currentModalState.isActive) { return; }

    const callback = IS(evtOrCallback, Function) ? evtOrCallback : savedCallback;

    if (IS(callback, Function)) {
      savedCallback = undefined;
      return callback();
    }

    deActivate();
    const time2Wait = parseFloat(popupBox.computedStyle(`transitionDuration`)) * 1000;
    savedTimer = setTimeout(() => wrappedBody.removeClass(`popupActive`), time2Wait);
  }
  const removeModal = callback => {
    currentModalState.isModal = false;
    remove(callback);
  };

  return {
    create,
    createTimed,
    remove,
    removeModal,
  };
}

function initStyling(setStyle) {
  popupStyling.forEach(declaration => setStyle(declaration));
  popupStyling = undefined;
}