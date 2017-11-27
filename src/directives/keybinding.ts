import Vue, {DirectiveOptions, PluginObject, VNode, VNodeDirective, VueConstructor} from "vue";

let mapFunctions: {[key: string]: any } = {};
let keyCurrentlyPressed = false;

class KeyBindingDirective implements DirectiveOptions, PluginObject<any> {
  install: (Vue: VueConstructor<Vue>, options?: any) => void;

  bind(el: HTMLElement, binding: VNodeDirective, vnode: VNode) {
    let keyArray = <Array<string>>binding.value;
    let key = keyArray.join('');
    let push = binding.modifiers.push === true;
    let focus = binding.modifiers.focus === true;
    let once = binding.modifiers.once === true;
    mapFunctions[key] = { push, focus, once, el };
  }

  unbind( el: HTMLElement, binding: VNodeDirective) {
    let keyArray = <Array<string>>binding.value;
    let key = keyArray.join('');
    if (mapFunctions[key].el === el) { delete mapFunctions[key]; }
  }
}

const mapKeyFromEvent = (pKey: KeyboardEvent) => {
  let k = '';
  if (pKey.key === 'Shift' || pKey.shiftKey) { k += 'shift'; }
  if (pKey.key === 'Control' || pKey.ctrlKey) { k += 'ctrl'; }
  if (pKey.key === 'Meta'|| pKey.metaKey) { k += 'meta'; }
  if (pKey.key === 'Alt' || pKey.altKey) { k += 'alt'; }
  if (pKey.key === 'ArrowUp') { k += 'arrowup'; }
  if (pKey.key === 'ArrowLeft') { k += 'arrowleft'; }
  if (pKey.key === 'ArrowRight') { k += 'arrowright'; }
  if (pKey.key === 'ArrowDown') { k += 'arrowdown'; }
  if (pKey.key === 'AltGraph') { k += 'altgraph'; }
  if (pKey.key === 'Escape') { k += 'esc'; }
  if (pKey.key === 'Enter') { k += 'enter'; }
  if (pKey.key === 'Tab') { k += 'tab'; }
  if (pKey.key === ' ') { k += 'space'; }
  if (pKey.key === 'PageUp') { k += 'pageup'; }
  if (pKey.key === 'PageDown') { k += 'pagedown'; }
  if (pKey.key === 'Home') { k += 'home'; }
  if (pKey.key === 'End') { k += 'end'; }
  if ((pKey.key && pKey.key !== ' ' && pKey.key.length === 1) || /F\d{1,2}/g.test(pKey.key)) k += pKey.key.toLowerCase()
  return k;
};

const fireEvent = (el: HTMLElement, eventName: string) => {
  const e = document.createEvent('HTMLEvents');
  e.initEvent(eventName, true, true);
  el.dispatchEvent(e);
};

document.addEventListener('keydown', (event) => {
  const mapKey = mapKeyFromEvent(event);
  const eventObject = mapFunctions[mapKey];
  if (eventObject == null) {
    return;
  }
  event.preventDefault();
  event.stopPropagation();
  if (!eventObject.focus) {
    fireEvent(eventObject.el, 'boundkeydown');
    keyCurrentlyPressed = true;
  } else if (!keyCurrentlyPressed) {
    let el = eventObject.el;
    if (el.localName !== 'input') {
      el = el.querySelector('input') || el;
    }
    el.focus();
    keyCurrentlyPressed = true;
  }
}, true);

document.addEventListener('keyup', (event) => {
  const mapKey = mapKeyFromEvent(event);
  const eventObject = mapFunctions[mapKey];
  if (eventObject == null) {
    return;
  }
  event.preventDefault();
  event.stopPropagation();
  if (eventObject.once || eventObject.push) {
    fireEvent(eventObject.el, 'boundkeyup');
  }
  keyCurrentlyPressed = false;
}, true);

export default new KeyBindingDirective();
