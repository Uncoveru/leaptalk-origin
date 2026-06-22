# 对话
import json

from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy import select
from sqlalchemy.orm import Session

from core.level import get_level, DEFAULT_LEVEL
from models import User, Chat, Message
from core.database import engine
from prompts.chat import prompt_for_free_chat, prompt_for_situation_chat
from schemas.chat import (
    UpdateChatRequest,
    GetChatResponse,
    CreateChatRequest,
)
from services.dashscope_tts import qwen_tts_stream
from services.global_analyzer import get_messages_and_analyses
from services.openai_chat import (
    openai_chat_stream_tokens,
    extract_sentences_from_buffer,
)

router = APIRouter()


@router.post(path="/chat", description="申请新的对话")
async def create_chat(request: CreateChatRequest):
    if request.mode <= 0 or request.mode > 3:
        raise HTTPException(status_code=400, detail="Invalid mode")

    with Session(engine) as session:
        user = session.get(User, request.user_id)
        if user is None:
            raise HTTPException(status_code=404, detail="User not found")

        chat = Chat(user_id=str(user.id), mode=request.mode, level=request.level)
        if request.mode == 2 or request.mode == 3:
            chat.system_prompt = request.situation
        session.add(chat)
        session.commit()
        session.refresh(chat)

    return {"status": 1, "chat_id": chat.id}


@router.put(path="/chat", description="更新对话", response_class=StreamingResponse)
async def update_chat(
    request: UpdateChatRequest,
):
    # history
    messages = []
    with Session(engine) as session:
        # system
        chat = session.get(Chat, request.chat_id)
        if chat is None:
            raise HTTPException(status_code=404, detail="Chat not found")
        if request.level != chat.level:
            chat.level = request.level  # 前端可中途调整对话难度，持久化到 chat 记录
        level_data = get_level(chat.level or DEFAULT_LEVEL)
        if chat.mode == 2 or chat.mode == 3:
            situation = request.situation or chat.system_prompt or ""
            messages.append(
                {
                    "role": "system",
                    "content": prompt_for_situation_chat(situation, level_data),
                }
            )
        else:
            messages.append(
                {"role": "system", "content": prompt_for_free_chat(level_data)}
            )
        # user & assistant
        statement = (
            select(Message)
            .where(Message.chat_id == request.chat_id)
            .order_by(Message.index)
        )
        results = session.scalars(statement).all()
        for result in results:
            messages.append({"role": result.role, "content": result.content})

        # user
        messages.append({"role": "user", "content": request.text})

    async def generate():
        assistant_text = ""
        sentence_buf = ""
        sentence_index = 0

        for token in openai_chat_stream_tokens(messages):
            assistant_text += token
            sentence_buf += token
            yield f"data: {json.dumps({'index': sentence_index, 'type': 'text', 'content': token})}\n\n"

            # 检测句子边界，触发 TTS
            sentences, sentence_buf = extract_sentences_from_buffer(sentence_buf)
            for sentence in sentences:
                for audio_chunk in qwen_tts_stream(sentence):
                    yield f"data: {json.dumps({'index': sentence_index, 'type': 'audio', 'content': audio_chunk})}\n\n"
                sentence_index += 1

        # 剩余未成句内容触发 TTS
        if sentence_buf.strip():
            for audio_chunk in qwen_tts_stream(sentence_buf):
                yield f"data: {json.dumps({'index': sentence_index, 'type': 'audio', 'content': audio_chunk})}\n\n"

        # 存储消息到数据库
        with Session(engine) as session:
            index = len(messages) - 1
            m1 = Message(
                chat_id=request.chat_id, index=index, role="user", content=request.text
            )
            m2 = Message(
                chat_id=request.chat_id,
                index=index + 1,
                role="assistant",
                content=assistant_text,
            )
            session.add_all([m1, m2])
            session.commit()
            session.refresh(m1)
            yield f"data: {json.dumps({'index': -1, 'type': 'id', 'content': m1.id})}\n\n"

    return StreamingResponse(content=generate(), media_type="text/event-stream")


@router.get(path="/chat", description="获取先前的对话记录")
async def get_chat(chat_id: str):
    try:
        messages = get_messages_and_analyses(chat_id)
    except Exception as e:
        raise HTTPException(
            status_code=500, detail="Error retrieving chat history. Error %s" % str(e)
        )

    return GetChatResponse(chat_id=chat_id, number=len(messages), messages=messages)
