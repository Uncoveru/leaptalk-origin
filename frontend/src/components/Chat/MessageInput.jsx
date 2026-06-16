import React from "react";
import { Button, Flex, Typography, Space } from "antd";
import { AudioOutlined, SendOutlined, RedoOutlined, PauseCircleOutlined } from "@ant-design/icons";

const { Text } = Typography;

export function MessageInput({
  transcriptionResult,
  recordingState,
  onStart,
  onStop,
  onReRecord,
  onSubmit,
}) {
  return (
    <Flex
      vertical
      justify="center"
      align="center"
      style={{ width: "100%", padding: "16px 0 8px", borderTop: "1px solid #f0f0f0" }}
    >
      {transcriptionResult && (
        <div
          style={{
            width: "100%",
            padding: "10px 16px",
            background: "#fafafa",
            borderRadius: 8,
            marginBottom: 12,
            textAlign: "center",
            minHeight: 36,
          }}
        >
          <Text style={{ fontSize: 15, color: "#333" }}>
            {transcriptionResult}
          </Text>
        </div>
      )}

      {recordingState === "idle" && (
        <Button
          type="primary"
          size="large"
          icon={<AudioOutlined />}
          onClick={onStart}
          style={{ borderRadius: 24, height: 44, paddingInline: 28 }}
        >
          开始录音
        </Button>
      )}

      {recordingState === "recording" && (
        <Flex vertical align="center" gap={8}>
          <div className="recording-indicator">
            <span className="recording-dot" />
            <Text style={{ color: "#ff4d4f", fontWeight: 500 }}>正在录音...</Text>
          </div>
          <Button
            danger
            size="large"
            icon={<PauseCircleOutlined />}
            onClick={onStop}
            style={{ borderRadius: 24, height: 44, paddingInline: 28 }}
          >
            停止录音
          </Button>
        </Flex>
      )}

      {recordingState === "stop" && (
        <Space size="middle">
          <Button
            size="large"
            icon={<RedoOutlined />}
            onClick={onReRecord}
            style={{ borderRadius: 24, height: 44 }}
          >
            重新录音
          </Button>
          <Button
            type="primary"
            size="large"
            icon={<SendOutlined />}
            onClick={onSubmit}
            style={{ borderRadius: 24, height: 44 }}
          >
            提交
          </Button>
        </Space>
      )}

      <style>{`
        .recording-indicator {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 8px;
        }
        .recording-dot {
          width: 10px;
          height: 10px;
          background: #ff4d4f;
          border-radius: 50%;
          animation: pulse 1s ease-in-out infinite;
        }
      `}</style>
    </Flex>
  );
}

export default MessageInput;
