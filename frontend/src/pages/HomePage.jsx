import React from "react";
import { useNavigate } from "react-router-dom";
import { Card, Layout, Row, Col, Typography } from "antd";
import { CommentOutlined, FormOutlined, SoundOutlined, BarChartOutlined } from "@ant-design/icons";
import { AppHeader } from "@/components/Common/AppHeader.jsx";
import "./Common.css";

const { Content } = Layout;
const { Title, Paragraph, Text } = Typography;

const features = [
  {
    key: "free",
    icon: <CommentOutlined style={{ fontSize: 40, color: "#1677ff" }} />,
    title: "自由对话",
    desc: "与 AI 助教进行自然的英语口语对话，提升日常表达能力",
    action: "开始对话",
    onClick: (navigate) =>
      navigate("/chat", {
        state: {
          userId: "c05d3d7f-28f8-4277-88cd-bea5ace34c7f",
          chatInfo: { mode: 1, situation: "自由对话" },
        },
      }),
  },
  {
    key: "scenario",
    icon: <FormOutlined style={{ fontSize: 40, color: "#52c41a" }} />,
    title: "情景对话",
    desc: "在校园、餐厅、面试等真实场景中练习，应对实际交流需求",
    action: "选择场景",
    onClick: (navigate) => navigate("/scenario"),
  },
];

export default function HomePage() {
  const navigate = useNavigate();

  return (
    <Layout className="layoutRoot">
      <AppHeader />
      <Content style={{ width: "100%", maxWidth: 900, padding: "0 32px" }}>
        <div style={{ textAlign: "center", marginBottom: 48, marginTop: 24 }}>
          <Title level={1} style={{ marginBottom: 8, fontSize: 36 }}>
            <span style={{ color: "#1677ff" }}>语跃语伴</span>
          </Title>
          <Text type="secondary" style={{ fontSize: 16 }}>
            AI 驱动的英语口语陪练与评测平台
          </Text>
        </div>

        <Row gutter={[24, 24]} justify="center">
          {features.map((f) => (
            <Col key={f.key} xs={24} sm={12}>
              <Card
                hoverable
                style={{ height: "100%", borderRadius: 12, textAlign: "center" }}
                bodyStyle={{ padding: "32px 24px" }}
                onClick={() => f.onClick(navigate)}
              >
                <div style={{ marginBottom: 16 }}>{f.icon}</div>
                <Title level={3} style={{ marginBottom: 8 }}>
                  {f.title}
                </Title>
                <Paragraph type="secondary" style={{ marginBottom: 20, minHeight: 44 }}>
                  {f.desc}
                </Paragraph>
                <div style={{ color: "#1677ff", fontWeight: 600, fontSize: 14 }}>
                  {f.action} →
                </div>
              </Card>
            </Col>
          ))}
        </Row>

        <div
          style={{
            textAlign: "center",
            marginTop: 48,
            padding: "24px 32px",
            background: "linear-gradient(135deg, #e6f4ff 0%, #f0f5ff 100%)",
            borderRadius: 12,
          }}
        >
          <Row gutter={[24, 16]} justify="center">
            <Col span={8}>
              <SoundOutlined style={{ fontSize: 24, color: "#1677ff", marginBottom: 8 }} />
              <div>
                <Text strong>语音交互</Text>
                <br />
                <Text type="secondary">实时录音转写 + AI 语音回复</Text>
              </div>
            </Col>
            <Col span={8}>
              <BarChartOutlined style={{ fontSize: 24, color: "#52c41a", marginBottom: 8 }} />
              <div>
                <Text strong>智能评测</Text>
                <br />
                <Text type="secondary">语法 + 发音 + 表达三维分析</Text>
              </div>
            </Col>
            <Col span={8}>
              <FormOutlined style={{ fontSize: 24, color: "#fa8c16", marginBottom: 8 }} />
              <div>
                <Text strong>报告导出</Text>
                <br />
                <Text type="secondary">一键生成 Word 分析报告</Text>
              </div>
            </Col>
          </Row>
        </div>
      </Content>
    </Layout>
  );
}
