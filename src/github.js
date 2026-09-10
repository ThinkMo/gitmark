/**
 * github.js — GitHub REST API helpers for GitMark.
 *
 * Uses a Personal Access Token (PAT) stored in chrome.storage. A pure
 * client-side extension cannot safely complete an OAuth flow without a
 * server to hold the client secret, so PAT is the clean, self-contained
 * option here.
 *
 * The commit path uses the Git Data API (blob -> tree -> commit -> ref)
 * so a Markdown edit and any number of images land in a SINGLE commit.
 */

const API = "https://api.github.com";

/** Read the saved PAT from extension storage. */
export async function getToken() {
  const { token } = await chrome.storage.local.get("token");
  return token || "";
}

/** Persist / clear the PAT. */
export async function setToken(token) {
  await chrome.storage.local.set({ token: token || "" });
}

function authHeaders(token, extra = {}) {
  return {
    Authorization: `Bearer ${token}`,
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    ...extra,
  };
}

/** Low-level fetch wrapper that throws readable errors. */
async function api(path, { token, method = "GET", body, headers } = {}) {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: authHeaders(token, headers),
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let data = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
  }
  if (!res.ok) {
    const msg = (data && data.message) || res.statusText || "Request failed";
    const err = new Error(`GitHub API ${res.status}: ${msg}`);
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}

/** Return the authenticated user (used to validate a token). */
export function getAuthenticatedUser(token) {
  return api("/user", { token });
}

/** Repo metadata — we mainly need default_branch and permissions. */
export function getRepo(token, owner, repo) {
  return api(`/repos/${owner}/${repo}`, { token });
}

/**
 * Fetch a file's decoded UTF-8 content plus its blob sha.
 * Returns { content, sha } or { content: "", sha: null } when the file
 * does not yet exist (so callers can create it).
 */
export async function getFile(token, owner, repo, path, ref) {
  const q = ref ? `?ref=${encodeURIComponent(ref)}` : "";
  try {
    const data = await api(
      `/repos/${owner}/${repo}/contents/${encodePath(path)}${q}`,
      { token }
    );
    if (Array.isArray(data)) {
      throw new Error(`Path is a directory, not a file: ${path}`);
    }
    // content is base64 with newlines; decode to UTF-8.
    const content =
      data.encoding === "base64"
        ? utf8FromBase64(data.content.replace(/\n/g, ""))
        : data.content || "";
    return { content, sha: data.sha };
  } catch (e) {
    if (e.status === 404) return { content: "", sha: null };
    throw e;
  }
}

function encodePath(path) {
  return path
    .split("/")
    .map((seg) => encodeURIComponent(seg))
    .join("/");
}

/**
 * Fetch a (possibly binary) file and return a data: URL, so images already
 * committed to the repo can be shown in the editor preview where a relative
 * path cannot resolve. Returns "" when the file is missing.
 */
export async function getFileAsDataUrl(token, owner, repo, path, ref) {
  const q = ref ? `?ref=${encodeURIComponent(ref)}` : "";
  try {
    const data = await api(
      `/repos/${owner}/${repo}/contents/${encodePath(path)}${q}`,
      { token }
    );
    if (Array.isArray(data) || !data.content) return "";
    const b64 = data.content.replace(/\n/g, "");
    const mime = guessMime(path);
    return `data:${mime};base64,${b64}`;
  } catch (e) {
    if (e.status === 404) return "";
    throw e;
  }
}

function guessMime(path) {
  const ext = (path.split(".").pop() || "").toLowerCase();
  const map = {
    png: "image/png",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    gif: "image/gif",
    webp: "image/webp",
    svg: "image/svg+xml",
    bmp: "image/bmp",
    ico: "image/x-icon",
  };
  return map[ext] || "application/octet-stream";
}

/** Resolve the tip commit sha + tree sha for a branch. */
async function getBranchTip(token, owner, repo, branch) {
  const ref = await api(
    `/repos/${owner}/${repo}/git/ref/heads/${encodeURIComponent(branch)}`,
    { token }
  );
  const commitSha = ref.object.sha;
  const commit = await api(
    `/repos/${owner}/${repo}/git/commits/${commitSha}`,
    { token }
  );
  return { commitSha, treeSha: commit.tree.sha };
}

/** Create a blob and return its sha. `content` is base64 for binary. */
async function createBlob(token, owner, repo, content, encoding) {
  const data = await api(`/repos/${owner}/${repo}/git/blobs`, {
    token,
    method: "POST",
    body: { content, encoding },
  });
  return data.sha;
}

/**
 * Commit a Markdown file plus optional image assets in one atomic commit.
 *
 * @param {object} p
 * @param {string} p.token
 * @param {string} p.owner
 * @param {string} p.repo
 * @param {string} p.branch          target branch
 * @param {string} p.path            markdown file path
 * @param {string} p.content         markdown text (UTF-8)
 * @param {string} p.message         commit message
 * @param {Array}  [p.images]        [{ path, base64 }] additional binary files
 * @returns {Promise<{commitSha:string, htmlUrl:string}>}
 */
export async function commitFiles({
  token,
  owner,
  repo,
  branch,
  path,
  content,
  message,
  images = [],
}) {
  const { commitSha, treeSha } = await getBranchTip(token, owner, repo, branch);

  // Build blobs for the markdown file and every image.
  const tree = [];

  const mdBlob = await createBlob(
    token,
    owner,
    repo,
    utf8ToBase64(content),
    "base64"
  );
  tree.push({ path, mode: "100644", type: "blob", sha: mdBlob });

  for (const img of images) {
    const sha = await createBlob(token, owner, repo, img.base64, "base64");
    tree.push({ path: img.path, mode: "100644", type: "blob", sha });
  }

  const newTree = await api(`/repos/${owner}/${repo}/git/trees`, {
    token,
    method: "POST",
    body: { base_tree: treeSha, tree },
  });

  const newCommit = await api(`/repos/${owner}/${repo}/git/commits`, {
    token,
    method: "POST",
    body: { message, tree: newTree.sha, parents: [commitSha] },
  });

  await api(
    `/repos/${owner}/${repo}/git/refs/heads/${encodeURIComponent(branch)}`,
    {
      token,
      method: "PATCH",
      body: { sha: newCommit.sha, force: false },
    }
  );

  return {
    commitSha: newCommit.sha,
    htmlUrl: `https://github.com/${owner}/${repo}/commit/${newCommit.sha}`,
  };
}

/* ---------- base64 / UTF-8 helpers (service-worker & page safe) ---------- */

export function utf8ToBase64(str) {
  const bytes = new TextEncoder().encode(str);
  return bytesToBase64(bytes);
}

export function utf8FromBase64(b64) {
  const bytes = base64ToBytes(b64);
  return new TextDecoder().decode(bytes);
}

export function bytesToBase64(bytes) {
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode.apply(
      null,
      bytes.subarray(i, i + chunk)
    );
  }
  return btoa(binary);
}

function base64ToBytes(b64) {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}
