import React, {useCallback, useEffect, useRef, useState} from "react";
import ChatView from "@/components/Chat/ChatView.jsx";
import VoiceView from "@/components/Chat/VoiceView.jsx";
import MessageInput from "@/components/Chat/MessageInput.jsx";
import ChatInfoPanel from "@/components/Chat/ChatInfoPanel.jsx";
import {useLocation, useNavigate} from "react-router-dom";
import {Alert, Flex, Layout, message} from "antd";
import SpeechRecognition, {
  useSpeechRecognition,
} from "react-speech-recognition";
import {createChat, updateChat} from "@/apis/chat.js";
import {
  analyzeGrammar,
  analyzePronunciation,
  saveAnalysis,
} from "@/apis/analyzer.js";
import "./Common.css";
import {AppHeader} from "@/components/Common/AppHeader.jsx";

const {Content} = Layout;

/**
 * 口语对话主页面
 */
export function ChatPage() {
  const location = useLocation();
  const {userId, chatInfo, first} = location.state || {};
  const [chatId, setChatId] = useState(null);
  const [viewMode, setViewMode] = useState("chat"); // "chat" 或 "voice"
  const [messages, setMessages] = useState([]);
  const [streamError, setStreamError] = useState(false);
  const navigate = useNavigate();

  // 转录
  const [recordingState, setRecordingState] = useState("idle");
  const {transcript, resetTranscript, browserSupportsSpeechRecognition} =
    useSpeechRecognition();

  // 录音（状态使用recordingState）
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const audioBlobRef = useRef(null);

  // 音频播放
  const audioPlayingRef = useRef(null);
  const [audioPlaying, setAudioPlaying] = useState(false);
  const audioQueueRef = useRef([]);
  const audioCtxRef = useRef(null);
  const audioSourceRef = useRef(null);
  const currentEventSourceRef = useRef(null);

  // 切换页面模式
  const messagesLengthRef = useRef(0);
  useEffect(() => { messagesLengthRef.current = messages.length; }, [messages]);

  const handleSwitch = () => {
    if (submitTimerRef.current) {
      clearTimeout(submitTimerRef.current);
      submitTimerRef.current = null;
    }
    if (currentEventSourceRef.current) {
      currentEventSourceRef.current.close();
      currentEventSourceRef.current = null;
    }
    audioQueueRef.current = [];
    if (audioSourceRef.current) {
      try { audioSourceRef.current.stop(); } catch { /* AudioContext may already be closed */ }
      audioSourceRef.current = null;
    }
    audioPlayingRef.current = false;
    setAudioPlaying(false);
    setViewMode((prev) => (prev === "chat" ? "voice" : "chat"));
    setRecordingState("idle");
    resetTranscript();
    setPaused(false);
    setNoSpeechCount(0);
  };

  // 创建聊天
  const lastChatKeyRef = useRef("");

  useEffect(() => {
    if (!userId || !chatInfo) {
      message.warning("请从首页开始对话");
      navigate("/", { replace: true });
    }
  }, [userId, chatInfo, navigate]);

  useEffect(() => {
    if (!userId || !chatInfo) return;

    const runKey = `${userId}|${chatInfo.mode}|${chatInfo.situation}`;

    if (lastChatKeyRef.current === runKey) {
      return;
    }
    lastChatKeyRef.current = runKey;

    async function fetchChatId() {
      try {
        const chatId = await createChat(userId, chatInfo.mode, chatInfo.situation, chatInfo.level || "B1");
        setChatId(chatId);
      } catch {
        message.error("创建对话失败，请检查网络后刷新页面重试");
        setStreamError(true);
      }
    }

    void fetchChatId();
  }, [userId, chatInfo?.mode, chatInfo?.situation]);

  function onClose() {
    navigate("/");
  }

  function onSummarize() {
    navigate("/summary", { state: { chatId } });
  }

  // 播放音频
  const playAudio = useCallback(async (pcmBase64) => {
    if (!audioCtxRef.current) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      audioCtxRef.current = new AudioCtx();
    }
    const audioCtx = audioCtxRef.current;
    if (audioCtx.state === "suspended") {
      await audioCtx.resume();
    }

    const sampleRate = 24000;
    const numChannels = 1;

    // Base64 解码
    const binary = atob(pcmBase64);
    const pcmData = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      pcmData[i] = binary.charCodeAt(i);
    }

    // 转为 16 位有符号整型 PCM
    const pcm16 = new Int16Array(pcmData.buffer);

    // 转为浮点数 [-1.0, 1.0]
    const float32 = new Float32Array(pcm16.length);
    for (let i = 0; i < pcm16.length; i++) {
      float32[i] = pcm16[i] / 32768;
    }

    const audioBuffer = audioCtx.createBuffer(
      numChannels,
      float32.length,
      sampleRate,
    );
    audioBuffer.getChannelData(0).set(float32);

    const source = audioCtx.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(audioCtx.destination);

    audioSourceRef.current = source;
    audioPlayingRef.current = true;
    setAudioPlaying(true);
    source.start();

    source.onended = () => {
      audioSourceRef.current = null;
      if (audioQueueRef.current.length > 0) {
        const next = audioQueueRef.current.shift();
        playAudio(next);
      } else {
        audioPlayingRef.current = false;
        setAudioPlaying(false);
      }
    };
  }, []);

  const autoStartDoneRef = useRef(false);

  const startAssistantFirst = useCallback(async () => {
    if (autoStartDoneRef.current) return;
    autoStartDoneRef.current = true;
    setStreamError(false);
    setMessages([
      { role: "user", content: "" },
      { role: "assistant", content: "" },
    ]);
    const ai = 1;
    let t = "";
    if (currentEventSourceRef.current) {
      currentEventSourceRef.current.close();
    }
    const es = updateChat(chatId, "Start the conversation.", chatInfo.situation, chatInfo.level || "B1");
    currentEventSourceRef.current = es;
    es.onmessage = (ev) => {
      const d = JSON.parse(ev.data);
      if (d.type === "text") { t += d.content || ""; setMessages(p => { const u = [...p]; u[ai] = { ...u[ai], content: t }; return u; }); }
      else if (d.type === "audio" && d.content) { if (audioPlayingRef.current) audioQueueRef.current.push(d.content); else playAudio(d.content); }
    };
    es.onerror = () => { setStreamError(true); es.close(); currentEventSourceRef.current = null; };
  }, [chatId, chatInfo?.situation, playAudio]);

  useEffect(() => {
    if (chatId && first === "assistant") { startAssistantFirst(); }
  }, [chatId, first, startAssistantFirst]);

  // Chat模式
  const onStart = useCallback(
    async function () {
      // 开始录音与转录
      setRecordingState("recording");
      try {
        // 1. 开始录音
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
        });
        const mediaRecorder = new MediaRecorder(stream, {
          mimeType: "audio/webm; codecs=opus",
        });
        mediaRecorderRef.current = mediaRecorder;
        audioChunksRef.current = [];
        mediaRecorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            audioChunksRef.current.push(event.data);
          }
        };
        mediaRecorder.start();
        // 2. 开始转录
        if (!browserSupportsSpeechRecognition) {
          message.warning("当前浏览器不支持语音识别，请使用 Chrome 或 Edge");
        }
        await SpeechRecognition.startListening({
          continuous: true,
          language: "en-US",
        });
      } catch (e) {
        setRecordingState("idle");
        console.error("开始录音与转录失败！", e);
      }
    },
    [browserSupportsSpeechRecognition],
  );

  const onStop = useCallback(async () => {
    setRecordingState("stop");
    try {
      await SpeechRecognition.stopListening();
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
        mediaRecorderRef.current.onstop = () => {
          audioBlobRef.current = new Blob(audioChunksRef.current, {
            type: "audio/webm; codecs=opus",
          });
          audioChunksRef.current = [];
          if (mediaRecorderRef.current?.stream) {
            mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
          }
        };
        mediaRecorderRef.current.stop();
      }
    } catch (e) {
      console.error("停止录音与转录失败！", e);
    }
  }, []);

  const onReRecord = useCallback(() => {
    setRecordingState("recording");
    resetTranscript();
    audioChunksRef.current = [];
    audioBlobRef.current = null;
    if (mediaRecorderRef.current?.stream) {
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
    }
    void onStart();
  }, [onStart, resetTranscript]);

  const onSubmit = useCallback(
    async function () {
      // 提交录音与转录结果
      setStreamError(false);
      // -1. 检测transcript
      if (!transcript.trim()) {
        console.error("没有识别到内容");
        return;
      }
      // 0. 更新messages
      const newMessage = {
        role: "user",
        content: transcript,
        analysis: null,
      };
      const userIndex = messagesLengthRef.current;
      setMessages((prev) => {
        // ...后续分析结果合并...
        return [...prev, newMessage, {role: "assistant", content: ""}];
      });
      // 1. 获取对话回复
      let assistantContent = "";
      let assistantId = null;
      let resolveAssistantId;
      const assistantIdPromise = new Promise((resolve) => { resolveAssistantId = resolve; });

      if (currentEventSourceRef.current) {
        currentEventSourceRef.current.close();
      }
      const eventSource = updateChat(chatId, transcript, chatInfo.situation, chatInfo.level || "B1");
      currentEventSourceRef.current = eventSource;
      eventSource.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (data.type === "text") {
          assistantContent += data.content || "";
          setMessages((prev) => {
            const updated = [...prev];
            const lastIdx = updated.length - 1;
            updated[lastIdx] = {
              ...updated[lastIdx],
              content: assistantContent,
            };
            return updated;
          });
        } else if (data.type === "audio" && data.content) {
          if (audioPlayingRef.current) {
            audioQueueRef.current.push(data.content);
          } else {
            playAudio(data.content);
          }
        } else if (data.index === -1 && data.type === "id") {
          assistantId = data.content;
          resolveAssistantId(assistantId);
        }
      };
      eventSource.onerror = (err) => {
        console.error("assistant 回复出错", err);
        setStreamError(true);
        eventSource.close();
        currentEventSourceRef.current = null;
        resolveAssistantId(null);
      };
      eventSource.onclose = () => {
        currentEventSourceRef.current = null;
        if (!assistantContent) {
          setStreamError(true);
        }
        resolveAssistantId(null);
      };
      // 2. 获取分析
      let grammarResult = null;
      let pronResult = null;
      try {
        grammarResult = await analyzeGrammar(transcript, chatInfo.level || "B1");
        setMessages((prev) => {
          const updated = [...prev];
          const oldAnalysis = updated[userIndex].analysis || {};
          updated[userIndex] = {
            ...updated[userIndex],
            analysis: {...oldAnalysis, grammar: grammarResult},
          };
          return updated;
        });
      } catch {
        grammarResult = "语法分析失败。";
        setMessages((prev) => {
          const updated = [...prev];
          const oldAnalysis = updated[userIndex].analysis || {};
          updated[userIndex] = {
            ...updated[userIndex],
            analysis: { ...oldAnalysis, grammar: grammarResult },
          };
          return updated;
        });
      }

      try {
        pronResult = await analyzePronunciation(
          transcript,
          audioBlobRef.current,
        );
        setMessages((prev) => {
          const updated = [...prev];
          const oldAnalysis = updated[userIndex].analysis || {};
          updated[userIndex] = {
            ...updated[userIndex],
            analysis: { ...oldAnalysis, pronunciation: pronResult },
          };
          return updated;
        });
      } catch {
        pronResult = { pronAnalysis: "发音分析失败，请重试。", pronEvaluation: null };
        setMessages((prev) => {
          const updated = [...prev];
          const oldAnalysis = updated[userIndex].analysis || {};
          updated[userIndex] = {
            ...updated[userIndex],
            analysis: { ...oldAnalysis, pronunciation: pronResult },
          };
          return updated;
        });
      }

      // 4. 上传消息与分析
      try {
        const resolvedId = await assistantIdPromise;
        if (resolvedId) {
          await saveAnalysis(
            resolvedId,
            grammarResult,
            pronResult?.pronAnalysis || "无",
            pronResult?.pronEvaluation || null,
          );
        }
      } catch (e) {
        console.error("保存分析失败", e);
      }
      // 5. 后续处理
      resetTranscript();
      setRecordingState("idle");
    },
    [chatId, transcript, resetTranscript, setMessages, setRecordingState, playAudio],
  );

  // Voice模式
  const [_noSpeechCount, setNoSpeechCount] = useState(0);
  const [paused, setPaused] = useState(false); // 是否暂停语音识别
  const [currentVoiceRole, setCurrentVoiceRole] = useState("");
  const [currentVoiceText, setCurrentVoiceText] = useState("");
  const lastTranscriptRef = useRef(transcript);
  const submitTimerRef = useRef(null);
  const isSubmittingRef = useRef(false); // 防止重复提交
  const onSubmitRef = useRef(onSubmit);
  useEffect(() => { onSubmitRef.current = onSubmit; }, [onSubmit]);

  useEffect(() => {
    if (recordingState === "recording") {
      setCurrentVoiceRole("user");
      setCurrentVoiceText(transcript);
    } else if (recordingState === "stop") {
      setCurrentVoiceRole("assistant");
      setCurrentVoiceText("");
    } else if (messages.length > 0) {
      setCurrentVoiceRole(messages[messages.length - 1].role);
      setCurrentVoiceText(messages[messages.length - 1].content);
    }
  }, [recordingState, transcript, messages]);

  useEffect(() => {
    console.log("🔄 [Voice Submit Effect] 触发，当前 transcript:", transcript);
    console.log("条件检查: viewMode =", viewMode, ", recordingState =", recordingState, ", paused =", paused);

    if (viewMode !== "voice" || paused || audioPlaying) {
      console.log("⚠️ 条件不满足，跳过");
      return;
    }

    // 1️⃣ 开始录音（如果处于 idle 状态）
    if (recordingState === "idle") {
      void onStart();
      console.log("🎙️ 开始录音");
    }

    // 2️⃣ 清除之前的定时器
    if (submitTimerRef.current) {
      clearTimeout(submitTimerRef.current);
      submitTimerRef.current = null;
      console.log("⏰ 定时器已清除");
    }

    // 3️⃣ 如果 transcript 为空，不设置定时器
    if (!transcript.trim()) {
      console.log("💬 transcript 为空，暂不设置定时器");
      lastTranscriptRef.current = transcript;
      return;
    }

    console.log("✅ transcript 非空，设置 2 秒提交定时器");

    // 4️⃣ 设置定时器：2秒无更新则提交
    submitTimerRef.current = setTimeout(async () => {
      if (isSubmittingRef.current) {
        return;
      }

      if (lastTranscriptRef.current === transcript) {
        isSubmittingRef.current = true;
        submitTimerRef.current = null;

        setNoSpeechCount(0);
        await onStop();

        setTimeout(async () => {
          await onSubmitRef.current();
          isSubmittingRef.current = false;
        }, 100);
      }
    }, 2000);

    // 5️⃣ 更新最后一次 transcript
    lastTranscriptRef.current = transcript;

    // 6️⃣ 清理副作用
    return () => {
      if (submitTimerRef.current) {
        clearTimeout(submitTimerRef.current);
        submitTimerRef.current = null;
        console.log("🧹 定时器已清理");
      }
    };
  }, [
    viewMode,
    recordingState,
    paused,
    audioPlaying,
    onStart,
    onStop,
    onSubmit,
    transcript,
  ]);

  useEffect(() => {
    return () => {
      if (audioSourceRef.current) {
        try { audioSourceRef.current.stop(); } catch { /* AudioContext may already be closed */ }
        audioSourceRef.current = null;
      }
      if (audioCtxRef.current) {
        audioCtxRef.current.close();
        audioCtxRef.current = null;
      }
      if (currentEventSourceRef.current) {
        currentEventSourceRef.current.close();
        currentEventSourceRef.current = null;
      }
    };
  }, []);

  function onPause() {
    // 暂停语音识别
    setPaused(true);
    setNoSpeechCount(0);
    setRecordingState("idle");
  }

  return (
    <Layout className="layoutRoot">
      <AppHeader/>
      <Content className="contentBox">
        <Flex
          vertical={true}
          style={{width: "100%", height: "100%"}}
        >
          <ChatInfoPanel
            chatInfo={chatInfo}
            onClose={onClose}
            onSummarize={onSummarize}
            view={viewMode}
            onSetView={handleSwitch}
          />
          {viewMode === "chat" ? (
            <Flex
              vertical={true}
              justify="center"
              style={{width: "100%", height: "80%"}}
            >
              <ChatView messages={messages}/>
              {streamError && (
                <Alert
                  type="warning"
                  message="AI 回复中断"
                  description="网络异常或服务繁忙，请重试。"
                  showIcon
                  closable
                  onClose={() => setStreamError(false)}
                  style={{ marginBottom: 8 }}
                />
              )}
              <MessageInput
                transcriptionResult={transcript}
                recordingState={recordingState}
                onStart={onStart}
                onStop={onStop}
                onReRecord={onReRecord}
                onSubmit={onSubmit}
              />
            </Flex>
          ) : (
            <VoiceView
              role={currentVoiceRole}
              text={currentVoiceText}
              paused={paused}
              onPaused={onPause}
              setPaused={setPaused}
            />
          )}
        </Flex>
      </Content>
    </Layout>
  );
}

export default ChatPage;
