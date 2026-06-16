import time

import numpy as np
import pyaudio

from services.dashscope_tts import qwen_tts_stream
from services.openai_chat import openai_chat_stream


def main():
    p = pyaudio.PyAudio()
    stream = p.open(format=pyaudio.paInt16, channels=1, rate=24000, output=True)
    message = [{"role": "user", "content": "编一个100字的睡前小故事。"}]
    for chunk in openai_chat_stream(message):
        print(chunk, type(chunk))
        for audio_chunk in qwen_tts_stream(chunk):
            audio_np = np.frombuffer(audio_chunk, dtype=np.int16)
            stream.write(audio_np.tobytes())

    time.sleep(0.8)
    stream.stop_stream()
    stream.close()
    p.terminate()


if __name__ == "__main__":
    main()
