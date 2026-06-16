import React, { useEffect, useRef } from "react";
import { Flex, Typography } from "antd";
import { MessageOutlined } from "@ant-design/icons";
import "./ChatView.css";
import MessageCard from "@/components/Chat/MessageCard.jsx";

const { Text } = Typography;

export function ChatView({ messages }) {
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <Flex className="scrollable-content" vertical>
      {messages.length === 0 ? (
        <Flex
          vertical
          align="center"
          justify="center"
          style={{ flex: 1, color: "#bfbfbf", gap: 12 }}
        >
          <MessageOutlined style={{ fontSize: 48 }} />
          <Text type="secondary" style={{ fontSize: 15 }}>
            暂无消息，开始对话吧！
          </Text>
        </Flex>
      ) : (
        <>
          {messages.map((msg, index) => (
            <MessageCard
              key={index}
              message={msg.content}
              type={msg.role}
              analysis={msg.analysis}
            />
          ))}
          <div ref={bottomRef} />
        </>
      )}
    </Flex>
  );
}

export default ChatView;
