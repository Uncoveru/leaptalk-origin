# 负责情景对话初始化
from fastapi import APIRouter, HTTPException

from core.level import get_level, DEFAULT_LEVEL
from core.situation import situations
from prompts.situation import prompt, prompt_for_detailed_situation
from services.openai_chat import openai_chat

router = APIRouter()


@router.get(path="/situations", description="获取所有可用的大场景列表")
def get_situations():
    return {"situations": situations}


@router.get(path="/situation/{index}", description="获取该场景的具体信息")
async def create_detailed_situation(index: int, level: str = DEFAULT_LEVEL):
    if index < 0 or index >= len(situations):
        raise HTTPException(status_code=404, detail="Situation not found.")

    level_data = get_level(level)
    situation = situations[index]
    messages = [
        {"role": "user", "content": prompt_for_detailed_situation(level_data)},
        {
            "role": "user",
            "content": f'大场景为{situation.get("name_zh")}({situation.get("name_en")}), 描述为{situation.get("description")}',
        },
    ]
    try:
        detailed_situation: dict = await openai_chat(messages, json_output=True)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"场景生成服务暂不可用: {e}")
    return detailed_situation
