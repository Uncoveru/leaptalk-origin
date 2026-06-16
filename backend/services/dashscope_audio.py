import re

from dashscope import MultiModalConversation

from core.config import dashscope_api_key


def qwen_audio_stream(message: list[dict], wav_path: str):
    message.append({"role": "user", "content": [{"audio": f"file://{wav_path}"}]})
    response = MultiModalConversation.call(
        model="qwen-audio-turbo-latest",
        api_key=dashscope_api_key,
        messages=message,
        stream=True,
        incremental_output=True,
    )
    string_buf = ""
    for chunk in response:
        if chunk.status_code == 200:
            content = chunk.output.choices[0].message.get("content", [])
            string_buf += content[0].get("text", "") if content else ""
            sentences, string_buf = extract_sentences_from_buffer(string_buf)
            if sentences:
                yield "".join(sentences)

        else:
            print("Error:", chunk.status_code, chunk)


def extract_sentences_from_buffer(buffer):
    # 检查有没有完整的句子
    sentences = re.split(r'(?<=[。？！.?!])(?=[”"]?)', buffer)
    if len(sentences) <= 1:
        return [], buffer  # 还没到句子结束
    else:
        return sentences[:-1], sentences[-1]  # 最后一段是还没结束的部分


if __name__ == "__main__":
    wav_path = "E:/Python/OralPractice/data/input_2.wav"
    for chunk in qwen_audio_stream([], wav_path):
        print(chunk)
