# 方舟动物园助手

线下实体桌游的中文手机助手。纯原生 JavaScript、Cloudflare Workers + Durable Objects，无运行时构建步骤。线上：https://ark.leisurecat.cloud（custom domain），仓库 86777835/ark-nova-helper，部署用 `wrangler deploy`。

## 功能与文件

- `public/logic.js`：原始两轨与42个保护格映射、新旧计分、终局两种互斥输入、三项防错、同分项目次数、并列、配置与服务端动作校验、单步撤销。
- `public/steps.js`：1–4人、基础/完整海洋、计分口径及各玩家地图的准备清单；海洋换牌18个卡号与20张行动、轮抽、大学与声望；双人封锁；按需休息与终局时机。地图包1的9、10分别有准备和能力提示，每条附版本/官方出处。
- `public/index.html`、`app.js`、`dom.js`、`style.css`：手机页面与morph增量渲染，WebSocket同步、熟手直达计分、任一手机打开休息清单、各人确认与代填、结算长图、评价卡。普通多人没有轮次推进。
- `src/worker.js`：Room / Lobby / Archive，权威reduce、revision冲突检查、主持人权限、自动存档及回原房修订；主持凭据不广播。
- `public/history.*`：按模式、基础/海洋、人数、玩家/房间/地图过滤；统计统一新版，按人数、扩展、官方单人难度分组。
- `tools/讲解稿.md`、`tools/faq.json`：9节教程、24条FAQ。`public/guide.*` 支持关键词别名、版本和卡号过滤；`public/solo.html` 为官方单人准备/结算及明确标注的社区ARNO外链。
- `src/chat.js`、`src/sse.js`、`public/chat.js`：先依据上述两份本站资料回答；Flash → Qwen → Pro，每级9秒开始/停顿8秒切换；读取匹兹堡KV，不建cron、不显示模型名。
- 联网查找（2026-11-12，照匹兹堡试点移植）：本站资料没有答案的方舟规则问题，模型只回一行「【需联网】+英文搜索词」（以 Ark Nova 开头，涉及具体卡牌带英文名或编号，海洋世界带 Marine Worlds），服务器调 DeepSeek 搜索接口（`/v1/tools/search`，先只搜 BGG，不足3条再搜全网，最多6条），再让模型只依据摘要作答、用 [1] [2] 标出处，并指出每个说法属于基础、新版计分、旧版计分还是海洋世界。页面在这类回答上方固定显示「本站资料没有这一条，以下来自网上讨论，本站未核对」，下面列来源链接；搜不到或搜索失败就明说，不编。无关问题不联网。服务器只按整行转发模型输出，模型先解释再要求联网时也能接住。每次联网在日志记一条 `chat web search`，核对后补进常见问题。
- `public/teach.html`、`teach.js`（2026-11-13）：「6 分钟讲规则」，首页「创建新房间」下面有入口。讲稿8段（怎么赢、你面前有什么、一回合挑一张行动卡、建造和动物、卡牌/协会/赞助商、保护项目、休息、结束和计分），只玩基础约1530字、带海洋世界约1700字；顶部切换「只玩基础 / 带海洋世界」，每台手机记在 localStorage，默认基础。计分按新版讲，旧版放在注意事项里。注意事项基础20条、海洋世界再加7条，每条写好答案、默认收起，「问」按钮的问题都在本站常见问题里有答案，通过 `public/chat.js` 的 `window.askRules` 交给规则助手。术语点开看图和注释，末尾有图标速查。
- `public/img/teach/`：47张图，截自 Capstone Games 英文版官方规则书（基础版、海洋世界），共约280 KB，页脚署名并链接原文，见 `docs/素材来源.md`。
- `public/img/ark-nova.jpg`：总入口591×720英文官方封面，逐字节复制，无放大或重绘。`nature.jpg` 与 `avatar.png` 为Codex内置图片工具原创，见 `docs/素材来源.md`。
- `public/_headers`：图片7天、vendor一年。`wrangler.jsonc` Worker暂名 `ark-nova-helper`、namespace `1091`、原KV绑定、observability，route 为 `ark.leisurecat.cloud`（custom domain），无 cron。

## 本地运行与验证

```sh
ln -s /tmp/claude-501/pgh2/node_modules node_modules
wrangler dev --port 8921
# 在另一终端，根目录运行：
node tests/run.mjs
# 测完停止 wrangler，删临时链接：
rm node_modules
```

`tests/run.mjs` 串行执行10个测试文件，写入 `tests/测试结果.md`。

讲规则页的测试 `tests/test_teach.mjs` 拦截 `/api/chat` 和评价接口、不写任何数据，可以直接对线上跑：`node tests/test_teach.mjs https://ark.leisurecat.cloud/ <截图目录>`。查入口、两种模式的字数和注意事项条数、47个术语都能打开图和注释、每个「问」的问题都在常见问题里、图标速查的图都能加载、375px 宽不横向滚动、海洋世界刷新后记住。

规则助手的模型切换和联网查找另跑（假 DeepSeek 服务在 8790 端口，两条之间隔1分钟以上，避开每分钟8问的限流）：

```sh
wrangler dev --port 8921 --var DEEPSEEK_API_KEY:fake --var DEEPSEEK_BASE:http://127.0.0.1:8790 --var CHAT_CF_MODEL:@cf/none/missing
node tests/test_chat.mjs http://localhost:8921/ /tmp/claude-501/codex_tasks/shots --mock-upstream   # 备用模型切换、排队、中途停顿
node tests/test_chat.mjs http://localhost:8921/ /tmp/claude-501/codex_tasks/shots --mock-web        # 联网查找：能答不联网、标记拆块、先解释后标记、没搜到、搜索失败、无关问题、历史不带标签
node tests/test_chat.mjs https://ark.leisurecat.cloud/ /tmp/claude-501/codex_tasks/shots --live     # 线上实问：一题本站能答、一题要联网
```浏览器依赖playwright-core与本机Chrome。完整对局测试只允许localhost/127.0.0.1；评价全部拦截，不往线上写数据。规则助手采用 `--no-key`，不调用远程模型。另有本地拦截流测试验证Qwen格式与中途reset不显示模型名。

截图目录：`/tmp/claude-501/codex_tasks/shots/`，前缀 `ark_`。包括落地、基础/海洋配置、准备、休息、两轨新旧计分、结算、长图、教程、FAQ、单人说明和单人结算。

## 内容维护

```sh
node tools/make_content.mjs
node tools/build_pages.mjs
```

这是维护时的生成工具，静态产物已提交到当前工作目录；运行和部署无需构建。`steps.js` 清单独立维护，每条规则带版本及来源。`tools/faq.json` 同步生成到 `public/faq.json`，教程页是已生成的静态HTML。

## 边界与已知限制

- 未做单人计步器、地图编辑器、全程资源账本、隐藏牌库、地图包2专门提示、自动对手或全卡连锁引擎。
- 完整海洋指准备组件与通用规则均覆盖，不是逐张变体行动卡数据库；具体卡号例外未收录时明确查海洋术语表对应I/II面。卡号搜索只搜索已收录条目。
- 基础地图A/0/1–8都可记录；1、2、4–8补有官方术语表p8澄清，3号图的印制能力不转录，提示查实物与规则。地图包1的9/10均有专门提示。其他地图只记编号和提供官方链接。
- 自动换算限定已核验的实物轨道：魅力0–114、保护点数0–41。超轨数值明确报错，不外推公式。42格目标映射见 `tests/test_logic.mjs`，规则来源见 `docs/规则核验.md`。
- 房间凭四位码同桌协作，无登录系统；持码者可代填任意玩家分数，主持负责配置、结算、修订与撤销。第一位连接者领取主持权，凭据保存在浏览器localStorage；请保留主持手机数据。
- 撤销为上一步共享操作；修订会暂时撤下旧存档，重新结算后以同一gid覆盖。表单未提交草稿保存在当前页面内存，能跨同步和断线保留，刷新页面会丢弃未提交草稿。
- 未实测微信真机；已测Chrome手机视口390px/320px、触控、导航、断线重连。复制链接依赖浏览器剪贴板支持；失败会显示错误，可手动分享地址栏。
- 线上密钥已由用户设置（`wrangler secret put DEEPSEEK_API_KEY --name ark-nova-helper`），2026-11-12 线上实测普通回答和联网查找都正常；无密钥时显示明确错误。KV本地模拟，不更改匹兹堡线上检查结果。

游戏、规则与官方盒封版权归原权利方。本站讲解为自行概括的非官方辅助说明。
