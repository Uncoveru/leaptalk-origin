import React from "react";
import { Button, Flex, Space, Tag, Tooltip } from "antd";
import { ArrowLeftOutlined, SwapOutlined, FileTextOutlined } from "@ant-design/icons";

export function ChatInfoPanel({ chatInfo, onClose, onSummarize, view, onSetView }) {
  const situationText = chatInfo?.situation || "对话";
  const level = chatInfo?.level || "B1";

  return (
    <Flex
      justify="space-between"
      align="center"
      wrap="wrap"
      gap={4}
      style={{
        width: "100%",
        padding: "8px 0",
        borderBottom: "1px solid #f0f0f0",
        marginBottom: 8,
      }}
    >
      <Space size="middle" style={{ minWidth: 0, flex: 1 }}>
        <Button icon={<ArrowLeftOutlined />} onClick={onClose} type="text" style={{ flexShrink: 0 }}>
          返回
        </Button>
        <Tag color="green" style={{ fontSize: 12, padding: "2px 8px" }}>{level}</Tag>
        <Tooltip title={situationText}>
          <Tag
            color="blue"
            style={{
              fontSize: 13,
              padding: "2px 12px",
              maxWidth: 360,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {situationText}
          </Tag>
        </Tooltip>
      </Space>
      <Space style={{ flexShrink: 0 }}>
        <Button icon={<SwapOutlined />} onClick={onSetView}>
          {view === "chat" ? "切换至语音" : "切换至对话"}
        </Button>
        <Button type="primary" icon={<FileTextOutlined />} onClick={onSummarize}>
          结束对话，获取总结
        </Button>
      </Space>
    </Flex>
  );
}

export default ChatInfoPanel;
