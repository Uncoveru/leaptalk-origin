import time

import numpy as np
import pyaudio

from services.dashscope_audio import qwen_audio_stream
from services.dashscope_tts import qwen_tts_stream


def main():
    p = pyaudio.PyAudio()
    stream = p.open(format=pyaudio.paInt16, channels=1, rate=24000, output=True)
    path = "E:/Python/OralPractice/data/qwen-tts.wav"
    for chunk in qwen_audio_stream([], path):
        print(chunk)
        for audio_chunk in qwen_tts_stream(chunk):
            audio_np = np.frombuffer(audio_chunk, dtype=np.int16)
            stream.write(audio_np.tobytes())

    time.sleep(0.8)
    stream.stop_stream()
    stream.close()
    p.terminate()


if __name__ == "__main__":
    main()
