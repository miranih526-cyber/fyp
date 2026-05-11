/** Avoids importing React from axios; SessionExpiredBridge registers the handler. */
let sessionExpiredHandler = null;

export function setSessionExpiredHandler(fn) {
  sessionExpiredHandler = fn;
}

export function triggerSessionExpired() {
  sessionExpiredHandler?.();
}
