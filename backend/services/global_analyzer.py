from typing import Generator

from sqlalchemy import select
from sqlalchemy.orm import Session

from models import engine, Chat, Message
from prompts.analyzer import prompt_for_global_analyze
from schemas.common import MessageAnalysisReport
from .openai_chat import openai_chat_stream_tokens


def get_messages_and_analyses(chat_id: str) -> list[MessageAnalysisReport]:
    reports: list[MessageAnalysisReport] = []

    with Session(engine) as session:
        chat = session.get(Chat, chat_id)
        if not chat:
            raise Exception(f"Chat with id {chat_id} does not exist")

        stmt = select(Message).where(Message.chat_id == chat_id).order_by(Message.index)
        messages = session.scalars(stmt)

        for message in messages:
            analysis = message.analysis
            if analysis is not None:
                reports.append(
                    MessageAnalysisReport(
                        index=message.index,
                        role=message.role,
                        content=message.content,
                        grammar_analysis=analysis.grammar_analysis,
                        pronunciation_analysis=analysis.pronunciation_analysis,
                    )
                )
            else:
                reports.append(
                    MessageAnalysisReport(
                        index=message.index,
                        role=message.role,
                        content=message.content,
                        grammar_analysis=None,
                        pronunciation_analysis=None,
                    )
                )

    return reports


def global_analyze_stream(
    system_prompt: str,
    message_reports: list[MessageAnalysisReport],
) -> Generator[str, None, None]:
    messages = [
        {"role": "system", "content": prompt_for_global_analyze(system_prompt)},
        {
            "role": "user",
            "content": "\n".join([str(report) for report in message_reports]),
        },
    ]
    for token in openai_chat_stream_tokens(messages):
        yield token
