import React from "react";
import { Card, Typography, Skeleton } from "antd";

const { Title, Paragraph, Text } = Typography;

export function SummaryShow({ summary }) {
  const fields = [
    { key: "grammar_analysis", label: "语法分析" },
    { key: "pronunciation_analysis", label: "发音分析" },
    { key: "expression_analysis", label: "表达分析" },
  ];

  return (
    <Card
      title={<Title level={4} style={{ margin: 0 }}>全局分析报告</Title>}
      variant="borderless"
    >
      {fields.map(({ key, label }) => (
        <Paragraph key={key}>
          <Text strong type="warning">{label}：</Text>
          {summary[key] ? (
            summary[key]
          ) : (
            <Skeleton active paragraph={{ rows: 2 }} title={false} style={{ display: "inline-block", width: "80%", verticalAlign: "middle" }} />
          )}
        </Paragraph>
      ))}
    </Card>
  );
}

export default SummaryShow;
