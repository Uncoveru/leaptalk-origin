# 语音评测
import asyncio
import base64
import datetime
import hashlib
import hmac
import json
from urllib.parse import urlencode

import websockets
import xmltodict

from core.config import pron_root, xunfei_api_key, xunfei_appid, xunfei_api_secret


def create_url():
    # 生成RFC1123格式的时间戳
    date = datetime.datetime.now(datetime.UTC).strftime("%a, %d %b %Y %H:%M:%S %Z")
    # 拼接字符串
    signature_origin = "host: " + "ise-api.xfyun.cn" + "\n"
    signature_origin += "date: " + date + "\n"
    signature_origin += "GET " + "/v2/open-ise " + "HTTP/1.1"
    # 进行hmac-sha256进行加密
    signature_sha = hmac.new(
        xunfei_api_secret.encode("utf-8"),
        signature_origin.encode("utf-8"),
        hashlib.sha256,
    ).digest()
    signature_sha = base64.b64encode(signature_sha).decode(encoding="utf-8")
    authorization_origin = (
        'api_key="%s", algorithm="%s", headers="%s", signature="%s"'
        % (xunfei_api_key, "hmac-sha256", "host date request-line", signature_sha)
    )
    authorization = base64.b64encode(authorization_origin.encode("utf-8")).decode(
        encoding="utf-8"
    )
    # 将请求的鉴权参数组合为字典
    v = {"authorization": authorization, "date": date, "host": "ise-api.xfyun.cn"}
    # 拼接鉴权参数，生成url
    url = "wss://ise-api.xfyun.cn/v2/open-ise?" + urlencode(v)
    return url


async def evaluate(pcm_address: str, text: str) -> dict | None:
    """
    使用 WebSocket 连接执行语音文本评估。

    Args:
        pcm_address (str): 要评估的语音 ID。
        text (str): 语音文本内容。

    Returns:
        None: 如果在评估过程中出现错误或数据检索失败。
        str: 包含评估结果的 JSON 字符串，存储在文件系统中。
    """
    url = create_url()
    async with websockets.connect(url) as websocket:
        # 上传
        storage_address = pcm_address
        frame_size = 2560  # 每一帧的音频大小,实测1280为标准值,2560的综合效果最好
        interval = 0.04  # 发送音频间隔(单位:s)
        status = 0
        with open(storage_address, "rb") as fp:
            while True:
                buf = fp.read(frame_size)
                # 文件结束
                if not buf:
                    status = 3
                # 数据参数处理
                if status == 0:
                    d = {
                        "common": {"app_id": xunfei_appid},
                        "business": {
                            "aue": "raw",
                            "auf": "audio/L16;rate=16000",
                            "category": "read_sentence",
                            "cmd": "ssb",
                            "ent": "en_vip",
                            "sub": "ise",
                            "text": "\ufeff[content]" + text,
                            "ttp_skip": "true",
                            "ise_unite": "1",
                            "extra_ability": "multi_dimension",
                        },
                        "data": {"status": 0},
                    }
                    d = json.dumps(d)
                    await websocket.send(d)
                    status = 1
                # 第一帧处理
                elif status == 1:
                    d = {
                        "business": {"cmd": "auw", "aus": 1, "aue": "raw"},
                        "data": {
                            "status": 1,
                            "data": str(base64.b64encode(buf).decode()),
                        },
                    }
                    await websocket.send(json.dumps(d))
                    status = 2
                # 中间帧处理
                elif status == 2:
                    d = {
                        "business": {"cmd": "auw", "aus": 2, "aue": "raw"},
                        "data": {
                            "status": 1,
                            "data": str(base64.b64encode(buf).decode()),
                        },
                    }
                    await websocket.send(json.dumps(d))
                # 最后一帧处理
                elif status == 3:
                    d = {
                        "business": {"cmd": "auw", "aus": 4, "aue": "raw"},
                        "data": {
                            "status": 2,
                            "data": str(base64.b64encode(buf).decode()),
                        },
                    }
                    await websocket.send(json.dumps(d))
                    await asyncio.sleep(1)
                    break
                # 模拟音频采样间隔(必需)
                await asyncio.sleep(interval)

        # 下载
        while True:
            data = await websocket.recv()
            data = json.loads(data)

            if data["code"] != 0:
                err_msg = data["message"]
                code = data["code"]
                sid = data["sid"]
                print("sid:%s call error:%s code is:%s" % (sid, err_msg, code))
                await websocket.close()
                return None

            elif data["data"]["status"] == 2:
                break

        await websocket.close()
    result = data["data"]["data"]
    xml = base64.b64decode(result)

    result_dict = await xml_to_json(xml.decode())
    result_dict = result_dict["xml_result"]
    # 临时
    now = datetime.datetime.now().strftime("%Y-%m-%d_%H-%M-%S")
    with open(
        pron_root / f"{now}.json", "w", encoding="utf-8"
    ) as f:
        json.dump(result_dict, f, indent=4, ensure_ascii=False)
    return result_dict


async def xml_to_json(result_xml):
    d = xmltodict.parse(result_xml, attr_prefix="")
    keys_to_remove = [
        "beg_pos",
        "end_pos",
        "gwpp",
        "phone",
        "property",
        "index",
        "global_index",
    ]
    d = remove_keys(d, keys_to_remove)
    return d


def remove_keys(d, keys_to_remove):
    """
    递归删除嵌套字典中指定的键。

    :param d: 输入字典
    :param keys_to_remove: 要删除的键列表
    :return: 处理后的字典
    """
    if isinstance(d, dict):
        return {
            k: remove_keys(v, keys_to_remove)
            for k, v in d.items()
            if k not in keys_to_remove
        }
    elif isinstance(d, list):
        return [remove_keys(item, keys_to_remove) for item in d]
    else:
        return d
