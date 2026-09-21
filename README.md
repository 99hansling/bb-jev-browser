# bb-jev-browser

**真实 Chrome 登录态（[bb-browser](https://github.com/epiral/bb-browser)）× TypeSafe Jev 决策层**，失败时回退到旧的 snapshot/ref 启发选择。

> 本仓是薄封装，不 fork / 不 vendor `epiral/bb-browser`。`my-skills` 的 private 推送流程不受影响。

## 为什么混合

| 层 | 工具 | 负责 |
| --- | --- | --- |
| 身份 / 执行 | bb-browser | 用户真实登录的 Chrome、cookies、站点适配 |
| 决策（主力） | Jev `choice` + `noul` | 在封闭候选 ref 表上选下一步 |
| 决策（fallback） | 旧逻辑 | 无 key、HTTP 失败、低置信度时用关键词重叠选 ref |

这不是「用 jev-browser 替换 bb-browser」。Playwright 新档案解决不了「必须已经是用户本人登录态」的问题。

相关对照：[browser-use/jev-ultrafast](https://github.com/browser-use/jev-ultrafast)（无登录态高速环）、[Ying-Kai-Liao/jev-browser](https://github.com/Ying-Kai-Liao/jev-browser)（Playwright+Jev）。

## 安装

## API Key（推荐 Keychain，全局）

**不要把 key 写进仓库、commit、聊天或 `.env` 提交。**

本机全局推荐：macOS Keychain，service 名 `typesafe`，account 为你的 macOS 用户名。

```bash
# 交互写入（输入时不回显）
~/Documents/bb-jev-browser/scripts/store-typesafe-key-keychain.sh

# 确认存在（不打印 value）
security find-generic-password -a "$USER" -s typesafe >/dev/null && echo present
```

`bb-jev` 会按顺序读：环境变量 `TYPESAFE_API_KEY` → Keychain `typesafe`。  
Claude Code / compaction 若也要 key，可另在 `~/.claude/settings.json` 的 `env` 里引用同一来源（仍不要提交该文件里的明文到任何 public 仓）。


```bash
# 1) 本机已有 bb-browser（PATH 可调用）
# 2) 克隆本仓
git clone https://github.com/99hansling/bb-jev-browser.git
cd bb-jev-browser
chmod +x bin/bb-jev.mjs

# 3) TypeSafe key → 见上方 Keychain 段落（不要 export 进 shell history / git）
```

## 用法

```bash
./bin/bb-jev.mjs doctor
./bin/bb-jev.mjs snap -i --tab <id>
./bin/bb-jev.mjs step "打开设置并保存" --tab <id>
```

`step` 流程：`bb-browser snap -i` → 解析交互 ref → Jev Choice（主力）→ 低置信/失败则 legacy fallback → `bb-browser click <ref>`。

环境变量：

- `TYPESAFE_API_KEY`：Jev 主力路径
- `BB_BROWSER_BIN`：默认 `bb-browser`
- `BB_JEV_MIN_CONF`：默认 `0.45`

## 接到 Hansen / my-skills

见 [docs/INTEGRATION.md](docs/INTEGRATION.md)。原则：Jev 主力，旧 harness/hook **不删**，只做 fallback；不要把本仓塞进 `99hansling/my-skills` private 推送链路——skill 文案可复制/软链，代码留在本 public 仓。

## License

MIT
