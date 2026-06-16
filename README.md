# LeapTalk (语跃语伴)

AI-powered English oral practice and evaluation platform for Chinese high school students.

## 简介

LeapTalk（语跃语伴）是一款面向国内高中生的英语口语陪练与评测平台，支持**自由对话**与**情景角色扮演**两种模式。系统通过 LLM 实时生成英文回复、语音合成（TTS）与发音评测（ISE），并对用户的语法、词汇、发音和表达进行多维度分析，最终生成可下载的 Word 报告。

## 项目结构

```
leaptalk/
├── backend/          FastAPI 后端 (Python 3.12+)
├── frontend/         React 前端 (Vite + Ant Design)
├── README.md
└── .gitignore
```

## 技术栈

| 层级               | 技术                               |
| ------------------ | ---------------------------------- |
| **后端框架**       | FastAPI + Uvicorn                  |
| **ORM**            | SQLAlchemy (SQLite)                |
| **LLM**            | DeepSeek (deepseek-v4-pro)         |
| **语音合成 (TTS)** | Alibaba DashScope Qwen TTS         |
| **语音识别 (STT)** | Alibaba DashScope Qwen Audio Turbo |
| **发音评测 (ISE)** | iFlytek XunFei ISE                 |
| **前端框架**       | React 19 + React Router v7         |
| **UI 组件**        | Ant Design 5                       |
| **构建工具**       | Vite 6                             |
| **包管理**         | uv (后端) / pnpm (前端)            |

## 安装与运行

### 前置要求

- Python 3.12+ 与 [uv](https://docs.astral.sh/uv/)
- Node.js 18+ 与 [pnpm](https://pnpm.io/)
- DeepSeek、DashScope、讯飞开放平台 API 密钥

### 后端

```bash
cd backend

# 配置环境变量
cp .env.example .env
# 编辑 .env，填入真实的 API 密钥

# 安装依赖
uv sync

# 启动开发服务器 (http://127.0.0.1:8000)
uv run uvicorn main:app --host 127.0.0.1 --port 8000 --reload
```

**`.env` 配置项：**

| 变量                | 说明                                                   |
| ------------------- | ------------------------------------------------------ |
| `openai_api_key`    | DeepSeek API 密钥                                      |
| `openai_base_url`   | OpenAI 兼容 API 地址 (默认 `https://api.deepseek.com`) |
| `dashscope_api_key` | 阿里云 DashScope API 密钥                              |
| `xunfei_appid`      | 讯飞开放平台 AppID                                     |
| `xunfei_api_secret` | 讯飞开放平台 API Secret                                |
| `xunfei_api_key`    | 讯飞开放平台 API Key                                   |

### 前端

```bash
cd frontend

# 安装依赖
pnpm install

# 启动开发服务器 (http://localhost:5173)
pnpm dev

# 构建生产版本
pnpm build

# 代码检查
pnpm lint
```

## 使用示例

1. 启动后端服务 (`uv run uvicorn main:app --reload`)
2. 启动前端开发服务器 (`pnpm dev`)
3. 打开浏览器访问 `http://localhost:5173`
4. 在首页选择**自由对话**或**情景对话**模式
5. 在自由对话模式下直接开始语音/文字交流；情景对话模式下先选题，系统生成子场景后进入角色扮演
6. 对话结束后点击**总结**按钮查看多维度分析报告，支持下载 Word 文档

## API 说明

Base URL: `http://127.0.0.1:8000`

| 方法   | 路径                                | 说明                                                |
| ------ | ----------------------------------- | --------------------------------------------------- |
| `GET`  | `/user`                             | 创建测试用户并返回 `user_id`                        |
| `POST` | `/chat`                             | 创建新会话 (body: `user_id`, `mode`, `situation`)   |
| `PUT`  | `/chat`                             | 向会话发送消息，返回 SSE 流（含文本/语音及消息 ID） |
| `GET`  | `/chat?chat_id=`                    | 获取完整会话历史及逐句分析                          |
| `GET`  | `/situations`                       | 获取六类宏观情景列表                                |
| `GET`  | `/situation/{index}`                | LLM 生成指定宏观情景的子场景详情                    |
| `POST` | `/analysis/grammar`                 | 分析语法与词汇 (body: `text`)                       |
| `POST` | `/analysis/pronunciation`           | 分析发音 (multipart: `text` + `audio` webm 文件)    |
| `POST` | `/analysis/save`                    | 将语法与发音分析持久化到数据库                      |
| `GET`  | `/analysis/summarize?chat_id=`      | 获取/生成会话全局分析报告                           |
| `GET`  | `/analysis/summarize/docx?chat_id=` | 下载 Word 格式分析报告                              |

**会话模式 (mode)：**

| 值  | 模式                         |
| --- | ---------------------------- |
| `1` | 自由对话 (Free Conversation) |
| `2` | 情景对话 (Scenario-based)    |

## 数据库模型

| 表                 | 说明                                     |
| ------------------ | ---------------------------------------- |
| `user`             | 用户 (id, name, password)                |
| `chat`             | 会话 (id, mode, system_prompt, user_id)  |
| `message`          | 消息 (id, chat_id, index, role, content) |
| `message_analysis` | 逐句分析 (grammar, pronunciation)        |
| `chat_analysis`    | 全局分析 + Word 报告路径                 |

## 贡献指南

欢迎贡献！请遵循以下流程：

1. Fork 本仓库
2. 创建特性分支 (`git checkout -b feature/amazing-feature`)
3. 提交更改 (`git commit -m 'Add some amazing feature'`)
4. 推送到分支 (`git push origin feature/amazing-feature`)
5. 创建 Pull Request

提交前请确保：

- 后端代码通过 `uv run ruff check .` 检查
- 前端代码通过 `pnpm lint` 检查
- 新增功能包含适当的测试

## 许可证

本项目暂未指定开源许可证。保留所有权利。
