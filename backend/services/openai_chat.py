import json
import re
from collections.abc import Iterable
from typing import Literal, overload

from openai import OpenAI, AsyncOpenAI

from core.config import openai_api_key, openai_base_url, openai_model

_client = OpenAI(api_key=openai_api_key, base_url=openai_base_url)
_async_client = AsyncOpenAI(api_key=openai_api_key, base_url=openai_base_url)


def openai_chat_stream(messages: Iterable[dict[str, str]]):
    completion = _client.chat.completions.create(
        model=openai_model,
        messages=messages,  # type: ignore[arg-type]
        stream=True,
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
    sentences = re.split(r'(?<=[。？！.?!])(?=[”"]?)', buffer)
    if len(sentences) <= 1:
        return [], buffer
    else:
        return sentences[:-1], sentences[-1]


def openai_chat_stream_tokens(messages: Iterable[dict[str, str]]):
    completion = _client.chat.completions.create(
        model=openai_model,
        messages=messages,  # type: ignore[arg-type]
        stream=True,
        extra_body={"thinking": {"type": "disabled"}},
    )
    for chunk in completion:
        if not getattr(chunk, "choices", None) or not chunk.choices:
            continue
        content = chunk.choices[0].delta.content
        if content:
            yield content


@overload
async def openai_chat(
    messages: Iterable[dict[str, str]], json_output: Literal[True]
) -> dict: ...


@overload
async def openai_chat(
    messages: Iterable[dict[str, str]], json_output: Literal[False] = False
) -> str: ...


async def openai_chat(messages, json_output=False):
    if json_output:
        completion = await _async_client.chat.completions.create(
            model=openai_model,
            messages=messages,  # type: ignore[arg-type]
            response_format={"type": "json_object"},
            extra_body={"thinking": {"type": "disabled"}},
        )
        content = completion.choices[0].message.content or "{}"
        return json.loads(content)
    else:
        completion = await _async_client.chat.completions.create(
            model=openai_model,
            messages=messages,  # type: ignore[arg-type]
            extra_body={"thinking": {"type": "disabled"}},
        )
        return completion.choices[0].message.content or ""
