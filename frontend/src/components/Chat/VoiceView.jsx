import React from "react";
import { Button, Flex, Typography } from "antd";
import { PauseCircleOutlined, PlayCircleOutlined, AudioOutlined, RobotOutlined } from "@ant-design/icons";
import "./VoiceView.css";

const { Text, Title } = Typography;

export function VoiceView({ role, text, paused, setPaused, onPaused }) {
  const handlePauseClick = () => {
    if (!paused && onPaused) {
      onPaused();
    } else if (setPaused) {
      setPaused(!paused);
    }
  };

  const isUser = role === "user";

  return (
    <Flex vertical align="center" justify="center" className="voice-container">
      <div className={`voice-avatar ${isUser ? "voice-avatar-user" : "voice-avatar-ai"} ${paused ? "" : "voice-avatar-speaking"}`}>
        <span className="voice-avatar-emoji">{isUser ? <AudioOutlined /> : <RobotOutlined />}</span>
      </div>

      <Text type="secondary" className="voice-role-label">
        {isUser ? "你正在说" : "AI 正在说"}
      </Text>

      <div className="voice-text-area" aria-live="polite">
        <Text className="voice-text-content">
          {text || (isUser ? "开始说话..." : "等待回复...")}
        </Text>
      </div>

      <Button
        type="primary"
        size="large"
        shape="circle"
        icon={paused ? <PlayCircleOutlined style={{ fontSize: 28 }} /> : <PauseCircleOutlined style={{ fontSize: 28 }} />}
        onClick={handlePauseClick}
        className="voice-control-btn"
      />
      <Text type="secondary" style={{ marginTop: 8, fontSize: 13 }}>
        {paused ? "已暂停 — 点击继续" : "点击暂停"}
      </Text>

      {!paused && (
        <div className="voice-waves">
          <span className="wave-bar" />
          <span className="wave-bar" />
          <span className="wave-bar" />
          <span className="wave-bar" />
          <span className="wave-bar" />
        </div>
      )}
    </Flex>
  );
}

export default VoiceView;
