import {hostAddr} from "@/config.js";

/**
 * 创建聊天
 * @param {string} userId
 * @param {number} mode
 * @param {string} situation
 * @returns {Promise<string>}
 */
async function createChat(userId, mode, situation) {
  const url = `${hostAddr}/chat`;
  const data = {
    user_id: userId,
    mode: mode,
    situation: situation,
  };

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    return result.chat_id;
  } catch (error) {
    console.error("Create Chat Error:", error);
  }
}

function updateChat(chatId, text, situation) {
  const url = `${hostAddr}/chat`;
  const requestBody = {chat_id: chatId, text, situation};
  const controller = new AbortController();

  const eventSource = {
    onmessage: null,
    onerror: null,
    onclose: null,
    close: () => {
      controller.abort();
    },
  };

  fetch(url, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(requestBody),
    signal: controller.signal,
  })
  .then((response) => {
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const reader = response.body.getReader();
    const decoder = new TextDecoder("utf-8");
    let buffer = "";

    const processStream = async () => {
      try {
        while (true) {
          const {done, value} = await reader.read();
          if (done) {
            if (eventSource.onclose) eventSource.onclose();
            break;
          }
          const chunk = decoder.decode(value, {stream: true});
          buffer += chunk;
          let parts = buffer.split("\n");
          buffer = parts.pop() || "";
          for (const part of parts) {
            if (part.trim()) {
              try {
                let msg = part.trim();
                // 如果存在 SSE 前缀 "data:"，则移除
                if (msg.startsWith("data:")) {
                  msg = msg.slice(5).trim();
                }
                const parsed = JSON.parse(msg);
                if (eventSource.onmessage) {
                  eventSource.onmessage({
                    data: JSON.stringify(parsed),
                  });
                }
              } catch (e) {
                console.error("解析 SSE 数据失败:", e);
                if (eventSource.onerror) {
                  eventSource.onerror(e);
                }
              }
            }
          }
        }
      } catch (error) {
        console.error("Update Chat 流处理错误:", error);
        if (eventSource.onerror) {
          eventSource.onerror(error);
        }
        if (eventSource.onclose) eventSource.onclose();
      }
    };
    processStream();
  })
  .catch((error) => {
    console.error("Update Chat Error:", error);
    if (eventSource.onerror) {
      eventSource.onerror(error);
    }
    if (eventSource.onclose) eventSource.onclose();
  });
  return eventSource;
}

/**
 * 获取聊天记录
 * @param {string} chatId
 * @returns {Promise<result: object>}
 */
async function getChat(chatId) {
  const url = `${hostAddr}/chat?chat_id=${chatId}`;

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error("Get Chat Error:", error);
  }
}

export {createChat, updateChat, getChat};
