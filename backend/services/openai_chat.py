import json
import re

from openai import OpenAI, AsyncOpenAI

from core.config import openai_api_key, openai_base_url


def openai_chat_stream(message: list[dict]):
    """
    Stream chat response from OpenAI API.
    """
    client = OpenAI(
        api_key=openai_api_key,
        base_url=openai_base_url,
    )

    completion = client.chat.completions.create(
        model="deepseek-v4-pro", messages=message, stream=True,
        extra_body={"thinking": {"type": "disabled"}},
    )
    string_buf = ""
    for chunk in completion:
        if not getattr(chunk, "choices", None) or not chunk.choices:
            continue

        content = chunk.choices[0].delta.content
        string_buf += content if content else ""
        sentences, string_buf = extract_sentences_from_buffer(string_buf)
        if sentences:
            yield "".join(sentences)


def extract_sentences_from_buffer(buffer):
    # 检查有没有完整的句子
    sentences = re.split(r'(?<=[。？！.?!])(?=[”"]?)', buffer)
    if len(sentences) <= 1:
        return [], buffer  # 还没到句子结束
    else:
        return sentences[:-1], sentences[-1]  # 最后一段是还没结束的部分


async def openai_chat(message: list[dict], json_output: bool = False) -> dict | str:
    client = AsyncOpenAI(
        api_key=openai_api_key,
        base_url=openai_base_url,
    )
    if json_output:
        completion = await client.chat.completions.create(
            model="deepseek-v4-pro", messages=message, response_format={"type": "json_object"},
            extra_body={"thinking": {"type": "disabled"}},
        )
        content = completion.choices[0].message.content
        return json.loads(content)
    else:
        completion = await client.chat.completions.create(
            model="deepseek-v4-pro", messages=message,
            extra_body={"thinking": {"type": "disabled"}},
        )
        return completion.choices[0].message.content
