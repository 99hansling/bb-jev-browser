# 怎么接到本机工作流（Hansen）

## 硬性规则：Jev decision state 契约

Jev 的每次 `choice` / `noul` 决策都必须带完整的、可恢复的上下文，禁止只传
`goal`、候选项或一段脱离项目的裸判定。调用方必须构造一个结构化 state（可序列化
为 JSON），至少包含以下字段：

```json
{
  "project_purpose": "这个 repo/agent 当前服务的项目目的",
  "memory_policy": {
    "durable": ["哪些事实进入 git/项目状态/事件日志"],
    "discardable": ["哪些临时内容可在 compaction 后丢弃"],
    "retention": "保留多久，以及何时过期或升级",
    "sensitive_data": "禁止写入 key/token/cookie/密码原文；只允许记录存在性、来源和脱敏位置"
  },
  "usefulness_criteria": {
    "preserve": ["文件路径", "报错原文", "约束", "凭证痕迹（仅脱敏元数据）"],
    "discard": ["重复叙述", "已被验证无关的猜测", "可由源码或测试重建的噪声"]
  },
  "recent_io_effect_summary": {
    "inputs": ["近期收到的关键要求或输入"],
    "outputs": ["近期执行的命令、修改的文件或决策输出"],
    "effects": ["结果、验证证据、失败及其影响"]
  },
  "goal": "本次决策要完成的目标",
  "candidates": [{ "id": "e1", "label": "封闭候选项" }]
}
```

四个上下文块是不可省略的：

1. `project_purpose` 说明 repo/agent 在做什么，防止 compaction 把局部动作误当成目标。
2. `memory_policy` 说明什么持久、什么可丢、保留多久，以及敏感数据禁入边界。
3. `usefulness_criteria` 明确保留/丢弃标准；路径、精确报错、约束和凭证痕迹优先保留。
4. `recent_io_effect_summary` 记录近期全局输入、输出和效果，必须写结果而不是只写动作。

凭证痕迹只表示“某凭证存在、来自哪里、应到哪个本地安全存储读取”，绝不能包含
secret 值、cookie、session、Authorization header 或可还原它们的片段。state 进入日志、
handoff、snapshot 或模型请求前都要做同一套脱敏。

### Compaction 接入

Compaction 前先生成并校验上述 state；校验失败时不得进行 Jev 决策或清理，直接走旧
`harness`/hook 的 fallback。Compaction 可以丢弃 `discardable` 内容，但必须原样保留四个
上下文块、当前目标、候选项、约束、精确错误和验证结果。Compaction 后恢复时重新校验：

```text
state = collect_context(project, memory_policy, usefulness_criteria, recent_io_effects)
assert complete_and_redacted(state)
compact(state)                         # 只清理 discardable 内容
restored = restore_latest_state()
if not complete_and_redacted(restored):
    pick = legacy_pick(candidates)     # 旧 harness 逻辑是安全 fallback
else:
    pick = jev.choice(restored)
```

恢复摘要必须同时写出：保留了什么、丢弃了什么、丢弃理由、最近一次决策及其效果。
任何缺字段、字段过期或脱敏失败，都按低置信度处理并回退旧逻辑；不得用猜测补齐上下文。

## 推荐前四名（不用 hermes）

1. **官方** `typesafe-ai/skills` — 会拆 Choice/Noul/Score  
2. **fast-jev-compaction** — context；旧摘要路径保留为 fallback  
3. **bb-jev-browser（本仓）** — 登录态浏览主力  
4. **jev-ultrafast / jev-browser** — 无登录态或 Playwright 场景  

## Jev 主力 + 旧逻辑 fallback

在现有 `harness-gate` / hooks / `bb-browser` skill 的决策点：

```
state = build_complete_decision_state(context_contract)
candidates = build_closed_set(state)
if complete_and_redacted(state) and TYPESAFE_API_KEY and jev_ok:
    pick = jev.choice(state)         # primary; state includes candidates + four context blocks
    if pick.conf < threshold: pick = legacy_pick(candidates)
else:
    pick = legacy_pick(candidates)  # previous harness / LLM-ref logic
execute(pick)
```

- **不要删**旧规则、旧 hook、旧 snapshot→ref 路径。  
- Jev 只替换「从封闭表里选谁」这一跳；不可逆动作仍由人 / 确定性门禁负责。  

## 仓库边界

| 放哪 | 什么 |
| --- | --- |
| `99hansling/bb-jev-browser` (推送前必须 private) | 混合 CLI / 文档 / skill 源；每次推送前核对 owner 与 visibility |
| `~/Documents/my-skills` → private `99hansling/my-skills` | 仅 skill 文案与软链；**不改 remote / 推送脚本** |
| `~/Documents/jev-tools` | 上游 clone 缓存 |

## my-skills 建议

- 保留 `bb-browser` skill（身份）  
- 新增/软链本仓 `skill/SKILL.md` 为 `bb-jev-browser`  
- `jev-decision-layer` 继续当总入口；推荐顺序改为不含 hermes  

## Key

本机若无 `TYPESAFE_API_KEY`，Jev 路径静默走 fallback。配 key 后再验主路径。
