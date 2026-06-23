# 分析学生语音
import json
import time
from io import BytesIO

import aiofiles
from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from fastapi.responses import FileResponse, StreamingResponse
from pydub import AudioSegment
from sqlalchemy.orm import Session

from core.config import audio_root
from core.level import get_level
from models import Chat, Message, MessageAnalysis, ChatAnalysis
from core.database import engine
from prompts.analyzer import (
    prompt_for_analyzer_grammar,
    prompt_for_analyzer_pronunciation,
    prompt_for_translate,
)
from schemas.analyzer import (
    AnalyzeGrammarRequest,
    AnalyzePronunciationResponse,
    AnalyzeGrammarResponse,
    GlobalAnalysisResponse,
    AnalysisSaveRequest,
    TranslateRequest,
)
from services.docx_generate import generate_docx_report
from services.global_analyzer import get_messages_and_analyses, global_analyze_stream
from services.openai_chat import openai_chat, openai_chat_stream_tokens
from services.xunfei_ise import evaluate

router = APIRouter()


@router.post("/analysis/grammar")
async def analyze_grammar(request: AnalyzeGrammarRequest):
    level_data = get_level(request.level)
    messages = [
        {"role": "system", "content": prompt_for_analyzer_grammar(level_data)},
        {"role": "user", "content": request.text},
    ]
    try:
        grammar_analysis = await openai_chat(messages)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"语法分析服务暂不可用: {e}")

    return AnalyzeGrammarResponse(gram_analysis=grammar_analysis)


@router.post("/analysis/pronunciation")
async def analyze_pronunciation(text: str = Form(), audio: UploadFile = File()):
    # 读取上传的音频文件内容
    audio_bytes = await audio.read()

    sound = AudioSegment.from_file(BytesIO(audio_bytes), format="webm")
    sound = sound.set_frame_rate(16000).set_sample_width(2).set_channels(1)

    # 导出为 PCM 原始数据
    pcm_data = sound.raw_data
    timestamp = int(time.time())
    converted_audio_path = audio_root / f"{timestamp}.pcm"
    # 保存 PCM 数据到文件
    async with aiofiles.open(converted_audio_path, mode="wb") as f:
        await f.write(pcm_data)

    try:
        pronunciation_evaluation = await evaluate(str(converted_audio_path), text)
    finally:
        converted_audio_path.unlink(missing_ok=True)

    if pronunciation_evaluation is None:
        raise HTTPException(status_code=502, detail="语音评测服务暂不可用")

    try:
        messages = [
            {"role": "system", "content": prompt_for_analyzer_pronunciation},
            {
                "role": "user",
                "content": json.dumps(
                    pronunciation_evaluation, indent=0, ensure_ascii=False
                ),
            },
        ]
        pronunciation_analysis = await openai_chat(messages)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"发音分析服务暂不可用: {e}")

    return AnalyzePronunciationResponse(
        pron_analysis=pronunciation_analysis,
        pron_score=pronunciation_evaluation,
    )


@router.post("/analysis/save")
async def save_analysis(request: AnalysisSaveRequest):
    with Session(engine) as session:
        message = session.get(Message, request.message_id)
        if message is None:
            raise HTTPException(status_code=404, detail="Message not found")
        elif message.analysis:
            raise HTTPException(status_code=400, detail="Message already analyzed")
        message_analysis = MessageAnalysis(
            message_id=message.id,
            grammar_analysis=request.gram_analysis,
            pronunciation_analysis=request.pron_analysis,
        )
        if request.pron_score is not None:
            message_analysis.pronunciation_score = json.dumps(
                request.pron_score, indent=0, ensure_ascii=False
            )
        session.add(message_analysis)
        session.commit()
        session.refresh(message_analysis)

    return {"status": 1, "analysis_id": message_analysis.id}


@router.post("/translate", response_class=StreamingResponse)
async def translate(request: TranslateRequest):
    messages = [
        {"role": "system", "content": prompt_for_translate},
        {"role": "user", "content": request.text},
    ]

    def generate():
        for token in openai_chat_stream_tokens(messages):
            yield token

    return StreamingResponse(content=generate(), media_type="text/plain")


@router.get("/analysis/summarize")
async def analyse_summarize(chat_id: str):
    with Session(engine) as session:
        chat = session.get(Chat, chat_id)

        if not chat:
            raise HTTPException(status_code=404, detail="Chat not found")

        if chat.analysis:
            cached = json.dumps(
                {
                    "grammar_analysis": chat.analysis.grammar_analysis,
                    "pronunciation_analysis": chat.analysis.pronunciation_analysis,
                    "expression_analysis": chat.analysis.expression_analysis,
                },
                ensure_ascii=False,
            )

            def yield_cached():
                yield f"data: {json.dumps(cached, ensure_ascii=False)}\n\n"

            return StreamingResponse(
                content=yield_cached(),
                media_type="text/event-stream",
                headers={
                    "Cache-Control": "no-cache, no-transform",
                    "X-Accel-Buffering": "no",
                },
            )

        messages_reports = get_messages_and_analyses(chat.id)
        situation = chat.system_prompt if chat.mode != 1 else "自由对话"
        if not situation:
            situation = "自由对话"

    def generate():
        accumulated = ""
        try:
            for token in global_analyze_stream(
                system_prompt=situation,
                message_reports=messages_reports,
            ):
                accumulated += token
                yield f"data: {json.dumps(accumulated, ensure_ascii=False)}\n\n"
        except Exception as e:
            yield f"data: {json.dumps({'error': str(e)}, ensure_ascii=False)}\n\n"
            return

        try:
            parsed = json.loads(accumulated)
            with Session(engine) as save_session:
                chat_obj = save_session.get(Chat, chat_id)
                if chat_obj and not chat_obj.analysis:
                    save_session.add(
                        ChatAnalysis(
                            chat_id=chat_id,
                            grammar_analysis=parsed.get("grammar_analysis", ""),
                            pronunciation_analysis=parsed.get(
                                "pronunciation_analysis", ""
                            ),
                            expression_analysis=parsed.get("expression_analysis", ""),
                            report_path=None,
                        )
                    )
                    save_session.commit()
        except Exception:
            pass

    return StreamingResponse(
        content=generate(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache, no-transform",
            "X-Accel-Buffering": "no",
        },
    )


@router.get("/analysis/summarize/docx", response_class=FileResponse)
def download_report_docx(chat_id: str):
    with Session(engine) as session:
        chat: Chat | None = session.get(Chat, chat_id)

        if not chat or not chat.analysis:
            raise HTTPException(status_code=404, detail="Chat not found")

        analysis = chat.analysis
        situation = "自由对话" if chat.mode == 1 else (chat.system_prompt or "自由对话")
        message_reports = get_messages_and_analyses(chat.id)
        global_analysis = GlobalAnalysisResponse(
            grammar_analysis=analysis.grammar_analysis,
            pronunciation_analysis=analysis.pronunciation_analysis,
            expression_analysis=analysis.expression_analysis,
        )

        # 如果 report_path 已存在，直接使用；否则生成新报告并保存路径
        if analysis.report_path is None:
            docx_report_path = generate_docx_report(
                name=chat.id,
                created_at=chat.created,
                situation=situation,
                global_analysis=global_analysis,
                message_analyses=message_reports,
            )
            analysis.report_path = str(docx_report_path)
            session.commit()
            session.refresh(analysis)

    return FileResponse(
        path=analysis.report_path,
        filename="report.docx",
        media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    )
