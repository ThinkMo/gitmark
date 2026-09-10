/**
 * background.js — MV3 service worker.
 *
 * Responsibilities:
 *  - Open the editor page in a new tab when the content script requests it,
 *    passing the target file coordinates via URL params.
 *  - Provide a small message bridge used by the popup ("open editor for
 *    the active GitHub tab").
 */

const EDITOR_URL = chrome.runtime.getURL("editor/editor.html");

function buildEditorUrl(params) {
  const u = new URL(EDITOR_URL);
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== "") u.searchParams.set(k, v);
  });
  return u.toString();
}

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg && msg.type === "OPEN_EDITOR") {
    chrome.tabs.create({ url: buildEditorUrl(msg.params || {}) });
    sendResponse({ ok: true });
    return true;
  }
  return false;
});
