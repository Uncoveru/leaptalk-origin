import React from "react";
import {Card, Typography} from "antd";

const {Title, Paragraph, Text} = Typography;

/**
 * 全局分析展示组件
 * @param {Object} summary
 * @param {string} summary.grammar_analysis - 语法分析
 * @param {string} summary.pronunciation_analysis - 发音分析
 * @param {string} summary.expression_analysis - 表达分析
 * @returns {Element}
 */
export function SummaryShow({summary}) {
  return (
    <Card
      title={
        <Title level={4} style={{margin: 0}}>
          全局分析报告
        </Title>
      }
      variant="borderless"
    >
      <Paragraph>
        <Text strong type="warning">
          语法分析：
        </Text>
        {summary.grammar_analysis || <Text type="secondary">无</Text>}
      </Paragraph>
      <Paragraph>
        <Text strong type="warning">
          发音分析：
        </Text>
        {summary.pronunciation_analysis || <Text type="secondary">无</Text>}
      </Paragraph>
      <Paragraph>
        <Text strong type="warning">
          表达分析：
        </Text>
        {summary.expression_analysis || <Text type="secondary">无</Text>}
      </Paragraph>
    </Card>
  );
}

export default SummaryShow;
