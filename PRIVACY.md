# GitMark 隐私政策 / Privacy Policy

_最后更新 / Last updated: 2026-09-10_

---

## 中文

GitMark 是一款浏览器扩展，用于在 GitHub 上直接编辑并提交 Markdown 文档。我们高度重视你的隐私。本政策说明本扩展收集哪些数据、如何使用、以及数据流向。

### 一句话总结

**GitMark 不设任何自有服务器。Token 与偏好保存在本地；仅为提供核心功能，通过 HTTPS 将必要数据发送给 GitHub 官方 API（`api.github.com`）。开发者不会接收、收集、出售或将这些数据用于广告。**

GitMark 对用户数据的使用仅限于提供其单一用途，并遵守 [Chrome Web Store 用户数据政策](https://developer.chrome.com/docs/webstore/user_data)，包括 Limited Use 要求。GitMark 不会将用户数据用于广告、出售用户数据或允许人工读取用户数据。

### 我们存储什么

| 数据 | 存储位置 | 用途 | 是否离开你的设备 |
|---|---|---|---|
| GitHub Personal Access Token (PAT) | `chrome.storage.local`（浏览器本地） | 调用 GitHub API 读取/提交文件 | 是。仅作为 HTTPS 请求的鉴权头发送给 `api.github.com` |
| 语言偏好（`gmh-lang`） | `chrome.storage.local` / `localStorage` | 记住界面语言（中/英） | 否 |
| 主题偏好（`gmh-theme`） | `localStorage` | 记住明暗主题 | 否 |
| 你编辑的 Markdown 内容与插入的图片 | 内存（提交时发送到 GitHub） | 编辑与提交 | 仅在你点击「提交」时发送到 `api.github.com`，写入你指定的仓库 |

### 数据发往何处

本扩展**仅**与以下域通信：

- `https://api.github.com` — 读取文件、校验 Token、创建提交
- `https://github.com` — 仅用于在你打开的 GitHub 页面上注入「编辑」按钮（不发送数据）
- 预览中已提交的图片会通过 GitHub API 拉取以便显示

本扩展**不会**将任何数据发送到开发者服务器或任何第三方分析、广告、跟踪服务——因为**根本不存在这样的服务器**。

### 权限说明

- `storage`：在本地保存你的 Token 与偏好设置。
- `activeTab`：当你点击扩展图标时，读取当前标签页的 URL，判断是否为可编辑的 GitHub Markdown 页面。
- `host_permissions`（`github.com`、`api.github.com`）：注入编辑按钮并调用 GitHub API。

### 你的控制权

- 可随时在扩展弹窗或设置页点击「清除」删除已保存的 Token。
- 卸载扩展会清除其在本地存储的一切数据。
- Token 的权限范围由你在 GitHub 端创建时自行决定（建议使用 fine-grained token 并仅授权目标仓库的 Contents: Read and write）。

### 联系方式

如有隐私相关问题，请在项目仓库提交 issue。

---

## English

GitMark is a browser extension for editing and committing Markdown files directly on GitHub. We take your privacy seriously. This policy explains what data the extension handles, how it is used, and where it goes.

### In one sentence

**GitMark has no server of its own. Tokens and preferences are stored locally; only data required for the extension's core function is sent over HTTPS to GitHub's official API (`api.github.com`). The developer does not receive, collect, sell, or use this data for advertising.**

GitMark's use of user data is limited to providing its single purpose and complies with the [Chrome Web Store User Data Policy](https://developer.chrome.com/docs/webstore/user_data), including the Limited Use requirements. GitMark does not use user data for advertising, sell user data, or allow humans to read user data.

### What we store

| Data | Where | Purpose | Leaves your device? |
|---|---|---|---|
| GitHub Personal Access Token (PAT) | `chrome.storage.local` (local) | Authenticate GitHub API calls to read/commit files | Yes. Sent only to `api.github.com` as an HTTPS authorization header |
| Language preference (`gmh-lang`) | `chrome.storage.local` / `localStorage` | Remember UI language (zh/en) | No |
| Theme preference (`gmh-theme`) | `localStorage` | Remember light/dark theme | No |
| The Markdown you edit and images you insert | In memory (sent to GitHub on commit) | Editing and committing | Only when you click "Commit", sent to `api.github.com` into your chosen repo |

### Where data goes

The extension communicates **only** with:

- `https://api.github.com` — read files, validate the token, create commits
- `https://github.com` — solely to inject an "Edit" button on GitHub pages you open (no data sent)
- Already-committed images shown in the preview are fetched via the GitHub API

The extension does **not** send any data to a developer server or to any third-party analytics, advertising, or tracking service — because **no such server exists**.

### Permissions

- `storage`: save your token and preferences locally.
- `activeTab`: when you click the extension icon, read the current tab's URL to detect whether it is an editable GitHub Markdown page.
- `host_permissions` (`github.com`, `api.github.com`): inject the edit button and call the GitHub API.

### Your control

- Remove your saved token anytime via "Clear" in the popup or options page.
- Uninstalling the extension removes everything it stored locally.
- The token's scope is entirely up to you when you create it on GitHub (a fine-grained token limited to the target repo's Contents: Read and write is recommended).

### Contact

For privacy questions, please open an issue in the project repository.
