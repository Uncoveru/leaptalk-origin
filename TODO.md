# TODO

---

## 🔴 P0 — 用户系统（多位 TODO 的前置依赖）

| #   | 事项                                | 涉及                                  | 说明                                                                         |
| --- | ----------------------------------- | ------------------------------------- | ---------------------------------------------------------------------------- |
| 1   | 移除硬编码测试用户                  | `apis/v1/auth.py` + `models/model.py` | 当前 `c05d3d7f` 魔法字符串 + 明文密码 `<PASSWORD>` 是开发占位符，须彻底替换  |
| 2   | 密码 bcrypt/pbkdf2 hash 存储        | `models/model.py`                     | 替换 `password: String(32)` 明文字段                                         |
| 3   | POST /register — 用户注册           | `apis/v1/auth.py`                     | name + password → 创建用户，返回 user_id                                     |
| 4   | POST /login — 用户登录              | `apis/v1/auth.py`                     | name + password → 验证后返回 JWT access_token                                |
| 5   | JWT 认证中间件                      | `core/auth.py` (新建)                 | FastAPI `Depends` 校验 token，注入 `current_user`                            |
| 6   | 全部 API 接入认证中间件             | 全局路由器                            | 所有端点通过 `Depends` 获取当前用户，替换 "凭 user_id 即可访问" 的无授权模式 |
| 7   | 用户数据隔离                        | `chat.py`, `analyzer.py`              | chat/message/analysis 查询必须限定 `user_id = current_user.id`               |
| 8   | PUT /user/settings — 持久化用户偏好 | `apis/v1/auth.py`                     | 难度等级等偏好以 JSON 字段存 User 表（或独立 settings 表）                   |
| 9   | 修复 GET /user → POST /user         | `apis/v1/auth.py`                     | 当前 GET 创建资源违反 RESTful 语义，拆分为注册/登录两个 POST 端点            |
| 10  | CORS 生产环境收紧                   | `main.py`                             | `allow_origins=["*"]` → 白名单                                               |

---

## 🔴 P0 — 架构迁移（WebSocket 化核心对话流）

| #   | 事项                                    | 涉及                                  | 说明                                                                                                                           |
| --- | --------------------------------------- | ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| 11  | 设计 WebSocket 消息协议                 | `schemas/ws.py` (新建)                | 统一消息类型枚举：`chat.send` / `chat.text` / `chat.audio` / `chat.done` / `chat.cancel` / `stt.audio` / `stt.result` / `ping` |
| 12  | 新增全局 WebSocket 端点 `/ws/{chat_id}` | `apis/v1/ws.py` (新建)                | 承载 STT（实时双向音频流）+ LLM（流式文本下行）+ TTS（二进制音频下行）                                                         |
| 13  | 新增第三方 STT WebSocket 桥接服务       | `services/stt.py` (新建)              | 桥接前端 WS → 讯飞 RTASR / DashScope Paraformer WS                                                                             |
| 14  | TTS 音频改二进制帧传输                  | WS 端点 + `services/dashscope_tts.py` | 消除当前 SSE 方案中 base64（+33% 带宽）+ JSON（+主线程阻塞）的三层包装                                                         |
| 15  | LLM 流式文本改 WS 帧推送                | WS 端点                               | 每句文本为独立 JSON 帧，音频紧跟为独立二进制帧                                                                                 |
| 16  | 迁移 PUT /chat → WebSocket              | `apis/v1/chat.py`                     | 将 SSE `StreamingResponse` 替换为 WS 帧推送，移除 `PUT /chat` HTTP 端点                                                        |
| 17  | chat.done 帧定义与发送                  | WS 端点                               | 本轮对话完成后推送 `{type: "chat.done", user_msg_id, assistant_msg_id}`                                                        |
| 18  | 用户消息立即入库                        | WS 端点 `handle_chat_send()`          | 在 LLM 流式开始前写入 DB，消除崩溃丢数据风险                                                                                   |
| 19  | 修复 message index 空洞                 | WS 端点                               | `index = len(results)` 替代 `len(messages) - 1`，system prompt 不计入                                                          |
| 20  | per-chat 写锁串行化                     | WS 端点                               | `asyncio.Lock` 保证同一 chat 的消息按接收顺序写入                                                                              |
| 21  | commit 先于 chat.done 发送              | WS 端点                               | DB 事务提交后才推送完成帧（读一致性保障）                                                                                      |
| 22  | TTS 异常降级为纯文本                    | WS 端点                               | `try/except TtsError` 不中断文本流，chat.done 仍然正常发送                                                                     |
| 23  | LLM 调用超时控制                        | WS 端点 + `services/openai_chat.py`   | 流式调用添加超时保护，超时后返回已生成内容 + chat.error                                                                        |
| 24  | WebSocket 心跳保活                      | WS 端点 + 前端                        | `ping`/`pong` 帧，30s 间隔，断线自动重连 + 指数退避                                                                            |
| 25  | 前端 WebSocket 客户端封装               | `frontend/src/apis/ws.js` (新建)      | 统一 WS 连接管理、消息路由、心跳、重连、自动恢复 session                                                                       |
| 26  | 前端对话页适配 WebSocket                | `frontend/src/pages/ChatPage.jsx`     | 将 `updateChat()` SSE 调用替换为 WS 消息收发                                                                                   |
| 27  | 前端 STT 模块集成                       | `frontend/src/components/Chat/`       | 录音时通过 WS 发送二进制音频帧，接收实时转写结果                                                                               |
| 28  | 移除前端手动 SSE 解析逻辑               | `frontend/src/apis/chat.js`           | 删除 `ReadableStream` + `TextDecoder` + buffer 拼接 + `data:` 前缀剥离的约 80 行脆弱代码                                       |
| 29  | saveAnalysis 以 chat.done 为前置条件    | `frontend/src/pages/ChatPage.jsx`     | `Promise.all([chatDone, grammarRes, pronRes])` → 再调用 save                                                                   |

---

## 🟡 P1 — 评测上下文增强

| #   | 事项                             | 涉及                              | 说明                                                          |
| --- | -------------------------------- | --------------------------------- | ------------------------------------------------------------- |
| 30  | 新增 GrammarContext Schema       | `schemas/analyzer.py`             | `previous_ai_message: str` / `scenario: str` / `attempt: int` |
| 31  | 修改语法分析 Prompt（注入语境）  | `prompts/analyzer.py`             | 时态一致性判断、语域得体性判断、回答切题度判断                |
| 32  | `/analysis/grammar` 接收 context | `apis/v1/analyzer.py`             | 接收并注入 `GrammarContext`                                   |
| 33  | 前端传递上下文                   | `frontend/src/pages/ChatPage.jsx` | 从 `messages` state 提取 AI 上条消息 + 场景名 + 发言计数      |

---

## 🟡 P1 — 稳定性与数据完整性

| #   | 事项                            | 涉及                             | 说明                                                           |
| --- | ------------------------------- | -------------------------------- | -------------------------------------------------------------- |
| 34  | 修复临时 PCM 文件名冲突         | `apis/v1/analyzer.py`            | `int(time.time())` → `uuid.uuid4()`                            |
| 35  | 临时 PCM / JSON 文件自动清理    | `apis/v1/analyzer.py` + 定时任务 | 定期清理 `data/tmp/` 和 `data/pron/` 下过期文件                |
| 36  | saveAnalysis 幂等校验           | `apis/v1/analyzer.py`            | 同 `message_id` 不重复写入，防止并发重复提交                   |
| 37  | chat_id 不存在返回 404 而非 500 | `apis/v1/chat.py`                | 区分客户端错误和服务端错误                                     |
| 38  | 总结报告缓存失效机制            | `apis/v1/analyzer.py`            | 支持 `?force_refresh=true` 参数，新消息分析写入后允许重生成    |
| 39  | 文件上传大小限制                | `apis/v1/analyzer.py`            | 发音分析接口限制 webm ≤ 5MB                                    |
| 40  | 隐藏异常详情暴露                | `apis/v1/analyzer.py`, `chat.py` | 替换 `detail=f"xxx: {e}"` 为通用错误消息 + 服务端日志          |
| 41  | LLM 调用添加重试逻辑            | `services/openai_chat.py`        | 指数退避重试，最多 2 次                                        |
| 42  | DB Session 生命周期规范化       | 全局                             | 使用 FastAPI `Depends` 注入 session，消除跨操作裸 session 嵌套 |
| 43  | 全局速率限制                    | `main.py`                        | 对 LLM 相关端点限流，防止 API 费用滥用                         |
| 44  | 场景列表详情加缓存              | `apis/v1/situation.py`           | 相同 index 返回缓存结果，避免重复 LLM 调用                     |

---

## 🟢 P2 — 代码质量 & 可运维性

| #   | 事项                      | 涉及                | 说明                                                                      |
| --- | ------------------------- | ------------------- | ------------------------------------------------------------------------- |
| 45  | 添加 /health 健康检查端点 | `main.py`           | 容器编排和监控必需                                                        |
| 46  | 引入结构化日志            | 全局                | `structlog` 或 `loguru`，记录 LLM 调用延迟 / token 消耗 / 成功率 / 错误率 |
| 47  | 场景数据外置化            | `core/situation.py` | 从硬编码 list 移到配置文件或 DB                                           |
| 48  | SQLite WAL 模式启用       | `models/model.py`   | 缓解并发读写锁冲突（长期仍需迁 PostgreSQL）                               |

---

## 🟢 P2 — 原 TODO.md 功能增强

| #   | 事项                    | 前置依赖       | 说明                                                                              |
| --- | ----------------------- | -------------- | --------------------------------------------------------------------------------- |
| 49  | 跨 session 情景综合分析 | ✅ P0 用户系统 | 按情景类型分组，聚合同一学生所有对话的语法/发音错误趋势，输出进步报告             |
| 50  | 难度选择                | ✅ P0 用户系统 | 学生自选 CET4 入门 / CET4 提高 / CET6，影响对话 prompt + 评测标准 + 场景生成      |
| 51  | 增加 AI 回复真实感      | 无             | Prompt engineering：注入 filler words、缩略形式、自然语调标记，保持"每轮一句"约束 |
| 52  | 划词翻译                | 无             | 纯前端功能：消息卡片中选中单词 → 浮层中文释义 + 音标 + 例句                       |

---

## 🟡 P1 — 数据表 Schema 变更

> 是 P0 用户系统和 P1 功能增强的前置依赖。**全部为增量改动，无表增删，无模型粒度变更。**

### User 表 (5 项)

| #   | 操作 | 字段           | 类型                           | 说明                                         |
| --- | ---- | -------------- | ------------------------------ | -------------------------------------------- |
| 53  | 修改 | `name`         | `String(50)`, 加 `unique=True` | 禁止同名                                     |
| 54  | 修改 | `password`     | `String(128)`                  | 容纳 bcrypt hash（原 32 不够），存前 hash    |
| 55  | 新增 | `target_level` | `String(20)`                   | FR-01，值域 `CET-4` \| `CET-6` \| `GRADUATE` |
| 56  | 新增 | `created_at`   | `DateTime`                     | 注册时间                                     |
| 57  | 新增 | `updated_at`   | `DateTime`                     | 信息更新时间                                 |

### Chat 表 (7 项)

| #   | 操作        | 字段                                  | 类型                     | 说明                                      |
| --- | ----------- | ------------------------------------- | ------------------------ | ----------------------------------------- |
| 58  | 改名+改类型 | `mode` → `strategy_type`              | `Integer` → `String(20)` | 值域 `FREE_TALK` \| `SCENARIO` \| `TEST`  |
| 59  | 改名+语义变 | `system_prompt` → `background_prompt` | `Text` 不变              | 存纯场景描述（不再存拼接后的完整 prompt） |
| 60  | 新增        | `status`                              | `String(20)`             | 值域 `IN_PROGRESS` \| `FINISHED`          |
| 61  | 改名        | `created` → `start_time`              | `DateTime` 不变          | 语义对齐                                  |
| 62  | 新增        | `end_time`                            | `DateTime \| None`       | 会话结束时间                              |
| 63  | 新增        | `user_id` 加 `index=True`             | —                        | 加速按用户查会话                          |
| 64  | 新增        | `(user_id, status)` 联合索引          | —                        | 加速筛选进行中的会话                      |

### Message 表 (5 项)

| #   | 操作 | 字段                            | 类型                  | 说明                                     |
| --- | ---- | ------------------------------- | --------------------- | ---------------------------------------- |
| 65  | 新增 | `created_at`                    | `DateTime`            | 消息发送时间，排序 fallback              |
| 66  | 新增 | `chat_id` 加 `index=True`       | —                     | 加速按会话查消息                         |
| 67  | 新增 | `index` 加 `index=True`         | —                     | 加速排序                                 |
| 68  | 新增 | `(chat_id, index)` 联合唯一约束 | —                     | 防止同会话同 index 重复（数据完整性）    |
| 69  | 新增 | `audio_url`                     | `String(255) \| None` | 用户录音文件加密存储路径（2.4 法规约束） |

### MessageAnalysis 表 (11 项)

| #   | 操作 | 字段                                | 类型                            | 说明                                              |
| --- | ---- | ----------------------------------- | ------------------------------- | ------------------------------------------------- |
| 70  | 保留 | `grammar_analysis`                  | `Text`                          | LLM 文字反馈（不动）                              |
| 71  | 保留 | `pronunciation_analysis`            | `Text`                          | LLM 文字反馈（不动）                              |
| 72  | 新增 | `grammar_score`                     | `Float \| None`                 | 量化语法分                                        |
| 73  | 新增 | `pronunciation_score`               | `Float \| None`                 | 量化发音分                                        |
| 74  | 新增 | `fluency_score`                     | `Float \| None`                 | 量化流利度分                                      |
| 75  | 删除 | `pronunciation_score`（旧 Text 列） | —                               | 被 #72-74 三个 Float 替代                         |
| 76  | 新增 | `is_displayed`                      | `Boolean, default=True`         | TEST 模式隐藏分数 (FR-10)                         |
| 77  | 新增 | `eval_status`                       | `String(20), default="SUCCESS"` | `SUCCESS` \| `TIMEOUT_LOST` \| `PENDING` (NFR-03) |
| 78  | 新增 | `created_at`                        | `DateTime`                      | 评测完成时间                                      |
| 79  | 修改 | `message_id` 加 `unique=True`       | —                               | DB 层保证 1:1                                     |
| 80  | 新增 | `message_id` 加 `index=True`        | —                               | 加速反向查询                                      |

### ChatAnalysis 表 (7 项)

| #   | 操作 | 字段                       | 类型           | 说明                                                     |
| --- | ---- | -------------------------- | -------------- | -------------------------------------------------------- |
| 81  | 新增 | `summary_report`           | `Text`         | JSON 合并原 3 列（grammar + pronunciation + expression） |
| 82  | 删除 | `grammar_analysis`         | —              | 移入 `summary_report`                                    |
| 83  | 删除 | `pronunciation_analysis`   | —              | 移入 `summary_report`                                    |
| 84  | 删除 | `expression_analysis`      | —              | 移入 `summary_report`                                    |
| 85  | 保留 | `report_path`              | `Text \| None` | Word 报告文件路径                                        |
| 86  | 新增 | `created_at`               | `DateTime`     | 报告生成时间（判断缓存过期）                             |
| 87  | 修改 | `chat_id` 加 `unique=True` | —              | DB 层保证 1:1                                            |

### 全局 / 引擎 (4 项)

| #   | 操作 | 说明                                                                      |
| --- | ---- | ------------------------------------------------------------------------- |
| 88  | 修改 | `create_engine` 加 `connect_args={"check_same_thread": False}`            |
| 89  | 新增 | SQLite WAL 模式启用                                                       |
| 90  | 新增 | 引入 Alembic 管理迁移（替换 `Base.metadata.create_all` 自动建表）         |
| 91  | 删除 | 模块导入副作用：移除自动建表 + 插入测试用户代码（model.py 第 102-110 行） |

### 统计

| 表              | 新增列 | 修改列 | 删除列 | 约束/索引 |
| --------------- | :----: | :----: | :----: | :-------: |
| User            |   3    |   2    |   0    |     1     |
| Chat            |   2    |   2    |   0    |     2     |
| Message         |   1    |   0    |   0    |     3     |
| MessageAnalysis |   5    |   0    |   1    |     2     |
| ChatAnalysis    |   1    |   0    |   3    |     1     |
| 全局            |   —    |   —    |   —    |     4     |
| **合计**        | **12** | **4**  | **4**  |  **13**   |

---

### 依赖关系图

```
P0 用户系统 (1-10)
  ├──→ 50 难度选择
  ├──→ 49 跨 session 综合分析
  └──→ P1 数据表 Schema 变更 (53-91)
          └──→ P0 架构迁移 (11-29)  ← 二者可并行
                └──→ P1 评测上下文 (30-33)
                └──→ P1 稳定性 (34-44)

P2 代码质量 (45-48)   ← 与 P0/P1 并行
P2 功能增强 (51-52)   ← 无前置，随时可做
```
