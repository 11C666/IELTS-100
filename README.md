# IELTS Speaking & Writing 001–100

一套完全离线、无框架、无外部依赖的 100 天 IELTS 主题学习网站。现已包含 Day 001–100 的完整课程、2000 个 Vocabulary 词条、200 道 Speaking 练习和 100 篇原创 Academic Reading 短文。

## 打开网站

直接双击 `index.html` 即可使用。网站使用 `js/content.js` 作为 `file://` 模式下的离线数据回退，因此不需要服务器。

如果要验证独立 JSON 文件加载流程或进行本地开发，可在项目目录运行任意静态服务器，例如：

```bash
python -m http.server 8000
```

然后访问 `http://localhost:8000/`。网站本身不调用任何在线 API，也不加载在线字体、图标或脚本。语音播放由浏览器和设备的语音服务提供，部分高质量在线音色需要联网。

## 数据结构

- `data/topics.json`：100 天主题目录。
- `data/day-XXX.json`：单日课程数据。
- `data/schema.json`：课程 JSON Schema。
- `js/content.js`：Day 001–003 的离线数据镜像。
- `js/generated-content.js`：Day 004–100 的静态离线数据镜像。
- `content/manual-days-004-020.js`：逐 Topic 人工编写的 Day 004–020 内容源。

每个课程对象包含：`id`、`topic`、`topicCN`、`category`、`vocabulary`、`paraphrases`、`sentences`、`expressions`、`mistakes`、`writingIdeas`、`speaking` 和 `reading`。

## 新增或修改一天

1. 复制一个 `data/day-XXX.json`，按 `data/schema.json` 填写内容。
2. 在 `data/index.json` 的 `publishedDays` 和 `dataFiles` 中登记新文件。
3. 将同一课程对象加入 `js/content.js` 的 `window.IELTS_DAYS`，以保证直接双击打开仍可用。
4. 如修改主题名称或分类，同步更新 `data/topics.json` 与 `window.IELTS_TOPICS`。
5. Day 004–020 必须逐 Topic 人工编辑 `content/manual-days-004-020.js`，再运行 `node tools/publish_manual_content.js` 序列化；该脚本不生成正文。运行 `node tools/export-data.js` 可从静态离线镜像导出课程。

内容应严格自查：20 个自然且相关的词汇搭配、8 组可在相近语境替换的表达、3 个自然句型、5 个口语表达、3 个真实常见错误、2 个有因果展开的写作观点、2 个自然口语回答，以及一篇 300–500 词的原创学术风格短文和 3 道答案唯一的题目。

## Mobile, tablet and PWA use / 移动端、平板与 PWA

The existing desktop layout is preserved. The same site now adapts automatically to iPhone, iPad, Android phones and tablets. Vocabulary becomes a single-column card list on phones and remains a two-column grid on tablets. Reading width is limited for comfortable continuous reading, while section navigation becomes a sticky, horizontally scrollable row on smaller screens.

现有桌面布局保持不变。网站会自动适配 iPhone、iPad、Android 手机和平板；手机端 Vocabulary 使用单列卡片，平板端使用双列布局，Reading 正文限制最大宽度，章节导航在小屏幕上变为顶部横向滚动导航。

### First visit and offline use / 首次访问与离线使用

Open the site once through GitHub Pages or a local HTTP server while connected to the internet. The service worker then stores the application shell, icons and all 100 Day JSON files. After that first complete load, the core lessons, notes and progress can be opened without a network connection. Directly opening `index.html` still works for ordinary local study, but PWA installation and service-worker caching require HTTP or HTTPS.

首次请在联网状态下通过 GitHub Pages 或本地 HTTP 服务器完整打开一次。Service Worker 会缓存网站核心文件、图标以及全部100个 Day JSON。首次缓存完成后，核心课程、Notes 和学习进度可以离线使用。直接双击 `index.html` 的原有学习方式仍然保留，但 PWA 安装与 Service Worker 离线缓存必须通过 HTTP/HTTPS 使用。

### Add to Home Screen / 添加到主屏幕

- **iPhone / iPad:** Open the GitHub Pages site in Safari → Share → Add to Home Screen → Add.
- **Android:** Open in Chrome → Install app or Add to Home screen.
- **Windows / macOS:** Open in Edge or Chrome and choose Install app from the browser menu or address bar.

### Device-local progress / 单设备学习记录

Progress, favorites and notes continue to use `localStorage`. They remain stable on each device but do not sync between devices. Completing Day 10 on a computer therefore does not automatically mark it complete on an iPhone. No account, cloud database or login system has been added.

### Updating the offline cache / 更新离线缓存

The cache name is defined as `CACHE_NAME` in `service-worker.js`. For a future release, change `ielts-mastery-v1` to `ielts-mastery-v2` (and continue incrementing for later releases). When the new service worker activates, caches from older versions are removed automatically.

## GitHub Pages

将整个目录推送到 GitHub 仓库。在仓库 Settings → Pages 中选择 **Deploy from a branch**，再选择主分支和根目录。项目使用相对路径，可直接部署在项目子路径下。

## 本地学习记录

记录保存在浏览器 `localStorage` 的 `ielts100StateV1` 键中：

```json
{
  "completed": [1],
  "favorites": ["1:curriculum"],
  "lastDay": 1,
  "notes": {"1": "My notes..."},
  "started": [1, 2]
}
```

清除浏览器数据会删除记录。Topic Map 页面底部的 Reset Progress 需要两次确认。

## 内容与版权

前三天文章、例句、口语答案和论证均为本项目原创。内容只借鉴 IELTS 官方公开的考试结构、评分维度与题型特点，不复制 Cambridge IELTS 真题、范文或受版权保护的文章。

## 英语发音与播放

所有课程的单词、搭配、自然表达例句和口语答案共用同一套发音设置。打开课程顶部的 **发音设置 / Audio settings** 可试听并选择设备提供的英语音色，以及 0.8×（慢速）、0.9×（默认舒适语速）或 1.0×（标准语速）。选择会保存在当前设备，不影响学习进度。

自动模式优先选择标有 Natural、Neural、Premium 或 Enhanced 的英语音色，同档音色优先英式英语；具体音质取决于操作系统提供的语音包。iPhone/iPad 可在系统“辅助功能 → 朗读内容”中的声音设置下载英语增强音色；离线学习请选择已下载的本地音色。不同设备的音色列表可能不同。

点击发音按钮从头播放，再点一次停止。长答案按标点和长度连续分段朗读，切换内容会取消旧播放；离开课程、收起正在播放的章节或切到后台会停止，返回后点击可从头播放。播放未启动或语音服务报错时，会展开设置并显示重试提示。

修改发音代码后需要同时递增 `service-worker.js` 的缓存版本，让已安装的 PWA 获取新版文件。当前版本为 `ielts-mastery-v3`。

验证播放状态与回调竞争：`node tools/qa_pronunciation.js`。浏览器验证：`node tools/qa_expression_pronunciation.js`（需要 Playwright；可通过 `CHROMIUM_PATH` 指定浏览器）。自动检查使用模拟语音引擎，实际音质和音频输出仍需在目标设备试听。
