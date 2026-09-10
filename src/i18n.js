/**
 * i18n.js — tiny shared translation layer for all extension pages.
 *
 * Language is persisted in localStorage under `gmh-lang` so it can be read
 * synchronously at page load (avoiding a flash of the wrong language). All
 * extension pages share the same chrome-extension:// origin, so localStorage
 * is common across popup, options and editor.
 */

export const LANG_KEY = "gmh-lang";
export const SUPPORTED = ["zh", "en"];
export const DEFAULT_LANG = "zh";

const STRINGS = {
  zh: {
    // popup / options
    appTitle: "GitMark",
    settingsTitle: "GitMark — 设置",
    // injected button on github.com file pages
    injectBtn: "✎ GitMark",
    injectBtnTitle: "在 GitMark 中编辑此文件",
    tokenStateLabel: "Token 状态",
    tokenStateChecking: "检查中…",
    tokenStateVerifying: "验证中…",
    tokenStateNone: "未配置",
    tokenStateInvalid: "Token 无效",
    tokenStateConnected: "已连接 @{login}",
    langLabel: "语言",
    tabHintDefault: "在 GitHub 的 Markdown 文件页可直接编辑。",
    tabHintNotMd: "当前标签页不是 GitHub 的 Markdown 文件。",
    editCurrent: "编辑当前",
    newFile: "✎ 新建",
    patLabel: "Personal Access Token",
    patPlaceholder: "ghp_… 或 fine-grained token",
    save: "保存",
    clear: "清除",
    saved: "已保存",
    cleared: "已清除",
    permHintPopup:
      "需要 repo（或 fine-grained 的 Contents: 读写）权限。Token 仅保存在本地。",
    createToken: "创建 Token →",
    createTokenFine: "创建 Fine-grained Token →",
    permHintOptionsClassic: "经典 Token：勾选 repo 权限。",
    permHintOptionsFine:
      "Fine-grained：授权目标仓库的 Contents: Read and write。",
    permHintOptionsStorage:
      "Token 仅存储在浏览器本地（chrome.storage.local），不会发送到 GitHub 以外的任何地方。",

    // editor toolbar
    tbBold: "加粗 (Ctrl/Cmd+B)",
    tbItalic: "斜体 (Ctrl/Cmd+I)",
    tbStrike: "删除线",
    tbH1: "标题 1",
    tbH2: "标题 2",
    tbH3: "标题 3",
    tbUl: "• 列表",
    tbUlTitle: "无序列表",
    tbOl: "1. 列表",
    tbOlTitle: "有序列表",
    tbQuote: "❝ 引用",
    tbQuoteTitle: "引用",
    tbCodeTitle: "行内代码",
    tbCodeblock: "代码块",
    tbLink: "🔗 链接",
    tbLinkTitle: "链接",
    tbImage: "🖼 图片",
    tbImageTitle: "插入图片（也支持粘贴 / 拖拽）",
    tbUlText: "列表",
    tbOlText: "列表",
    tbQuoteText: "引用",
    themeToDark: "🌙 深色",
    themeToLight: "☀️ 浅色",
    themeToggleTitle: "切换明暗主题",

    // editor header / new-file bar
    editorPlaceholder: "在此编辑 Markdown…",
    newFileRepoLabel: "仓库",
    newFileBranchLabel: "分支",
    newFilePathLabel: "路径",
    newFileRepoPlaceholder: "owner/repo",
    newFileBranchPlaceholder: "main",
    newFilePathPlaceholder: "docs/new-file.md",
    commitBtn: "提交到 GitHub",
    newFileTitle: "新建文件",

    // commit modal
    modalTitle: "提交更改",
    commitMsgLabel: "提交信息",
    commitBranchLabel: "目标分支",
    cancel: "取消",
    confirmCommit: "确认提交",
    committing: "提交中…",

    // status / hints
    noToken: "未配置 GitHub Token，点击扩展图标进行设置。",
    noTokenShort: "未配置 GitHub Token。",
    loading: "加载文件中…",
    loaded: "已加载",
    newFileWillCreate: "新文件（提交后创建）",
    newFileFillHint: "新建文件：填写仓库与路径后提交",
    commitSuccess: "提交成功",
    commitFailed: "提交失败",
    commitFailedDiagnosing: "提交失败，正在诊断原因…",
    viewCommit: "查看提交",
    pathExists: "路径已存在",
    conflictShort: "检测到冲突",
    conflictRemoteChanged:
      "提交已取消：该文件在你加载后已被其他提交修改（远端内容已变化）。请刷新页面加载最新内容后再改，以免覆盖他人改动。",
    imgNeedPathFirst: "请先在上方填写文件路径，再插入图片，否则图片目录无法确定。",
    docTitleSuffix: "{path} · GitMark",
    newDocTitle: "新建 Markdown · Helper",

    // new-file validation
    errRepoFormat: "请填写仓库，格式 owner/repo。",
    errPathEmpty: "请填写文件路径，例如 docs/note.md。",
    errPathExt: "文件路径需以 .md / .markdown / .mdx 结尾。",
    pathExistsHint:
      "该路径在分支 {branch} 上已存在同名文件，请改用其他路径，或从该文件页直接编辑。",
    commitPlanNew: "将以单次提交新建并提交 {repo}{img}。",
    commitPlanUpdate: "将以单次提交写入 {repo}{img}。",
    imgCount: "，含 {n} 张图片",

    // prompts / placeholders in editor actions
    boldText: "加粗文本",
    italicText: "斜体文本",
    strikeText: "删除线",
    codeText: "代码",
    linkPrompt: "链接地址：",
    linkText: "链接文本",

    // pending bar
    pendingLabel: "待上传图片：",

    // diagnostics
    diag401: "提交失败（401：未认证）。Token 无效或已过期，请在扩展弹窗重新设置后再试。",
    diag409: "提交失败（409：冲突）。目标分支已被更新，请刷新页面重新加载最新内容后再提交。",
    diag422: "提交失败（422）。{raw}",
    diag403NoPush:
      "提交失败（403）：确认原因 —— 你的账号对 {repo} 没有写入(push)权限。\n你只能读取该仓库，无法直接提交。可选方案：\n• Fork 到你自己的账号后，在 fork 上编辑提交；\n• 让仓库所有者把你加为 collaborator（需 Write 角色）。",
    diag403Scope:
      "提交失败（403）：账号本身有写权限，但被拒绝。通常是以下之一：\n• Token 权限不足：Fine-grained 需对该仓库授予 Contents: Read and write；经典 Token 需勾选 repo；\n• 分支保护：{branch} 可能禁止直接推送，请改用其他分支再发 PR。",
    diag403Probe:
      "提交失败（403）。且当前 Token 连仓库信息都读不全，基本可判定为 Token 权限/访问范围不足：\n• Fine-grained：Repository access 要包含该仓库，且 Contents 设为 Read and write；\n• 经典 Token：勾选 repo。\n（附：{err}）",
    diag404: "提交失败（404）。仓库、分支或路径不存在，或 Token 无权访问该私有仓库。",
    diagGeneric: "提交失败：{raw}",
  },

  en: {
    appTitle: "GitMark",
    settingsTitle: "GitMark — Settings",
    injectBtn: "✎ GitMark",
    injectBtnTitle: "Edit this file in GitMark",
    tokenStateLabel: "Token status",
    tokenStateChecking: "Checking…",
    tokenStateVerifying: "Verifying…",
    tokenStateNone: "Not configured",
    tokenStateInvalid: "Invalid token",
    tokenStateConnected: "Connected @{login}",
    langLabel: "Language",
    tabHintDefault: "You can edit directly on a GitHub Markdown file page.",
    tabHintNotMd: "The current tab is not a GitHub Markdown file.",
    editCurrent: "Edit current",
    newFile: "✎ New file",
    patLabel: "Personal Access Token",
    patPlaceholder: "ghp_… or fine-grained token",
    save: "Save",
    clear: "Clear",
    saved: "Saved",
    cleared: "Cleared",
    permHintPopup:
      "Requires repo (or fine-grained Contents: Read and write). Token is stored locally only.",
    createToken: "Create token →",
    createTokenFine: "Create fine-grained token →",
    permHintOptionsClassic: "Classic token: select the repo scope.",
    permHintOptionsFine:
      "Fine-grained: grant Contents: Read and write on the target repo.",
    permHintOptionsStorage:
      "The token is stored only in your browser (chrome.storage.local) and is never sent anywhere other than GitHub.",

    tbBold: "Bold (Ctrl/Cmd+B)",
    tbItalic: "Italic (Ctrl/Cmd+I)",
    tbStrike: "Strikethrough",
    tbH1: "Heading 1",
    tbH2: "Heading 2",
    tbH3: "Heading 3",
    tbUl: "• List",
    tbUlTitle: "Bulleted list",
    tbOl: "1. List",
    tbOlTitle: "Numbered list",
    tbQuote: "❝ Quote",
    tbQuoteTitle: "Quote",
    tbCodeTitle: "Inline code",
    tbCodeblock: "Code block",
    tbLink: "🔗 Link",
    tbLinkTitle: "Link",
    tbImage: "🖼 Image",
    tbImageTitle: "Insert image (paste / drag & drop supported)",
    tbUlText: "List item",
    tbOlText: "List item",
    tbQuoteText: "Quote",
    themeToDark: "🌙 Dark",
    themeToLight: "☀️ Light",
    themeToggleTitle: "Toggle light/dark theme",

    editorPlaceholder: "Write Markdown here…",
    newFileRepoLabel: "Repo",
    newFileBranchLabel: "Branch",
    newFilePathLabel: "Path",
    newFileRepoPlaceholder: "owner/repo",
    newFileBranchPlaceholder: "main",
    newFilePathPlaceholder: "docs/new-file.md",
    commitBtn: "Commit to GitHub",
    newFileTitle: "New file",

    modalTitle: "Commit changes",
    commitMsgLabel: "Commit message",
    commitBranchLabel: "Target branch",
    cancel: "Cancel",
    confirmCommit: "Commit",
    committing: "Committing…",

    noToken: "No GitHub token configured. Click the extension icon to set one.",
    noTokenShort: "No GitHub token configured.",
    loading: "Loading file…",
    loaded: "Loaded",
    newFileWillCreate: "New file (created on commit)",
    newFileFillHint: "New file: fill in repo and path, then commit",
    commitSuccess: "Committed",
    commitFailed: "Commit failed",
    commitFailedDiagnosing: "Commit failed, diagnosing…",
    viewCommit: "View commit",
    pathExists: "Path exists",
    conflictShort: "Conflict detected",
    conflictRemoteChanged:
      "Commit cancelled: this file was changed by another commit after you loaded it (remote content differs). Reload the page to get the latest content before editing, to avoid overwriting others' changes.",
    imgNeedPathFirst:
      "Enter the file path above before inserting an image, otherwise the image directory cannot be determined.",
    docTitleSuffix: "{path} · GitMark",
    newDocTitle: "New Markdown · Helper",

    errRepoFormat: "Enter a repository as owner/repo.",
    errPathEmpty: "Enter a file path, e.g. docs/note.md.",
    errPathExt: "The path must end with .md / .markdown / .mdx.",
    pathExistsHint:
      "A file already exists at this path on branch {branch}. Use another path, or edit it from its file page.",
    commitPlanNew: "Will create and commit to {repo}{img} in a single commit.",
    commitPlanUpdate: "Will write to {repo}{img} in a single commit.",
    imgCount: ", with {n} image(s)",

    boldText: "bold text",
    italicText: "italic text",
    strikeText: "strikethrough",
    codeText: "code",
    linkPrompt: "Link URL:",
    linkText: "link text",

    pendingLabel: "Images to upload:",

    diag401:
      "Commit failed (401 Unauthorized). The token is invalid or expired; re-set it in the extension popup and try again.",
    diag409:
      "Commit failed (409 Conflict). The target branch was updated; reload the page to get the latest content, then commit again.",
    diag422: "Commit failed (422). {raw}",
    diag403NoPush:
      "Commit failed (403): confirmed cause — your account has no push (write) access to {repo}.\nYou can only read this repo and cannot commit directly. Options:\n• Fork it to your account and edit on the fork;\n• Ask the owner to add you as a collaborator (Write role).",
    diag403Scope:
      "Commit failed (403): your account has write access but was denied. Usually one of:\n• Insufficient token scope: fine-grained needs Contents: Read and write on this repo; classic token needs the repo scope;\n• Branch protection: {branch} may forbid direct pushes — use another branch and open a PR.",
    diag403Probe:
      "Commit failed (403). The token cannot even read full repo info, so it is almost certainly a token scope/access problem:\n• Fine-grained: Repository access must include this repo, with Contents set to Read and write;\n• Classic token: select the repo scope.\n(Detail: {err})",
    diag404:
      "Commit failed (404). The repo, branch or path does not exist, or the token cannot access this private repo.",
    diagGeneric: "Commit failed: {raw}",
  },
};

/** Read the persisted language synchronously (falls back to default). */
export function getLang() {
  try {
    const v = localStorage.getItem(LANG_KEY);
    if (SUPPORTED.includes(v)) return v;
  } catch {
    /* ignore */
  }
  return DEFAULT_LANG;
}

/** Persist the chosen language. */
export function setLang(lang) {
  const v = SUPPORTED.includes(lang) ? lang : DEFAULT_LANG;
  try {
    localStorage.setItem(LANG_KEY, v);
  } catch {
    /* ignore */
  }
  // Mirror to chrome.storage so the content script (which runs on the
  // github.com origin and cannot read this page's localStorage) can share it.
  try {
    chrome.storage?.local.set({ [LANG_KEY]: v });
  } catch {
    /* not in an extension context; ignore */
  }
  return v;
}

/**
 * Translate a key, with optional {placeholder} substitution.
 * Unknown keys fall back to the key itself so nothing renders blank.
 */
export function t(key, vars) {
  const lang = getLang();
  const table = STRINGS[lang] || STRINGS[DEFAULT_LANG];
  let s = table[key];
  if (s === undefined) s = STRINGS[DEFAULT_LANG][key];
  if (s === undefined) return key;
  if (vars) {
    s = s.replace(/\{(\w+)\}/g, (m, name) =>
      vars[name] !== undefined ? String(vars[name]) : m
    );
  }
  return s;
}
