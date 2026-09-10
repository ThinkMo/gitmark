/**
 * editor.js — the split-pane Markdown editor.
 *
 * Flow:
 *  1. Read owner/repo/branch/path from the URL.
 *  2. Load the existing file (if any) via the GitHub API.
 *  3. Live-preview with `marked`, formatting toolbar, image handling.
 *  4. Commit markdown + pending images as one atomic commit.
 */

import {
  getToken,
  getFile,
  getFileAsDataUrl,
  getRepo,
  commitFiles,
  bytesToBase64,
} from "../src/github.js";
import { t } from "../src/i18n.js";

/* global marked */

const els = {
  repoLabel: document.getElementById("repoLabel"),
  pathLabel: document.getElementById("pathLabel"),
  branchLabel: document.getElementById("branchLabel"),
  status: document.getElementById("status"),
  commitBtn: document.getElementById("commitBtn"),
  toolbar: document.getElementById("toolbar"),
  editor: document.getElementById("editor"),
  preview: document.getElementById("preview"),
  imageBtn: document.getElementById("imageBtn"),
  imageInput: document.getElementById("imageInput"),
  pendingbar: document.getElementById("pendingbar"),
  pendingList: document.getElementById("pendingList"),
  modal: document.getElementById("commitModal"),
  commitMessage: document.getElementById("commitMessage"),
  commitBranch: document.getElementById("commitBranch"),
  commitHint: document.getElementById("commitHint"),
  cancelCommit: document.getElementById("cancelCommit"),
  confirmCommit: document.getElementById("confirmCommit"),
  themeToggle: document.getElementById("themeToggle"),
  newFileBar: document.getElementById("newFileBar"),
  nfRepo: document.getElementById("nfRepo"),
  nfBranch: document.getElementById("nfBranch"),
  nfPath: document.getElementById("nfPath"),
};

const state = {
  token: "",
  mode: "edit", // "edit" | "new"
  owner: "",
  repo: "",
  branch: "",
  path: "",
  baseSha: null, // sha of the file when loaded (informational)
  defaultBranch: "",
  /** pending images: [{ path, relPath, base64, blobUrl }] */
  images: [],
  /** cache of resolved committed-image data URLs, keyed by repo path */
  remoteImages: new Map(),
};

/* ---------------- init ---------------- */

async function init() {
  const q = new URLSearchParams(location.search);
  state.mode = q.get("mode") === "new" ? "new" : "edit";
  state.owner = q.get("owner") || "";
  state.repo = q.get("repo") || "";
  state.branch = q.get("branch") || "";
  state.path = q.get("path") || "";

  applyStaticI18n();
  initTheme();
  configureMarked();

  state.token = await getToken();
  if (!state.token) {
    setStatus(t("noToken"), "error");
    return;
  }

  if (state.mode === "new") {
    await initNewFile();
  } else {
    await initExistingFile();
  }
}

/** Editing an existing (or content-API-created) file loaded from GitHub. */
async function initExistingFile() {
  els.repoLabel.textContent = `${state.owner}/${state.repo}`;
  els.pathLabel.textContent = state.path;
  els.branchLabel.textContent = state.branch;
  document.title = t("docTitleSuffix", { path: state.path });

  try {
    setStatus(t("loading"));
    const repoInfo = await getRepo(
      state.token,
      state.owner,
      state.repo
    ).catch(() => null);
    state.defaultBranch = repoInfo?.default_branch || state.branch;

    const file = await getFile(
      state.token,
      state.owner,
      state.repo,
      state.path,
      state.branch
    );
    state.baseSha = file.sha;
    els.editor.value = file.content;
    renderPreview();
    els.commitBtn.disabled = false;
    setStatus(file.sha ? t("loaded") : t("newFileWillCreate"), "ok");
  } catch (e) {
    setStatus(e.message, "error");
  }
}

/** Creating a brand-new file: show the editable target bar. */
async function initNewFile() {
  document.title = t("newDocTitle");
  els.newFileBar.hidden = false;
  els.repoLabel.textContent = t("newFileTitle");
  els.pathLabel.textContent = "";
  els.branchLabel.textContent = "";

  // Prefill from the popup-provided repo context, if any.
  els.nfRepo.value = state.owner && state.repo ? `${state.owner}/${state.repo}` : "";
  els.nfBranch.value = state.branch || "";
  els.nfPath.value = "";

  // Try to learn the default branch so we can prefill it when empty.
  if (state.owner && state.repo) {
    const repoInfo = await getRepo(
      state.token,
      state.owner,
      state.repo
    ).catch(() => null);
    state.defaultBranch = repoInfo?.default_branch || "";
    if (!els.nfBranch.value && state.defaultBranch) {
      els.nfBranch.value = state.defaultBranch;
    }
  }

  els.editor.value = "";
  renderPreview();
  els.commitBtn.disabled = false;
  setStatus(t("newFileFillHint"), "");
}

function configureMarked() {
  if (typeof marked === "undefined") return;
  marked.setOptions({ breaks: true, gfm: true });
}

/** Translate all elements tagged with data-i18n / -title / -ph attributes. */
function applyStaticI18n() {
  document.querySelectorAll("[data-i18n]").forEach((el) => {
    el.textContent = t(el.dataset.i18n);
  });
  document.querySelectorAll("[data-i18n-title]").forEach((el) => {
    el.title = t(el.dataset.i18nTitle);
  });
  document.querySelectorAll("[data-i18n-ph]").forEach((el) => {
    el.placeholder = t(el.dataset.i18nPh);
  });
}

function setStatus(text, cls = "") {
  els.status.textContent = text;
  els.status.className = `status ${cls}`;
}

/* ---------------- theme ---------------- */

const THEME_KEY = "gmh-theme";

function currentTheme() {
  return document.documentElement.getAttribute("data-theme") === "light"
    ? "light"
    : "dark";
}

function applyTheme(theme) {
  document.documentElement.setAttribute("data-theme", theme);
  if (els.themeToggle) {
    // Show the theme you can switch TO.
    els.themeToggle.textContent =
      theme === "light" ? t("themeToDark") : t("themeToLight");
  }
  try {
    localStorage.setItem(THEME_KEY, theme);
  } catch {
    /* storage may be unavailable; ignore */
  }
}

function initTheme() {
  // The inline head script already set data-theme; sync the button label.
  applyTheme(currentTheme());
  els.themeToggle?.addEventListener("click", () => {
    applyTheme(currentTheme() === "light" ? "dark" : "light");
  });
}

/* ---------------- preview ---------------- */

let previewTimer = null;
function renderPreview() {
  if (typeof marked === "undefined") {
    els.preview.textContent = els.editor.value;
    return;
  }
  const html = marked.parse(els.editor.value || "");
  els.preview.innerHTML = sanitizeHtml(html);
  // Rewrite <img> so both pending (not-yet-committed) and already-committed
  // images render. Pending images use a local blob URL; committed images are
  // fetched from GitHub and inlined as data URLs (a repo-relative src cannot
  // resolve inside the extension page).
  els.preview.querySelectorAll("img").forEach((img) => {
    const src = img.getAttribute("src") || "";
    if (!src || /^(https?:|data:|blob:)/i.test(src)) return;

    const base = src.split("/").pop();
    const pending = state.images.find(
      (i) =>
        src === i.relPath ||
        src === i.path ||
        src.endsWith(i.relPath) ||
        i.path.split("/").pop() === base
    );
    if (pending) {
      img.src = pending.blobUrl;
      return;
    }

    // Committed / repo image referenced by a relative path.
    const repoPath = resolveRepoPath(src);
    if (state.remoteImages.has(repoPath)) {
      const url = state.remoteImages.get(repoPath);
      if (url) img.src = url;
      return;
    }
    loadRemoteImage(repoPath);
  });
}

/**
 * Defense-in-depth sanitizer for the rendered preview. The MV3 CSP already
 * blocks inline scripts and event handlers, but we still strip dangerous nodes
 * and attributes so a malicious document can't smuggle active content.
 */
function sanitizeHtml(html) {
  const doc = new DOMParser().parseFromString(html, "text/html");
  doc.querySelectorAll("script, style, iframe, object, embed, link, meta").forEach(
    (el) => el.remove()
  );
  doc.querySelectorAll("*").forEach((el) => {
    [...el.attributes].forEach((attr) => {
      const name = attr.name.toLowerCase();
      const value = attr.value || "";
      // Drop inline event handlers and any javascript:/data-URL vectors on
      // navigable attributes.
      if (name.startsWith("on")) {
        el.removeAttribute(attr.name);
      } else if (
        (name === "href" || name === "src" || name === "xlink:href") &&
        /^\s*javascript:/i.test(value)
      ) {
        el.removeAttribute(attr.name);
      }
    });
  });
  return doc.body.innerHTML;
}

/** Resolve a doc-relative image src to a full repo path. */
function resolveRepoPath(src) {
  const dir = state.path.includes("/")
    ? state.path.slice(0, state.path.lastIndexOf("/") + 1)
    : "";
  let p = src.replace(/^\.\//, "");
  if (p.startsWith("/")) return p.slice(1); // repo-absolute
  // Collapse ../ against the document directory.
  const stack = (dir + p).split("/");
  const out = [];
  for (const seg of stack) {
    if (seg === "..") out.pop();
    else if (seg !== "." && seg !== "") out.push(seg);
  }
  return out.join("/");
}

/** Fetch a committed image once, cache it, then refresh the preview. */
async function loadRemoteImage(repoPath) {
  state.remoteImages.set(repoPath, ""); // mark in-flight to avoid duplicates
  try {
    const url = await getFileAsDataUrl(
      state.token,
      state.owner,
      state.repo,
      repoPath,
      state.branch
    );
    state.remoteImages.set(repoPath, url);
    if (url) renderPreview();
  } catch {
    state.remoteImages.set(repoPath, "");
  }
}

els.editor.addEventListener("input", () => {
  clearTimeout(previewTimer);
  previewTimer = setTimeout(renderPreview, 120);
});

/* ---------------- toolbar formatting ---------------- */

els.toolbar.addEventListener("click", (e) => {
  const btn = e.target.closest("button[data-md]");
  if (!btn) return;
  applyFormat(btn.dataset.md);
});

document.addEventListener("keydown", (e) => {
  const mod = e.metaKey || e.ctrlKey;
  if (!mod) return;
  const k = e.key.toLowerCase();
  if (k === "b") {
    e.preventDefault();
    applyFormat("bold");
  } else if (k === "i") {
    e.preventDefault();
    applyFormat("italic");
  } else if (k === "s") {
    e.preventDefault();
    openCommitModal();
  }
});

function applyFormat(kind) {
  const ta = els.editor;
  const start = ta.selectionStart;
  const end = ta.selectionEnd;
  const sel = ta.value.slice(start, end);
  const before = ta.value.slice(0, start);
  const after = ta.value.slice(end);

  const wrap = (l, r = l, placeholder = "") => {
    const body = sel || placeholder;
    const text = `${l}${body}${r}`;
    ta.value = before + text + after;
    const caret = start + l.length;
    ta.selectionStart = caret;
    ta.selectionEnd = caret + body.length;
  };

  const linePrefix = (prefix) => {
    // Apply to each selected line (or current line).
    const lineStart = before.lastIndexOf("\n") + 1;
    const head = ta.value.slice(0, lineStart);
    const body = ta.value.slice(lineStart, end) || "";
    const rest = ta.value.slice(end);
    const replaced = (body || t("tbUlText"))
      .split("\n")
      .map((ln, i) =>
        prefix === "ol" ? `${i + 1}. ${ln}` : `${prefix}${ln}`
      )
      .join("\n");
    ta.value = head + replaced + rest;
  };

  switch (kind) {
    case "bold":
      wrap("**", "**", t("boldText"));
      break;
    case "italic":
      wrap("*", "*", t("italicText"));
      break;
    case "strike":
      wrap("~~", "~~", t("strikeText"));
      break;
    case "code":
      wrap("`", "`", t("codeText"));
      break;
    case "codeblock":
      wrap("\n```\n", "\n```\n", "code");
      break;
    case "h1":
      linePrefix("# ");
      break;
    case "h2":
      linePrefix("## ");
      break;
    case "h3":
      linePrefix("### ");
      break;
    case "ul":
      linePrefix("- ");
      break;
    case "ol":
      linePrefix("ol");
      break;
    case "quote":
      linePrefix("> ");
      break;
    case "link": {
      const url = prompt(t("linkPrompt"), "https://");
      if (url) wrap("[", `](${url})`, sel || t("linkText"));
      break;
    }
    default:
      break;
  }
  ta.focus();
  dirty = true;
  renderPreview();
}

/* ---------------- image handling ---------------- */

els.imageBtn.addEventListener("click", () => els.imageInput.click());
els.imageInput.addEventListener("change", (e) => {
  addImageFiles([...e.target.files]);
  els.imageInput.value = "";
});

// Paste image from clipboard.
els.editor.addEventListener("paste", (e) => {
  const items = [...(e.clipboardData?.items || [])];
  const files = items
    .filter((it) => it.kind === "file" && it.type.startsWith("image/"))
    .map((it) => it.getAsFile())
    .filter(Boolean);
  if (files.length) {
    e.preventDefault();
    addImageFiles(files);
  }
});

// Drag & drop onto the editor pane.
["dragenter", "dragover"].forEach((ev) =>
  els.editor.addEventListener(ev, (e) => {
    if ([...(e.dataTransfer?.types || [])].includes("Files")) {
      e.preventDefault();
      document.body.classList.add("gmh-dragover");
    }
  })
);
["dragleave", "drop"].forEach((ev) =>
  els.editor.addEventListener(ev, () =>
    document.body.classList.remove("gmh-dragover")
  )
);
els.editor.addEventListener("drop", (e) => {
  const files = [...(e.dataTransfer?.files || [])].filter((f) =>
    f.type.startsWith("image/")
  );
  if (files.length) {
    e.preventDefault();
    addImageFiles(files);
  }
});

async function addImageFiles(files) {
  // In new-file mode the image directory is derived from the target path; if
  // it's not filled yet, the relative link and the committed path won't match.
  if (state.mode === "new" && !effectiveDocPath()) {
    setStatus(t("imgNeedPathFirst"), "error");
    els.nfPath.focus();
    return;
  }
  for (const file of files) {
    const base64 = await fileToBase64(file);
    const repoPath = buildImagePath(file.name);
    const relPath = relativeFromMarkdown(repoPath);
    const blobUrl = URL.createObjectURL(file);
    state.images.push({ path: repoPath, relPath, base64, blobUrl });
    insertAtCursor(`\n![${file.name}](${relPath})\n`);
  }
  dirty = true;
  renderPendingBar();
  renderPreview();
}

/**
 * Store images under an `assets/` directory next to the markdown file, with a
 * timestamp to avoid collisions. e.g. docs/guide.md -> docs/assets/168…-a.png
 */
function buildImagePath(name) {
  const docPath = effectiveDocPath();
  const dir = docPath.includes("/")
    ? docPath.slice(0, docPath.lastIndexOf("/"))
    : "";
  const safe = name.replace(/[^\w.\-]+/g, "-");
  const stamp = Date.now().toString(36);
  const base = dir ? `${dir}/assets` : "assets";
  return `${base}/${stamp}-${safe}`;
}

/** Markdown link path relative to the markdown file's directory. */
function relativeFromMarkdown(repoPath) {
  const docPath = effectiveDocPath();
  const dir = docPath.includes("/")
    ? docPath.slice(0, docPath.lastIndexOf("/") + 1)
    : "";
  return repoPath.startsWith(dir) ? repoPath.slice(dir.length) : repoPath;
}

/**
 * The markdown file's repo path used to anchor image paths. In new-file mode
 * state.path is empty until commit, so read the live path field instead.
 */
function effectiveDocPath() {
  if (state.mode === "new") {
    return els.nfPath.value.trim().replace(/^\/+/, "");
  }
  return state.path;
}

function insertAtCursor(text) {
  const ta = els.editor;
  const start = ta.selectionStart;
  const end = ta.selectionEnd;
  ta.value = ta.value.slice(0, start) + text + ta.value.slice(end);
  const caret = start + text.length;
  ta.selectionStart = ta.selectionEnd = caret;
  ta.focus();
}

function renderPendingBar() {
  if (!state.images.length) {
    els.pendingbar.hidden = true;
    els.pendingList.innerHTML = "";
    return;
  }
  els.pendingbar.hidden = false;
  els.pendingList.innerHTML = state.images
    .map((i) => `<span class="chip">${escapeHtml(i.path)}</span>`)
    .join("");
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const bytes = new Uint8Array(reader.result);
      resolve(bytesToBase64(bytes));
    };
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
}

function escapeHtml(s) {
  return s.replace(
    /[&<>"']/g,
    (c) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      })[c]
  );
}

/* ---------------- commit ---------------- */

els.commitBtn.addEventListener("click", openCommitModal);
els.cancelCommit.addEventListener("click", () => (els.modal.hidden = true));
els.confirmCommit.addEventListener("click", doCommit);

function openCommitModal() {
  if (!state.token) {
    setStatus(t("noTokenShort"), "error");
    return;
  }

  if (state.mode === "new") {
    const target = readNewFileTarget();
    if (!target.ok) {
      setStatus(target.error, "error");
      return;
    }
    // Adopt the entered target so the rest of the flow is mode-agnostic.
    state.owner = target.owner;
    state.repo = target.repo;
    state.branch = target.branch;
    state.path = target.path;
  }

  els.commitMessage.value =
    state.mode === "new" ? `Create ${state.path}` : `Update ${state.path}`;
  els.commitBranch.value = state.branch;
  const imgNote = state.images.length
    ? t("imgCount", { n: state.images.length })
    : "";
  const repoRef = `${state.owner}/${state.repo}`;
  setCommitHint(
    state.mode === "new"
      ? t("commitPlanNew", { repo: repoRef, img: imgNote })
      : t("commitPlanUpdate", { repo: repoRef, img: imgNote })
  );
  els.modal.hidden = false;
  els.commitMessage.focus();
}

/** Validate and normalize the new-file target bar inputs. */
function readNewFileTarget() {
  const repoRaw = els.nfRepo.value.trim().replace(/^\/+|\/+$/g, "");
  const m = repoRaw.match(/^([^/\s]+)\/([^/\s]+)$/);
  if (!m) {
    return { ok: false, error: t("errRepoFormat") };
  }
  const path = els.nfPath.value.trim().replace(/^\/+/, "");
  if (!path) {
    return { ok: false, error: t("errPathEmpty") };
  }
  if (!/\.(md|markdown|mdx)$/i.test(path)) {
    return { ok: false, error: t("errPathExt") };
  }
  const branch = els.nfBranch.value.trim() || state.defaultBranch || "main";
  return { ok: true, owner: m[1], repo: m[2], branch, path };
}

/** Show a message in the modal's hint line (normal or error styled). */
function setCommitHint(text, isError = false) {
  els.commitHint.textContent = text;
  els.commitHint.style.color = isError ? "var(--danger)" : "";
  els.commitHint.style.whiteSpace = "pre-wrap";
}

async function doCommit() {
  const message = els.commitMessage.value.trim() || `Update ${state.path}`;
  const branch = els.commitBranch.value.trim() || state.branch;
  els.confirmCommit.disabled = true;
  els.confirmCommit.textContent = t("committing");
  setCommitHint(t("committing"));
  setStatus(t("committing"));
  try {
    // For a new file, refuse to silently overwrite an existing path.
    if (state.mode === "new") {
      const existing = await getFile(
        state.token,
        state.owner,
        state.repo,
        state.path,
        branch
      ).catch(() => ({ sha: null }));
      if (existing.sha) {
        setCommitHint(t("pathExistsHint", { branch }), true);
        setStatus(t("pathExists"), "error");
        return;
      }
    } else if (state.baseSha) {
      // Editing an existing file: guard against a lost update. If the file
      // changed on the branch since we loaded it, refuse to overwrite.
      const latest = await getFile(
        state.token,
        state.owner,
        state.repo,
        state.path,
        branch
      ).catch(() => null);
      if (latest && latest.sha && latest.sha !== state.baseSha) {
        setCommitHint(t("conflictRemoteChanged"), true);
        setStatus(t("conflictShort"), "error");
        return;
      }
    }

    const res = await commitFiles({
      token: state.token,
      owner: state.owner,
      repo: state.repo,
      branch,
      path: state.path,
      content: els.editor.value,
      message,
      images: state.images.map(({ path, base64 }) => ({ path, base64 })),
    });
    els.modal.hidden = true;
    state.images = [];
    renderPendingBar();
    dirty = false;
    state.branch = branch;
    // The file now exists; leave new-file mode so labels/paths behave.
    if (state.mode === "new") {
      state.mode = "edit";
      els.newFileBar.hidden = true;
      els.repoLabel.textContent = `${state.owner}/${state.repo}`;
      els.pathLabel.textContent = state.path;
      els.branchLabel.textContent = state.branch;
    }
    // Refresh the base sha to the just-committed blob so a subsequent edit in
    // this same session isn't wrongly flagged as a conflict.
    getFile(state.token, state.owner, state.repo, state.path, branch)
      .then((f) => {
        state.baseSha = f.sha;
      })
      .catch(() => {
        /* best effort; leave baseSha as-is */
      });
    setStatus(t("commitSuccess"), "ok");
    const link = document.createElement("a");
    link.href = res.htmlUrl;
    link.target = "_blank";
    link.textContent = t("viewCommit");
    link.style.marginLeft = "8px";
    els.status.appendChild(link);
  } catch (e) {
    // Keep the modal open and show the failure prominently inside it.
    setCommitHint(t("commitFailedDiagnosing"), true);
    setStatus(t("commitFailed"), "error");
    const detail = await diagnoseCommitError(e, branch);
    setCommitHint(detail, true);
  } finally {
    els.confirmCommit.disabled = false;
    els.confirmCommit.textContent = t("confirmCommit");
  }
}

/**
 * On a failed commit, actually probe GitHub to prove *why* it failed instead
 * of printing a generic checklist. For 403 we re-fetch the repo and read the
 * `permissions.push` flag the API returns for the authenticated user.
 */
async function diagnoseCommitError(e, branch) {
  const raw = e && e.message ? e.message : String(e);
  const status = e && e.status;

  if (status === 401 || /\b401\b/.test(raw)) {
    return t("diag401");
  }
  if (status === 409 || /\b409\b/.test(raw)) {
    return t("diag409");
  }
  if (status === 422 || /\b422\b/.test(raw)) {
    return t("diag422", { raw });
  }

  if (status === 403 || /\b403\b/.test(raw)) {
    const repoRef = `${state.owner}/${state.repo}`;
    // Probe the repo to distinguish "no push access" from "token scope".
    try {
      const repo = await getRepo(state.token, state.owner, state.repo);
      const perm = repo && repo.permissions ? repo.permissions : {};
      if (perm.push === false) {
        return t("diag403NoPush", { repo: repoRef });
      }
      // Has push permission but still 403 → token scope / branch protection.
      return t("diag403Scope", { branch });
    } catch (probeErr) {
      // Even reading the repo failed → almost certainly token scope/access.
      return t("diag403Probe", { err: probeErr.message || probeErr });
    }
  }

  if (status === 404) {
    return t("diag404");
  }
  return t("diagGeneric", { raw });
}

/* Warn on unsaved edits. */
let dirty = false;
els.editor.addEventListener("input", () => (dirty = true));
window.addEventListener("beforeunload", (e) => {
  if (dirty) {
    e.preventDefault();
    e.returnValue = "";
  }
});

init();
