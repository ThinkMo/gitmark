# GitMark

一个 Chrome 扩展（Manifest V3），用于在 GitHub 上**直接编辑并提交 Markdown 文档**，支持文本编辑、实时预览与图片上传，且文本与图片会在**同一次原子提交**中写入仓库。

> 隐私：GitMark 无自有服务器，所有数据仅存本地，网络请求只发往 `api.github.com`。详见 [隐私政策](PRIVACY.md)。

## 功能

- 在 GitHub 的 Markdown 文件页（`.../blob/<branch>/<file>.md`）注入「✎ GitMark」按钮，一键进入编辑器。
- 分栏编辑器：左侧编辑、右侧实时预览（基于 [marked](https://github.com/markedjs/marked)）。
- 格式化工具栏：加粗 / 斜体 / 删除线、标题、列表、引用、行内代码 / 代码块、链接。快捷键 `Ctrl/Cmd+B`、`Ctrl/Cmd+I`、`Ctrl/Cmd+S`（提交）。
- 图片支持三种方式插入：**粘贴**、**拖拽**、**文件选择**。图片会存放到 Markdown 同级的 `assets/` 目录，并自动插入相对路径的引用。
- **原子提交**：Markdown 文本与所有新增图片通过 Git Data API（blob → tree → commit → ref）一次性提交，避免半成品状态。
- 编辑已有文件时会做**并发冲突检测**：若文件在你加载后被他人提交修改，提交会被拦截并提示刷新，避免覆盖他人改动。
- 既能**更新**已有文件，也能**新建**文件。
- **明暗双主题**：编辑器工具栏可一键切换深色 / 浅色，偏好本地持久化。
- **中英双语**：在扩展弹窗（主菜单）的「语言」下拉框切换中文 / English，popup、选项页、编辑器与注入按钮均随之切换。

## 目录结构

```
manifest.json
src/
  background.js   # 打开编辑器标签页的服务工作线程
  content.js      # 在 GitHub 页面注入编辑按钮
  content.css
  github.js       # GitHub REST/Git Data API 封装（鉴权、读取、原子提交）
  i18n.js         # 中英文字符串表与翻译函数（各页面共用）
editor/
  editor.html / editor.css / editor.js   # 分栏编辑器
  preload.js      # 渲染前同步应用主题/语言，避免闪烁（外置以符合 CSP）
popup/
  popup.html / popup.css / popup.js       # Token 设置 + 语言切换 + 快捷入口
options/
  options.html    # 完整设置页（复用 popup.js）
vendor/
  marked.min.js   # 本地内置的 Markdown 渲染库
icons/            # 16/32/48/128 图标
```

## 安装（开发者模式加载）

1. 打开 `chrome://extensions`。
2. 打开右上角「开发者模式」。
3. 点击「加载已解压的扩展程序」，选择本项目根目录。

## 配置 GitHub Token

由于纯前端扩展无法安全保管 OAuth client secret，本扩展使用 **Personal Access Token (PAT)** 进行鉴权。Token 仅保存在浏览器本地（`chrome.storage.local`），只会发往 `api.github.com`。

1. 点击扩展图标，在弹窗底部填入 Token 并保存；或右键扩展 → 选项。
2. Token 权限：
   - **经典 Token**：勾选 `repo`。
   - **Fine-grained Token**：对目标仓库授予 `Contents: Read and write`。
3. 保存后弹窗会显示 `已连接 @<用户名>`，即验证通过。

创建入口：<https://github.com/settings/tokens?type=beta>

## 使用

### 编辑已有文件

1. 在 GitHub 上打开任意 Markdown 文件（`.md/.markdown/.mdx` 等）。
2. 点击页面中的「✎ GitMark」按钮（或在扩展弹窗点「编辑当前」）。
3. 在编辑器中修改文本、粘贴/拖拽/选择图片。
4. 点击「提交到 GitHub」，填写提交信息与目标分支，确认后即完成单次提交，并给出提交链接。

### 新建文件

1. 点击扩展图标，在弹窗点「✎ 新建 Markdown 文件」。若当前正停留在某仓库页，会自动预填 `owner/repo` 与分支。
2. 编辑器顶部会出现「仓库 / 分支 / 路径」栏：填写目标仓库（`owner/repo`）、分支（留空则用默认分支）与文件路径（如 `docs/note.md`）。
3. 编辑内容并可插入图片（图片按填写的路径就近存入 `assets/`）。
4. 点击「提交到 GitHub」确认。提交前会检查目标路径是否已存在，避免误覆盖；创建成功后自动切换为编辑模式。

## 实现要点

- **原子提交**在 [github.js](src/github.js) 的 `commitFiles()` 中实现：为 Markdown 与每张图片创建 blob，构建基于当前分支 `base_tree` 的新 tree，创建 commit 并 `PATCH` 分支 ref。
- **图片路径**：默认写入 `<markdown 所在目录>/assets/<时间戳>-<文件名>`，插入的 Markdown 引用使用相对该文档的路径。
- **冲突检测**：编辑现有文件时记录加载时的 blob sha，提交前重新拉取比对；不一致则中止提交，防止覆盖他人改动。
- **国际化**：[i18n.js](src/i18n.js) 提供 zh/en 字符串表；语言存于 `localStorage` 并镜像到 `chrome.storage`，供运行在 github.com 域的 [content.js](src/content.js) 读取以本地化注入按钮。
- **预览安全**：预览区在写入前对 `marked` 输出做一次消毒（移除脚本类节点、内联事件属性与 `javascript:` 链接），叠加 MV3 CSP 双重防护。
- **SPA 导航**：GitHub 使用 Turbo/pushState，[content.js](src/content.js) 监听 `turbo:load`、`popstate` 及 `pushState/replaceState` 以在导航后重新注入按钮。

## 已知限制

- 通过 REST API 提交属于普通提交，不生成 Pull Request（如需 PR 可自行在目标分支基础上扩展）。
- 大文件受 GitHub Contents/Git Data API 大小限制约束。
- 图片以 base64 blob 形式上传，超大图片会较慢。

## 依赖

- [marked](https://github.com/markedjs/marked) v12.0.2（MIT，已内置于 `vendor/`）。

## 许可

本项目基于 [MIT 许可](LICENSE) 开源，可自由使用、修改、分发与商用，仅需保留版权与许可声明。

内置的 [marked](https://github.com/markedjs/marked)（Copyright © 2011-2024 Christopher Jeffrey）同为 MIT 许可。

