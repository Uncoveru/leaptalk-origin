import React, { useState } from "react";
import { Flex, Card, Button, Avatar, Typography, Space, Spin } from "antd";
import { DownOutlined, UpOutlined, UserOutlined, RobotOutlined } from "@ant-design/icons";
import "./MessageCard.css";

const { Text } = Typography;

export function MessageCard({ type, message, analysis }) {
  const [showAnalysis, setShowAnalysis] = useState(false);

  const hasAnalysis = analysis && (analysis.grammar || analysis.pronunciation);
  const analysisLoading = analysis && !analysis.grammar && !analysis.pronunciation;

  if (type === "user") {
    return (
      <Flex
        justify="flex-end"
        align="start"
        className="message-row"
      >
        <Flex vertical align="flex-end" style={{ maxWidth: "70%" }}>
          <Card className="user-message" bodyStyle={{ padding: "10px 14px" }}>
            <Text style={{ fontSize: 15 }}>{message}</Text>
          </Card>

          <Button
            type="text"
            icon={showAnalysis ? <DownOutlined /> : <UpOutlined />}
            onClick={() => setShowAnalysis(!showAnalysis)}
            className="analysis-button"
          >
            {analysisLoading ? "分析中..." : "分析"}
          </Button>

          {showAnalysis && (
            <Card className="analysis-panel" bodyStyle={{ padding: "12px 14px" }}>
              {analysisLoading ? (
                <div style={{ textAlign: "center", padding: 8 }}>
                  <Spin size="small" /> <Text type="secondary">分析中...</Text>
                </div>
              ) : hasAnalysis ? (
                <Space direction="vertical" size="small" style={{ width: "100%" }}>
                  {analysis.grammar && (
                    <div>
                      <Text strong style={{ color: "#fa8c16" }}>语法: </Text>
                      <Text style={{ fontSize: 13 }}>{analysis.grammar}</Text>
                    </div>
                  )}
                  {analysis.pronunciation?.pronAnalysis && (
                    <div>
                      <Text strong style={{ color: "#1677ff" }}>发音: </Text>
                      <Text style={{ fontSize: 13 }}>{analysis.pronunciation.pronAnalysis}</Text>
                    </div>
                  )}
                </Space>
              ) : (
                <Text type="secondary" style={{ fontSize: 13 }}>暂无分析结果</Text>
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
          <Card className="assistant-message" bodyStyle={{ padding: "10px 14px" }}>
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
