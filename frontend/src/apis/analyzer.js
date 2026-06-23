import {hostAddr} from "@/config.js";

async function analyzeGrammar(text, level = "B1") {
  const response = await fetch(hostAddr + "/analysis/grammar", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({text, level}),
  });

  if (!response.ok) {
    throw new Error("Network response was not ok");
  }

  const data = await response.json();
  return data.gram_analysis;
}

async function analyzePronunciation(text, audioFile) {
  const formData = new FormData();
  formData.append("text", text);
  formData.append("audio", audioFile);

  const response = await fetch(hostAddr + "/analysis/pronunciation", {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    throw new Error("Network response was not ok");
  }

  const data = await response.json();
  return {
    pronEvaluation: data.pron_score,
    pronAnalysis: data.pron_analysis,
  };
}

/**
 * 调用 /analysis/save 接口保存分析结果
 * @param {string} messageId - 消息 ID
 * @param {string} gramAnalysis - 语法分析结果
 * @param {string} pronAnalysis - 发音分析结果
 * @param {Object} pronScore - 发音评分对象（如：{ accuracy: 90, fluency: 85 }）
 * @returns {Promise<Object>} 返回解析后的响应数据
 */
async function saveAnalysis(messageId, gramAnalysis, pronAnalysis, pronScore) {
  const url = hostAddr + "/analysis/save";

  const requestBody = {
    message_id: messageId,
    gram_analysis: gramAnalysis,
    pron_analysis: pronAnalysis,
  };

  if (pronScore !== null && pronScore !== undefined) {
    requestBody.pron_score = pronScore;
  }

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(
        errorData.detail || `HTTP error! status: ${response.status}`,
      );
    }

    return await response.json(); // 返回服务器返回的数据，例如 { status: 1, analysis_id: "..." }
  } catch (error) {
    console.error("Error saving analysis:", error);
    throw error;
  }
}

async function translateText(text, onUpdate) {
  const response = await fetch(hostAddr + "/translate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text }),
  });
  if (!response.ok) throw new Error("Translation failed");

  const reader = response.body.getReader();
  const decoder = new TextDecoder("utf-8");
  let buffer = "";

  const fields = ["translation", "phonetic", "pos", "example", "example_cn"];
  const fieldRegex = (f) => new RegExp(`"${f}"\\s*:\\s*"((?:[^"\\\\]|\\\\.)*)"`)

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    const partial = {};
    for (const f of fields) {
      const m = fieldRegex(f).exec(buffer);
      if (m) partial[f] = m[1].replace(/\\"/g, '"').replace(/\\\\/g, "\\");
    }
    if (Object.keys(partial).length > 0) onUpdate(partial);
  }
}

function createIncrementalParser(onUpdate) {
  const fields = ["grammar_analysis", "pronunciation_analysis", "expression_analysis"];
  let accumulated = "";
  let currentField = null;
  let fieldValue = "";
  let inValue = false;
  let escaping = false;

  return function feed(rawText) {
    const newChars = rawText.slice(accumulated.length);

    for (const char of newChars) {
      accumulated += char;

      if (!inValue) {
        for (const field of fields) {
          if (
            accumulated.endsWith(`"${field}": "`) ||
            accumulated.endsWith(`"${field}":"`)
          ) {
            currentField = field;
            fieldValue = "";
            inValue = true;
            break;
          }
        }
      } else {
        if (escaping) {
          if (char === "n") fieldValue += "\n";
          else if (char === '"') fieldValue += '"';
          else if (char === "\\") fieldValue += "\\";
          else if (char === "t") fieldValue += "\t";
          else fieldValue += char;
          escaping = false;
        } else if (char === "\\") {
          escaping = true;
        } else if (char === '"') {
          inValue = false;
          currentField = null;
        } else {
          fieldValue += char;
        }
        if (currentField) {
          onUpdate({ [currentField]: fieldValue });
        }
      }
    }
  };
}

async function analyzeSummarize(chatId, onUpdate) {
  const url = hostAddr + `/analysis/summarize?chat_id=${encodeURIComponent(chatId)}`;

  const response = await fetch(url, { method: "GET" });
  if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

  const reader = response.body.getReader();
  const decoder = new TextDecoder("utf-8");
  const feed = createIncrementalParser(onUpdate);

  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    const parts = buffer.split("\n\n");
    buffer = parts.pop() || "";

    for (const part of parts) {
      if (!part) continue;

      const dataLines = [];
      for (const line of part.split("\n")) {
        if (line.startsWith("data: ")) {
          dataLines.push(line.slice(6));
        } else if (line.startsWith("data:")) {
          dataLines.push(line.slice(5));
        }
      }
      if (dataLines.length === 0) continue;

      try {
        const parsed = JSON.parse(dataLines.join("\n"));
        if (parsed && typeof parsed.error === "string") {
          throw new Error(parsed.error);
        }
        if (typeof parsed === "string") {
          feed(parsed);
        }
      } catch (e) {
        if (e.message && !e.message.startsWith("Unexpected")) {
          throw e;
        }
      }
    }
  }
}

async function downloadReportDocx(chatId) {
  const apiUrl = hostAddr + `/analysis/summarize/docx?chat_id=${chatId}`;

  const response = await fetch(apiUrl, { method: "GET" });

  if (!response.ok) {
    throw new Error(`Failed to download report: ${response.status} ${response.statusText}`);
  }

  const contentDisposition = response.headers.get("content-disposition");
  const filename = contentDisposition
    ? contentDisposition.split("filename=")[1].replace(/"/g, "")
    : "report.docx";

  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  window.URL.revokeObjectURL(url);
  document.body.removeChild(a);
}

export {analyzeGrammar, analyzePronunciation, saveAnalysis, analyzeSummarize, downloadReportDocx, translateText};
