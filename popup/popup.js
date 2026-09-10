/**
 * popup.js — token management + "edit current file" shortcut.
 */

import {
  getToken,
  setToken,
  getAuthenticatedUser,
} from "../src/github.js";
import { t, getLang, setLang } from "../src/i18n.js";

const MD_EXT = /\.(md|markdown|mdown|mkd|mkdn|mdx)$/i;

const tokenState = document.getElementById("tokenState");
const tokenInput = document.getElementById("token");
const saveBtn = document.getElementById("save");
const clearBtn = document.getElementById("clear");
const openHere = document.getElementById("openHere");
const tabHint = document.getElementById("tabHint");
const newFileBtn = document.getElementById("newFile");
const langSelect = document.getElementById("langSelect");

let statusEl = document.createElement("p");
statusEl.className = "status";
saveBtn.parentElement.after(statusEl);

/* ---- i18n ---- */
/** Translate elements tagged with data-i18n / data-i18n-ph. */
function applyStaticI18n() {
  document.querySelectorAll("[data-i18n]").forEach((el) => {
    el.textContent = t(el.dataset.i18n);
  });
  document.querySelectorAll("[data-i18n-ph]").forEach((el) => {
    el.placeholder = t(el.dataset.i18nPh);
  });
  document.documentElement.setAttribute(
    "lang",
    getLang() === "en" ? "en" : "zh-CN"
  );
  // Reveal the UI now that text is in the right language (avoids a flash of
  // the HTML's default-language fallback strings).
  document.body.classList.remove("i18n-pending");
}

if (langSelect) {
  langSelect.value = getLang();
  langSelect.addEventListener("change", () => {
    setLang(langSelect.value);
    // Re-render everything in the newly selected language.
    applyStaticI18n();
    refreshTokenState();
    updateTabHint();
  });
}

/* ---- token status ---- */
async function refreshTokenState() {
  const token = await getToken();
  if (!token) {
    tokenState.textContent = t("tokenStateNone");
    tokenState.className = "v bad";
    return;
  }
  tokenState.textContent = t("tokenStateVerifying");
  tokenState.className = "v";
  try {
    const user = await getAuthenticatedUser(token);
    tokenState.textContent = t("tokenStateConnected", { login: user.login });
    tokenState.className = "v ok";
  } catch {
    tokenState.textContent = t("tokenStateInvalid");
    tokenState.className = "v bad";
  }
}

saveBtn.addEventListener("click", async () => {
  const tok = tokenInput.value.trim();
  if (!tok) return;
  await setToken(tok);
  tokenInput.value = "";
  setStatus(t("saved"), "ok");
  refreshTokenState();
});

clearBtn.addEventListener("click", async () => {
  await setToken("");
  setStatus(t("cleared"), "ok");
  refreshTokenState();
});

function setStatus(text, cls) {
  statusEl.textContent = text;
  statusEl.className = `status ${cls || ""}`;
  setTimeout(() => (statusEl.textContent = ""), 2500);
}

/* ---- edit current file shortcut ---- */
function parseBlob(urlStr) {
  try {
    const u = new URL(urlStr);
    if (u.hostname !== "github.com") return null;
    const m = u.pathname.match(/^\/([^/]+)\/([^/]+)\/blob\/([^/]+)\/(.+)$/);
    if (!m) return null;
    const [, owner, repo, branch, rawPath] = m;
    const path = decodeURIComponent(rawPath);
    if (!MD_EXT.test(path)) return null;
    return { owner, repo, branch, path };
  } catch {
    return null;
  }
}

/** Best-effort owner/repo/branch context from any github.com repo page. */
function parseRepoContext(urlStr) {
  try {
    const u = new URL(urlStr);
    if (u.hostname !== "github.com") return null;
    const parts = u.pathname.split("/").filter(Boolean);
    if (parts.length < 2) return null;
    const [owner, repo] = parts;
    // reserved top-level routes that are not repos
    if (["settings", "notifications", "marketplace"].includes(owner)) {
      return null;
    }
    // .../tree/<branch>/... or .../blob/<branch>/...
    let branch = "";
    const idx = parts.findIndex((p) => p === "tree" || p === "blob");
    if (idx >= 0 && parts[idx + 1]) branch = decodeURIComponent(parts[idx + 1]);
    return { owner, repo, branch };
  } catch {
    return null;
  }
}

/** Detected Markdown file on the active tab, or null. Set by initTabShortcut. */
let tabFileInfo = null;

/** Render the tab hint in the current language (re-callable on lang change). */
function updateTabHint() {
  if (!tabHint) return;
  tabHint.textContent = tabFileInfo
    ? `${tabFileInfo.owner}/${tabFileInfo.repo} · ${tabFileInfo.path}`
    : t("tabHintNotMd");
}

async function initTabShortcut() {
  // The options page reuses this script but has no tab shortcut UI.
  if (!openHere || !tabHint) return;
  const [tab] = await chrome.tabs.query({
    active: true,
    currentWindow: true,
  });
  const url = (tab && tab.url) || "";

  tabFileInfo = parseBlob(url);
  if (tabFileInfo) {
    openHere.disabled = false;
    openHere.addEventListener("click", () => {
      chrome.runtime.sendMessage({ type: "OPEN_EDITOR", params: tabFileInfo });
      window.close();
    });
  }
  updateTabHint();

  // New-file button: prefill repo/branch from the current repo page if any.
  if (newFileBtn) {
    newFileBtn.addEventListener("click", () => {
      const ctx = parseRepoContext(url) || {};
      chrome.runtime.sendMessage({
        type: "OPEN_EDITOR",
        params: {
          mode: "new",
          owner: ctx.owner || "",
          repo: ctx.repo || "",
          branch: ctx.branch || "",
        },
      });
      window.close();
    });
  }
}

applyStaticI18n();
refreshTokenState();
initTabShortcut();
