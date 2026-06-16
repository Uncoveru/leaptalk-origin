import React from "react";
import {Card, Space, Typography} from "antd";

const {Text, Paragraph} = Typography;

export function MessageShow({messages}) {
  return (
    <Space direction="vertical" style={{width: "100%"}}>
      {messages.map((msg, idx) => (
        <Card
          key={idx}
          type="inner"
          style={{
            background: msg.role === "user" ? "#f6ffed" : "#e6f7ff",
            borderColor: msg.role === "user" ? "#b7eb8f" : "#91d5ff",
          }}
          title={<Text strong>{msg.role === "user" ? "用户" : "助手"}</Text>}
        >
          <Paragraph>{msg.content}</Paragraph>
          {msg.grammar_analysis && (
            <Paragraph type="secondary" style={{marginBottom: 0}}>
              <Text type="warning">语法分析：</Text>
              {msg.grammar_analysis}
            </Paragraph>
          )}
          {msg.pronunciation_analysis && (
            <Paragraph type="secondary" style={{marginBottom: 0}}>
              <Text type="warning">发音分析：</Text>
              {msg.pronunciation_analysis}
            </Paragraph>
          )}
        </Card>
      ))}
    </Space>
  );
}

export default MessageShow;
