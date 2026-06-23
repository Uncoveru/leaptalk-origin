import React, { useState } from "react";
import { Flex, Card, Button, Avatar, Typography, Space, Spin } from "antd";
import { DownOutlined, UpOutlined, UserOutlined, RobotOutlined } from "@ant-design/icons";
import "./MessageCard.css";

const { Text } = Typography;

export function MessageCard({ type, message, analysis }) {
  const [showAnalysis, setShowAnalysis] = useState(false);

  const hasGrammar = analysis?.grammar_analysis;
  const hasPronunciation = analysis?.pronunciation_analysis;
  const analysisLoading = analysis && !hasGrammar && !hasPronunciation;

  let buttonLabel = "查看分析";
  if (analysisLoading) buttonLabel = "分析中...";
  else if (!analysis) buttonLabel = null;

  if (type === "user") {
    if (!message) return null;

    return (
      <Flex
        justify="flex-end"
        align="start"
        className="message-row"
      >
        <Flex vertical align="flex-end" style={{ width: "70%" }}>
          <Card className="user-message" styles={{ body: { padding: "10px 14px" } }}>
            <Text style={{ fontSize: 15 }}>{message}</Text>
          </Card>

          {buttonLabel && (
            <Button
              type="text"
              icon={showAnalysis ? <DownOutlined /> : <UpOutlined />}
              onClick={() => setShowAnalysis(!showAnalysis)}
              disabled={analysisLoading}
              className="analysis-button"
            >
              {buttonLabel}
            </Button>
          )}

          {showAnalysis && (
            <Card className="analysis-panel" styles={{ body: { padding: "12px 14px" } }}>
              {analysisLoading ? (
                <div style={{ textAlign: "center", padding: 8 }}>
                  <Spin size="small" /> <Text type="secondary">分析中...</Text>
                </div>
              ) : (
                <Space direction="vertical" size="small" style={{ width: "100%" }}>
                  <div>
                    <Text strong style={{ color: "#fa8c16" }}>语法: </Text>
                    {hasGrammar ? (
                      <Text style={{ fontSize: 13 }}>{analysis.grammar_analysis}</Text>
                    ) : (
                      <><Spin size="small" /> <Text type="secondary" style={{ fontSize: 13 }}>分析中...</Text></>
                    )}
                  </div>
                  <div>
                    <Text strong style={{ color: "#1677ff" }}>发音: </Text>
                    {hasPronunciation ? (
                      <Text style={{ fontSize: 13 }}>{analysis.pronunciation_analysis}</Text>
                    ) : (
                      <><Spin size="small" /> <Text type="secondary" style={{ fontSize: 13 }}>分析中...</Text></>
                    )}
                  </div>
                </Space>
              )}
            </Card>
          )}
        </Flex>
        <Avatar className="message-avatar" icon={<UserOutlined />} />
      </Flex>
    );
  }

  if (type === "assistant") {
    return (
      <Flex
        justify="flex-start"
        align="start"
        className="message-row"
      >
        <Avatar
          className="message-avatar"
          icon={<RobotOutlined />}
          style={{ backgroundColor: "#1677ff" }}
        />
        <Flex vertical align="flex-start" style={{ maxWidth: "70%" }}>
          <Card className="assistant-message" styles={{ body: { padding: "10px 14px" } }}>
            <Text style={{ fontSize: 15 }}>
              {message || <span className="typing-dots">...</span>}
            </Text>
          </Card>
        </Flex>
      </Flex>
    );
  }

  return null;
}

export default MessageCard;
