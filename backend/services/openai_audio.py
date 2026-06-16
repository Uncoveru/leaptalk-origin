import base64
import json
from pathlib import Path

import aiofiles
from openai import AsyncOpenAI

from core.config import openai_api_key, openai_base_url, history_root

AUDIO_CONFIG = {"voice": "alloy", "format": "wav"}


class GPTInteraction:
    def __init__(self, chat_id: str, user_id: str):
        self.client = AsyncOpenAI(api_key=openai_api_key, base_url=openai_base_url)
        self.chat_id = chat_id
        self.user_id = user_id
        self.messages = []

    async def load_history(self):
        history_path = Path(history_root) / self.user_id
        history_path.mkdir(parents=True, exist_ok=True)
        history_file = history_path / f"{self.chat_id}.json"
        if history_file.exists():
            async with aiofiles.open(history_file, encoding="utf-8") as f:
                content = await f.read()
                self.messages = json.loads(content)
        else:
            self.messages = [
                {"role": "system", "content": "You are a helpful assistant."},
            ]

    async def interact(self, wav_data: bytes):
        encoded_audio = base64.b64encode(wav_data).decode("utf-8")

        self.messages.append(
            {
                "role": "user",
                "content": [
                    {"type": "text", "text": "祝您生日快乐。"},
                    {
                        "type": "input_audio",
                        "input_audio": {
                            "data": encoded_audio,
                        },
                    },
                ],
            }
        )
        completion = await self.client.chat.completions.create(
            model="gpt-4o-audio-preview",
            modalities=["audio", "text"],
            audio=AUDIO_CONFIG,
            messages=self.messages,
            # stream=True
        )
        print(completion)
        # async for chunk in completion:
        #     print(chunk)
        # if hasattr(chunk, "audio") and chunk.audio:
        #     yield chunk.audio


if __name__ == "__main__":
    import asyncio

    async def main():
        gpt = GPTInteraction(chat_id="123", user_id="456")
        await gpt.load_history()
        # Simulate wav data
        async with aiofiles.open("../data/example_input.wav", "rb") as f:
            wav_data = await f.read()
        await gpt.interact(wav_data)

    asyncio.run(main())
