import {hostAddr} from "@/config.js";

async function getSituation() {
  const url = hostAddr + "/situations";
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

    const data = await response.json(); // 使用 await 解析 JSON
    return data.situations; // 返回场景列表
  } catch (error) {
    console.error("Failed to fetch situations:", error);
    throw error;
  }
}

async function createDetailedSituation(index, level = "B1") {
  const url = hostAddr + "/situation/" + index + "?level=" + encodeURIComponent(level);
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

    const data = await response.json(); // 使用 await 解析 JSON
    return data; // 返回具体场景信息
  } catch (error) {
    console.error("Failed to fetch detailed situation:", error);
    throw error;
  }
}

export {getSituation, createDetailedSituation};
