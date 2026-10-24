# 中文说明（作者笔记）

英文主页见 [README.md](README.md)。本文件记录仓库范围、验证情况和发布前待办，供作者自己使用。

## 仓库内容

- 3 个可导入的 n8n 工作流：`workflows/01-lead-capture`、`workflows/02-email-ai-triage`、`workflows/03-supportpilot-http`。
- 01 另附 `error-handler.json`（Error Trigger 邮件告警），需要在工作流 Settings 里手动选中。
- 自托管：`docker-compose.yml` + `.env.example` + `docs/自托管说明.md`。
- `npm run check`：校验 JSON 结构、连接关系，并扫描密钥格式字符串。

## 已验证的范围

- 4 个 JSON 已在 n8n `2.44.6` 中导入成功（03 在修改后重新导入并验证）。
- 节点类型、typeVersion、凭据类型名已对照该版本的 `n8n-nodes-base` 包核对。
- 用本地桩服务跑通了：
  - 03：新会话以 `conversation_id: null` 转发；带 `conversation_id` 的追问正确传递；空消息、超过 4000 字符、非法 `conversation_id` 返回 400；后端不可达返回 502。
  - 01：邮箱不合法返回 400；合法线索走到 Google Sheets 节点，因无凭据而失败（预期）。
  - 02：手动样例运行到 LLM 调用和结构化解析，请求体与鉴权头正确。
- **未验证**：真实 Google Sheets、Slack、Gmail、真实 LLM 服务商、真实 SupportPilot 实例。

## SupportPilot 接口

请求体按 SupportPilot `backend/app/api/chat.py` 的 schema：

```json
{ "message": "string (1..4000)", "conversation_id": "uuid | null (optional)" }
```

- 没有 `session_id` 字段。之前版本使用的 `session_id` 已全部移除。
- 响应为 AgentReply JSON，其中包含 `conversation_id`。
- 工作流使用非流式 JSON。SSE 的局限见 `workflows/03-supportpilot-http/说明.md`。
- `fixtures/supportpilot-reply.mock.json` 只是占位，不是真实录制，只包含 `conversation_id`。

## 发布前需要你做的事

1. **真实实例核对**：拿到一个运行中的 SupportPilot 后，用 `POST /api/chat` 跑一次真实请求，并用真实响应替换 `fixtures/supportpilot-reply.mock.json`。
2. **截图**：各目录 `说明.md` 里的截图占位还没有实际截图。真实截图可以补充到 `docs/screenshots/`。
3. **Gmail 标签 ID**：02 需要把分类映射到 Gmail 标签 ID（不是名称），填进 `GMAIL_LABEL_IDS_JSON`。
4. **Google Sheet**：建一个 `Leads` 标签页，表头为 `received_at, name, email, company, message, source`。

## Upwork 文案

英文文案在 `README.md` 末尾，可直接复制。文案已写明"自建、AI 辅助演示"，不要改成"客户项目"或加入数字指标。

## 命名说明

根目录的英文主页使用 `README.md`，中文笔记使用 `README.zh.md`。其余 `说明.md` 等文件仍为中文文件名。
