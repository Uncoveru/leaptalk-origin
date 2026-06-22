import dashscope
import requests

from core.config import dashscope_api_key


def qwen_tts_stream(text: str):
    response = dashscope.audio.qwen_tts.SpeechSynthesizer.call(
        model="qwen-tts",
        api_key=dashscope_api_key,
        text=text,
        voice="Cherry",
        stream=True,
    )
    for chunk in response:
        if chunk.status_code == 200:
            wav_base64 = chunk.output.audio["data"]
            if wav_base64:
                yield wav_base64


def qwen_tts_file(text: str, file_path: str, file_name: str):
    response = dashscope.audio.qwen_tts.SpeechSynthesizer.call(
        model="qwen-tts",
        api_key=dashscope_api_key,
        text=text,
        voice="Cherry",
        stream=False,
    )
    audio_url = response.output.audio.get("url", "")
    response = requests.get(audio_url)
    response.raise_for_status()
    with open(f"{file_path}/{file_name}.wav", "wb") as f:
        f.write(response.content)
    return f"{file_name}.wav"
