import uuid
from datetime import datetime
from pathlib import Path
from typing import List, Optional

from sqlalchemy import Integer, String, ForeignKey, DateTime, Text, create_engine
from sqlalchemy.orm import DeclarativeBase, Mapped, Session, mapped_column, relationship


class Base(DeclarativeBase):
    pass


class User(Base):
    __tablename__ = "user"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    name: Mapped[str] = mapped_column(String(32))
    password: Mapped[str] = mapped_column(String(32))

    chats: Mapped[List["Chat"]] = relationship(
        back_populates="user", cascade="all, delete-orphan"
    )


class Chat(Base):
    __tablename__ = "chat"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    mode: Mapped[int] = mapped_column(Integer)
    system_prompt: Mapped[str | None] = mapped_column(Text)
    user_id: Mapped[str] = mapped_column(
        ForeignKey(column="user.id", ondelete="CASCADE")
    )
    created: Mapped[datetime] = mapped_column(DateTime, default=datetime.now)

    user: Mapped["User"] = relationship(back_populates="chats")
    analysis: Mapped["ChatAnalysis"] = relationship(
        back_populates="chat", uselist=False, cascade="all, delete-orphan"
    )
    messages: Mapped[List["Message"]] = relationship(
        back_populates="chat", cascade="all, delete-orphan"
    )


class Message(Base):
    __tablename__ = "message"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    chat_id: Mapped[str] = mapped_column(
        ForeignKey(column="chat.id", ondelete="CASCADE")
    )
    index: Mapped[int] = mapped_column(Integer)
    role: Mapped[str] = mapped_column(String(16))
    content: Mapped[str] = mapped_column(Text)

    chat: Mapped["Chat"] = relationship(back_populates="messages")
    analysis: Mapped["MessageAnalysis"] = relationship(
        back_populates="message", uselist=False, cascade="all, delete-orphan"
    )


class MessageAnalysis(Base):
    __tablename__ = "message_analysis"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    message_id: Mapped[str] = mapped_column(
        ForeignKey(column="message.id", ondelete="CASCADE")
    )
    grammar_analysis: Mapped[str] = mapped_column(Text)
    pronunciation_analysis: Mapped[str] = mapped_column(Text)
    pronunciation_score: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    message: Mapped["Message"] = relationship(back_populates="analysis")


class ChatAnalysis(Base):
    __tablename__ = "chat_analysis"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    chat_id: Mapped[str] = mapped_column(
        ForeignKey(column="chat.id", ondelete="CASCADE")
    )
    grammar_analysis: Mapped[str] = mapped_column(Text)
    pronunciation_analysis: Mapped[str] = mapped_column(Text)
    expression_analysis: Mapped[str] = mapped_column(Text)
    report_path: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    chat: Mapped["Chat"] = relationship(back_populates="analysis")


DB_PATH = Path(__file__).parent.parent / "database.db"
engine = create_engine(f"sqlite:///{DB_PATH}")
Base.metadata.create_all(engine)

with Session(engine) as session:
    test_id = "c05d3d7f-28f8-4277-88cd-bea5ace34c7f"
    if not session.get(User, test_id):
        session.add(User(id=test_id, name="测试", password="<PASSWORD>"))
        session.commit()
