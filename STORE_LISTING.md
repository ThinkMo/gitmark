# Chrome Web Store listing — GitMark

## Product details

- **Name:** GitMark
- **Category:** Developer Tools
- **Default language:** English
- **Homepage:** https://github.com/ThinkMo/gitmark
- **Support:** https://github.com/ThinkMo/gitmark/issues
- **Privacy policy:** https://github.com/ThinkMo/gitmark/blob/main/PRIVACY.md

### Summary

Edit and commit GitHub Markdown files with live preview, formatting tools, image uploads, and atomic commits.

### Detailed description

GitMark adds a focused Markdown editing workflow to GitHub. Open an existing Markdown file or create a new one, edit in a split-pane editor, and review the rendered result in real time.

Formatting controls cover headings, lists, quotes, links, inline code, and code blocks. Images can be pasted, dropped, or selected from disk. GitMark commits the Markdown file and pending images together in one atomic GitHub commit.

GitMark has no developer-operated server, analytics, advertising, or tracking. Your GitHub Personal Access Token is stored in Chrome's local extension storage and is sent only to GitHub's official API for actions you request.

## Privacy practices

### Single purpose

Edit and commit Markdown files in GitHub repositories directly from a browser-based Markdown editor.

### Permission justifications

- **storage:** Stores the GitHub Personal Access Token and language preference in Chrome's local extension storage. Theme preference is stored in extension localStorage.
- **activeTab:** Reads the active tab URL after the user opens GitMark so it can identify the current GitHub repository and Markdown file.
- **Host access — github.com:** Adds the GitMark edit button to GitHub Markdown file pages.
- **Host access — api.github.com:** Reads repository metadata and files, validates the user-provided token, and creates user-requested commits.

### Remote code

No. All executable code, including the Markdown renderer, is packaged with the extension.

### Data handling disclosure

GitMark handles authentication information, website content, and user-provided Markdown and images. The token and preferences are stored locally. Markdown and images are sent over HTTPS only to GitHub's official API when needed to load a file or when the user explicitly submits a commit. No data is sent to the developer, sold, used for advertising, or used for creditworthiness or lending.

## Reviewer test instructions

1. Open the extension popup and enter a GitHub Personal Access Token with access to a test repository. A fine-grained token with `Contents: Read and write` is sufficient.
2. Open a Markdown file in that repository and select **Edit current**, or select **New file** in the popup.
3. Edit the Markdown content and verify that the preview updates.
4. Submit a commit to the test repository. The extension sends requests only to `api.github.com`.
5. Use **Clear** in the popup to remove the locally stored token.

Do not provide a personal production token in reviewer instructions. If reviewer credentials are required, use a dedicated test account and repository with the minimum required access.

## Store assets

- `images/store/01-popup.png` — 1280×800 screenshot
- `images/store/02-editor.png` — 1280×800 screenshot
- `images/store/promo-440x280.png` — 440×280 small promotional image
- `icons/icon128.png` — 128×128 extension icon
