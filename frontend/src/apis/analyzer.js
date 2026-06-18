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

async function analyzeSummarize(chatId, onUpdate) {
  const url = hostAddr + `/analysis/summarize?chat_id=${encodeURIComponent(chatId)}`;

  const response = await fetch(url, { method: "GET" });
  if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

  const reader = response.body.getReader();
  const decoder = new TextDecoder("utf-8");

  const fields = ["grammar_analysis", "pronunciation_analysis", "expression_analysis"];
  let accumulated = "";   // 用于最终解析
  let currentField = null;
  let fieldValue = "";
  let inValue = false;
  let escaping = false;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    const chunk = decoder.decode(value, { stream: true });

    for (const char of chunk) {
      accumulated += char;

      if (!inValue) {
        // 检测字段起始标记
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
        // 在字段值内部逐字符处理
        if (escaping) {
          if (char === "n") fieldValue += "\n";
          else if (char === '"') fieldValue += '"';
          else if (char === "\\") fieldValue += "\\";
          else if (char === "t") fieldValue += "\t";
          else fieldValue += char;
          escaping = false;
          onUpdate({ [currentField]: fieldValue });
        } else if (char === "\\") {
          escaping = true;
        } else if (char === '"') {
          // 字段值结束
          inValue = false;
          currentField = null;
        } else {
          fieldValue += char;
          onUpdate({ [currentField]: fieldValue });
        }
      }
    }
  }

  try {
    return JSON.parse(accumulated);
  } catch {
    return null;
  }
}

async function downloadReportDocx(chatId) {
  try {
    // 构造 API 请求 URL
    const apiUrl = hostAddr + `/analysis/summarize/docx?chat_id=${chatId}`;

    // 发起 GET 请求
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // 检查响应状态
    if (!response.ok) {
      throw new Error(`Failed to download report: ${response.status} ${response.statusText}`);
    }

    // 获取文件名
    const contentDisposition = response.headers.get('content-disposition');
    const filename = contentDisposition
      ? contentDisposition.split('filename=')[1].replace(/"/g, '')
      : 'report.docx';

    // 创建一个 Blob 对象并下载文件
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);

    console.log('Report downloaded successfully');
  } catch (error) {
    console.error('Error downloading report:', error);
  }
}

export {analyzeGrammar, analyzePronunciation, saveAnalysis, analyzeSummarize, downloadReportDocx, translateText};
