"""
数据表定义 — PostgreSQL
对话模型: Chat → Message → MessageAnalysis (逐条评测)
总结模型: ChatAnalysis (整场对话总结)
用户模型: User
"""

from uuid_utils import uuid7
from datetime import datetime, timedelta, timezone
from typing import List, Optional

from sqlalchemy import (
    Integer,
    String,
    ForeignKey,
    DateTime,
    Text,
    Boolean,
    Index,
)
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from core.database import Base

# 中国标准时间 UTC+8
CST = timezone(timedelta(hours=8))


# ============================================================
# User — 用户
# ============================================================
class User(Base):
    __tablename__ = "user"
    __table_args__ = (
        Index("ix_user_vocabulary_level", "vocabulary_level"),
        Index("ix_user_role_active", "role", "is_active"),
    )

    # ── 主键 ──
    id: Mapped[str] = mapped_column(
        UUID(as_uuid=False),
        primary_key=True,
        default=lambda: str(uuid7()),  # UUID7 时间有序，索引友好
    )

    # ── 认证 ──
    email: Mapped[str] = mapped_column(
        String(255),
        unique=True,
        nullable=False,
        doc="登录凭据 + 密码重置渠道",
    )
    password_hash: Mapped[str] = mapped_column(
        String(128),
        nullable=False,
        doc="bcrypt / pbkdf2 哈希，永不存明文",
    )

    # ── 身份 ──
    display_name: Mapped[str] = mapped_column(
        String(64),
        nullable=False,
        doc="UI 显示名，允许重复，可随时修改",
    )
    role: Mapped[str] = mapped_column(
        String(16),
        nullable=False,
        default="student",
        doc="student | teacher | admin，目前仅用 student",
    )
    is_active: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=True,
        doc="软删除 / 封禁标记，false = 禁止登录",
    )

    # ── 学习画像（核心维度）──
    education_level: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
        default="UNDERGRADUATE",
        doc="JUNIOR_HIGH | SENIOR_HIGH | UNDERGRADUATE | GRADUATE | PROFESSIONAL"
        "—— 决定场景知识背景（校园→职场），与 vocabulary_level 正交",
    )
    vocabulary_level: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
        default="CET-4",
        doc="CET-4 | CET-6 | GRADUATE —— 控制 LLM 词汇复杂度、句式结构",
    )

    # ── 扩展偏好（JSON 容器）──
    settings: Mapped[dict] = mapped_column(
        JSONB,
        nullable=False,
        default=dict,
        doc="存放弱约束、实验性、不参与查询的偏好: "
        "{ grammar_strictness: 0.6, pronunciation_strictness: 0.7, "
        "fluency_strictness: 0.6, response_speed: 'slow'|'normal'|'fast', "
        "preferred_topics: ['daily','travel'], auto_adjust: false }",
    )

    # ── 审计 ──
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(tz=CST),
        doc="注册时间",
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(tz=CST),
        onupdate=lambda: datetime.now(tz=CST),
        doc="信息最后修改时间，每次 UPDATE 自动刷新",
    )
    last_login_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
        default=None,
        doc="末次登录时间，NULL = 注册后未登录过",
    )

    # ── 关系 ──
    chats: Mapped[List["Chat"]] = relationship(
        back_populates="user",
        cascade="all, delete-orphan",
        doc="用户的所有对话，删用户时级联删除",
    )


# ============================================================
# Chat — 对话会话
# ============================================================
class Chat(Base):
    __tablename__ = "chat"

    id: Mapped[str] = mapped_column(
        UUID(as_uuid=False),
        primary_key=True,
        default=lambda: str(uuid7()),
    )
    mode: Mapped[int] = mapped_column(
        Integer,
        doc="1=自由对话 2=情景对话 3=测试模式 —— TODO 将改为 strategy_type VARCHAR",
    )
    system_prompt: Mapped[str | None] = mapped_column(
        Text,
        doc="场景描述文本 —— TODO 将改为 background_prompt，仅存纯场景描述",
    )
    level: Mapped[str] = mapped_column(
        String(4),
        default="B1",
        doc="CEFR 难度等级: A1 | A2 | B1 | B2 | C1 | C2 —— 控制 LLM 回复的词汇和句式复杂度",
    )
    user_id: Mapped[str] = mapped_column(
        ForeignKey("user.id", ondelete="CASCADE"),
        index=True,
        doc="所属用户，删用户时级联删除对话",
    )
    created: Mapped[datetime] = mapped_column(
        DateTime,
        default=lambda: datetime.now(tz=CST),
        doc="对话创建时间 —— TODO 将改为 start_time",
    )

    user: Mapped["User"] = relationship(back_populates="chats")
    analysis: Mapped["ChatAnalysis"] = relationship(
        back_populates="chat",
        uselist=False,
        cascade="all, delete-orphan",
        doc="整场对话总结报告，一对一",
    )
    messages: Mapped[List["Message"]] = relationship(
        back_populates="chat",
        cascade="all, delete-orphan",
        doc="对话中的所有消息，删对话时级联删除",
    )


# ============================================================
# Message — 单条消息
# ============================================================
class Message(Base):
    __tablename__ = "message"
    __table_args__ = (Index("ix_message_chat_index", "chat_id", "index"),)

    id: Mapped[str] = mapped_column(
        UUID(as_uuid=False),
        primary_key=True,
        default=lambda: str(uuid7()),
    )
    chat_id: Mapped[str] = mapped_column(
        ForeignKey("chat.id", ondelete="CASCADE"),
        doc="所属对话",
    )
    index: Mapped[int] = mapped_column(
        Integer,
        doc="消息在对话中的序号，从 0 开始，system prompt 不计入",
    )
    role: Mapped[str] = mapped_column(
        String(16),
        doc="'user' = 学生发言 | 'assistant' = AI 回复",
    )
    content: Mapped[str] = mapped_column(
        Text,
        doc="消息文本内容",
    )

    chat: Mapped["Chat"] = relationship(back_populates="messages")
    analysis: Mapped["MessageAnalysis"] = relationship(
        back_populates="message",
        uselist=False,
        cascade="all, delete-orphan",
        doc="本条消息的评测结果，一对一",
    )


# ============================================================
# MessageAnalysis — 单条消息的评测结果
# ============================================================
class MessageAnalysis(Base):
    __tablename__ = "message_analysis"

    id: Mapped[str] = mapped_column(
        UUID(as_uuid=False),
        primary_key=True,
        default=lambda: str(uuid7()),
    )
    message_id: Mapped[str] = mapped_column(
        ForeignKey("message.id", ondelete="CASCADE"),
        doc="对应的消息，删消息时级联删除评测",
    )
    grammar_analysis: Mapped[str] = mapped_column(
        Text,
        doc="LLM 语法分析文字反馈（时态、冠词、主谓一致等）",
    )
    pronunciation_analysis: Mapped[str] = mapped_column(
        Text,
        doc="LLM 发音分析文字反馈（音素准确度、重音、连读等）",
    )
    pronunciation_score: Mapped[Optional[str]] = mapped_column(
        Text,
        nullable=True,
        doc="[旧] 发音评分文字 —— TODO 将被 grammar_score / pronunciation_score / fluency_score 三个 Float 替代",
    )

    message: Mapped["Message"] = relationship(back_populates="analysis")


# ============================================================
# ChatAnalysis — 整场对话的总结报告
# ============================================================
class ChatAnalysis(Base):
    __tablename__ = "chat_analysis"

    id: Mapped[str] = mapped_column(
        UUID(as_uuid=False),
        primary_key=True,
        default=lambda: str(uuid7()),
    )
    chat_id: Mapped[str] = mapped_column(
        ForeignKey("chat.id", ondelete="CASCADE"),
        doc="对应的对话，删对话时级联删除报告",
    )
    grammar_analysis: Mapped[str] = mapped_column(
        Text,
        doc="[旧] 整场语法总结 —— TODO 将被 summary_report JSON 替代",
    )
    pronunciation_analysis: Mapped[str] = mapped_column(
        Text,
        doc="[旧] 整场发音总结 —— TODO 将被 summary_report JSON 替代",
    )
    expression_analysis: Mapped[str] = mapped_column(
        Text,
        doc="[旧] 表达地道性总结 —— TODO 将被 summary_report JSON 替代",
    )
    report_path: Mapped[Optional[str]] = mapped_column(
        Text,
        nullable=True,
        doc="生成的 Word 报告文件路径",
    )

    chat: Mapped["Chat"] = relationship(back_populates="analysis")
