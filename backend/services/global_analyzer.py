# 整体分析
from sqlalchemy import select
from sqlalchemy.orm import Session

from models import engine, Chat, Message
from prompts.analyzer import prompt_for_global_analyze
from schemas.analyzer import GlobalAnalysisResponse
from schemas.common import MessageAnalysisReport
from .openai_chat import openai_chat


def get_messages_and_analyses(chat_id: str) -> list[MessageAnalysisReport]:
    reports: list[MessageAnalysisReport] = []

    with Session(engine) as session:
        chat = session.get(Chat, chat_id)
        if not chat:
            raise Exception(f"Chat with id {chat_id} does not exist")

        # 获取所有消息
        stmt = select(Message).where(Message.chat_id == chat_id).order_by(Message.index)
        messages = session.scalars(stmt)

        # 获取消息分析
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


async def global_analyze(
    system_prompt: str,
    message_reports: list[MessageAnalysisReport],
) -> GlobalAnalysisResponse:
    messages = [
        {"role": "system", "content": prompt_for_global_analyze(system_prompt)},
        {
            "role": "user",
            "content": "\n".join([str(report) for report in message_reports]),
        },
    ]
    # 构建消息给大模型分析
    global_analysis: dict = await openai_chat(messages, json_output=True)
    global_grammar_analysis = global_analysis.get("grammar_analysis")
    global_pronunciation_analysis = global_analysis.get("pronunciation_analysis")
    global_expression_analysis = global_analysis.get("expression_analysis")
    analysis = GlobalAnalysisResponse(
        grammar_analysis=global_grammar_analysis,
        pronunciation_analysis=global_pronunciation_analysis,
        expression_analysis=global_expression_analysis,
    )
    return analysis
