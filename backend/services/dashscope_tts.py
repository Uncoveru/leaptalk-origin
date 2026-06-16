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


if __name__ == "__main__":
    # import time
    #
    # import numpy as np
    # import pyaudio
    #
    # p = pyaudio.PyAudio()
    # stream = p.open(format=pyaudio.paInt16, channels=1, rate=24000, output=True)
    # text = "Life is a journey, not a destination."
    # for chunk in qwen_tts_stream(text):
    #     audio_np = np.frombuffer(chunk, dtype=np.int16)
    #     stream.write(audio_np.tobytes())
    # time.sleep(0.8)
    # stream.stop_stream()
    # stream.close()
    # p.terminate()
    text = "帮助学生清晰了解自身水平，找到改进方向。"
    file_path_test = "E:/Python/OralPractice/data"
    file_name = f"tts_{9}"
    qwen_tts_file(text, file_path_test, file_name)
