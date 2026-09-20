# 怎么接到本机工作流（Hansen）

## 推荐前四名（不用 hermes）

1. **官方** `typesafe-ai/skills` — 会拆 Choice/Noul/Score  
2. **fast-jev-compaction** — context；旧摘要路径保留为 fallback  
3. **bb-jev-browser（本仓）** — 登录态浏览主力  
4. **jev-ultrafast / jev-browser** — 无登录态或 Playwright 场景  

## Jev 主力 + 旧逻辑 fallback

在现有 `harness-gate` / hooks / `bb-browser` skill 的决策点：

```
candidates = build_closed_set(state)
if TYPESAFE_API_KEY and jev_ok:
    pick = jev.choice(candidates)   # primary
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
| `99hansling/bb-jev-browser` (public) | 混合 CLI / 文档 / skill 源 |
| `~/Documents/my-skills` → private `99hansling/my-skills` | 仅 skill 文案与软链；**不改 remote / 推送脚本** |
| `~/Documents/jev-tools` | 上游 clone 缓存 |

## my-skills 建议

- 保留 `bb-browser` skill（身份）  
- 新增/软链本仓 `skill/SKILL.md` 为 `bb-jev-browser`  
- `jev-decision-layer` 继续当总入口；推荐顺序改为不含 hermes  

## Key

本机若无 `TYPESAFE_API_KEY`，Jev 路径静默走 fallback。配 key 后再验主路径。
