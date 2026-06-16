from typing import List, Optional

from pydantic import BaseModel

from .common import MessageAnalysisReport


class UpdateChatRequest(BaseModel):
    chat_id: str
    text: str
    situation: str


class GetChatResponse(BaseModel):
    chat_id: str
    number: int
    messages: List[MessageAnalysisReport]


class CreateChatRequest(BaseModel):
    user_id: str
    mode: int
    situation: Optional[str]
