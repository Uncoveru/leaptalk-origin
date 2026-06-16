# 对话
import json

from fastapi import APIRouter, HTTPException
from fastapi.params import Query
from fastapi.responses import StreamingResponse
from sqlalchemy import select
from sqlalchemy.orm import Session

from models import User, Chat, Message, engine
from prompts.chat import *
from schemas.chat import (
    UpdateChatRequest,
    GetChatResponse,
    CreateChatRequest,
)
from services.dashscope_tts import qwen_tts_stream
from services.global_analyzer import get_messages_and_analyses
from services.openai_chat import openai_chat_stream

router = APIRouter()


@router.post(path="/chat", description="申请新的对话")
async def create_chat(request: CreateChatRequest):
    if request.mode <= 0 or request.mode > 3:
        raise HTTPException(status_code=400, detail="Invalid mode")

    with Session(engine) as session:
        user = session.get(User, request.user_id)
        if user is None:
            raise HTTPException(status_code=404, detail="User not found")

        chat = Chat(user_id=str(user.id), mode=request.mode)
        if request.mode == 2 or request.mode == 3:
            chat.system_prompt = (
                request.situation
            )  # 之后需要换为具体情景对话提示词提示词
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
        if chat.mode == 2 or chat.mode == 3:
            situation = request.situation or chat.system_prompt
            messages.append(
                {
                    "role": "system",
                    "content": prompt_for_situation_chat(situation),
                }
            )
        else:
            messages.append(
                {"role": "system", "content": prompt_for_free_chat()}
            )  # 自由对话模式
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
        # 流式处理文本和音频
        sentence_index = 0
        for chunk in openai_chat_stream(messages):
            assistant_text += chunk
            yield f"data: {json.dumps({'index': sentence_index,'type': 'text', 'content': chunk})}\n\n"

            for audio_chunk in qwen_tts_stream(chunk):
                yield f"data: {json.dumps({'index': sentence_index, 'type': 'audio', 'content': audio_chunk})}\n\n"

            sentence_index += 1

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
async def get_chat(chat_id: str = Query()):
    try:
        messages = get_messages_and_analyses(chat_id)
    except Exception as e:
        raise HTTPException(
            status_code=500, detail="Error retrieving chat history. Error %s" % str(e)
        )

    return GetChatResponse(chat_id=chat_id, number=len(messages), messages=messages)
