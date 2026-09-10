/**
 * content.js — runs on github.com.
 *
 * Detects Markdown "blob" pages (…/blob/<branch>/<path>.md) and injects an
 * "Edit in GitMark" button. GitHub navigates client-side (Turbo),
 * so we re-evaluate on history changes.
 */

const MD_EXT = /\.(md|markdown|mdown|mkd|mkdn|mdx)$/i;
const BTN_ID = "gmh-edit-btn";

/**
 * Minimal local i18n for the injected button. A content script runs on the
 * github.com origin and cannot import the extension's module or read its
 * localStorage, so we keep a tiny table here and read the language from
 * chrome.storage.local (mirrored there by src/i18n.js setLang()).
 */
const LABELS = {
  zh: { text: "✎ GitMark", title: "在 GitMark 中编辑此文件" },
  en: { text: "✎ GitMark", title: "Edit this file in GitMark" },
};
let lang = "zh";

/** Parse an owner/repo/branch/path tuple from a blob URL, or null. */
function parseBlobUrl() {
  const m = location.pathname.match(
    /^\/([^/]+)\/([^/]+)\/blob\/([^/]+)\/(.+)$/
  );
  if (!m) return null;
  const [, owner, repo, branch, rawPath] = m;
  const path = decodeURIComponent(rawPath.split("#")[0].split("?")[0]);
  if (!MD_EXT.test(path)) return null;
  return { owner, repo, branch, path };
}

function makeButton(info) {
  const btn = document.createElement("button");
  btn.id = BTN_ID;
  btn.type = "button";
  btn.className = "gmh-edit-btn";
  const labels = LABELS[lang] || LABELS.zh;
  btn.textContent = labels.text;
  btn.title = labels.title;
  btn.addEventListener("click", (e) => {
    e.preventDefault();
    chrome.runtime.sendMessage({
      type: "OPEN_EDITOR",
      params: {
        owner: info.owner,
        repo: info.repo,
        branch: info.branch,
        path: info.path,
      },
    });
  });
  return btn;
}

/** Find a good place to mount the button near GitHub's file toolbar. */
function mountButton(info) {
  if (document.getElementById(BTN_ID)) return;

  // Prefer the file header actions area; fall back to a floating button.
  const anchor =
    document.querySelector('[data-testid="more-file-actions-button"]')
      ?.parentElement ||
    document.querySelector(".react-blob-header-edit-and-raw-actions") ||
    document.querySelector(".file-actions") ||
    document.querySelector(".Box-header .d-flex");

  const btn = makeButton(info);
  if (anchor) {
    btn.classList.add("gmh-inline");
    anchor.prepend(btn);
  } else {
    btn.classList.add("gmh-floating");
    document.body.appendChild(btn);
  }
}

function removeButton() {
  document.getElementById(BTN_ID)?.remove();
}

function refresh() {
  const info = parseBlobUrl();
  if (!info) {
    removeButton();
    return;
  }
  // GitHub renders the header asynchronously; retry a few times.
  let tries = 0;
  const tick = () => {
    if (parseBlobUrl() && !document.getElementById(BTN_ID)) {
      mountButton(info);
    }
    if (++tries < 10 && !document.getElementById(BTN_ID)) {
      setTimeout(tick, 300);
    }
  };
  tick();
}

/* React to Turbo / SPA navigations. */
function hookNavigation() {
  const fire = () => setTimeout(refresh, 50);
  document.addEventListener("turbo:load", fire);
  document.addEventListener("pjax:end", fire);
  window.addEventListener("popstate", fire);

  const _push = history.pushState;
  history.pushState = function (...args) {
    const r = _push.apply(this, args);
    fire();
    return r;
  };
  const _replace = history.replaceState;
  history.replaceState = function (...args) {
    const r = _replace.apply(this, args);
    fire();
    return r;
  };
}

/** Re-apply the current language to the mounted button, if any. */
function refreshButtonLabel() {
  const btn = document.getElementById(BTN_ID);
  if (!btn) return;
  const labels = LABELS[lang] || LABELS.zh;
  btn.textContent = labels.text;
  btn.title = labels.title;
}

/** Load the persisted language, then react to later changes. */
function initLang() {
  const apply = (v) => {
    if (v === "zh" || v === "en") {
      lang = v;
      refreshButtonLabel();
    }
  };
  try {
    chrome.storage?.local.get("gmh-lang", (res) => apply(res && res["gmh-lang"]));
    chrome.storage?.onChanged.addListener((changes, area) => {
      if (area === "local" && changes["gmh-lang"]) {
        apply(changes["gmh-lang"].newValue);
      }
    });
  } catch {
    /* storage unavailable; keep default */
  }
}

initLang();
hookNavigation();
refresh();
