import React, { useState, useEffect } from "react";
import { getSituation, createDetailedSituation } from "../apis/situation";
import { useNavigate } from "react-router-dom";
import { Card, Button, Radio, Typography, message, Layout, Steps, Spin, Flex } from "antd";
import { ArrowLeftOutlined, CheckCircleOutlined } from "@ant-design/icons";
import { AppHeader } from "@/components/Common/AppHeader.jsx";
import "./Common.css";

const { Title, Paragraph, Text } = Typography;
const { Content } = Layout;

const ScenarioSelPage = () => {
  const [situations, setSituations] = useState([]);
  const [selectedIndex, setSelectedIndex] = useState(null);
  const [detailedSituation, setDetailedSituation] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    async function fetchSituations() {
      try {
        const data = await getSituation();
        setSituations(data);
      } catch (error) {
        message.error("获取场景列表失败！");
        console.error("Error fetching situations:", error);
      }
    }
    fetchSituations();
  }, []);

  const currentStep = detailedSituation ? 2 : selectedIndex !== null ? 1 : 0;

  const handleConfirmSelection = async () => {
    if (selectedIndex === null) {
      message.warning("请选择一个场景！");
      return;
    }
    setLoadingDetail(true);
    try {
      const data = await createDetailedSituation(selectedIndex);
      setDetailedSituation(data);
      message.success("场景加载成功！");
    } catch (error) {
      message.error("获取场景详情失败！");
      console.error("Error fetching detailed situation:", error);
    } finally {
      setLoadingDetail(false);
    }
  };

  const handleStartConversation = () => {
    if (!detailedSituation) {
      message.warning("请先选择场景并确认！");
      return;
    }
    const situation =
      detailedSituation.description +
      "；你扮演" +
      detailedSituation.roles.assistant +
      "；学生扮演" +
      detailedSituation.roles.user;
    navigate("/chat", {
      state: {
        userId: "c05d3d7f-28f8-4277-88cd-bea5ace34c7f",
        chatInfo: { mode: 2, situation: situation },
        first: detailedSituation.first,
      },
    });
  };

  const handleResetScene = () => {
    setSelectedIndex(null);
    setDetailedSituation(null);
  };

  return (
    <Layout className="layoutRoot">
      <AppHeader />
      <Content style={{ width: "100%", maxWidth: 800, padding: "0 24px" }}>
        <div className="contentBox" style={{ animation: "fadeInUp 0.4s ease-out" }}>
          <Flex align="center" gap="middle" style={{ marginBottom: 8 }}>
            <Button icon={<ArrowLeftOutlined />} onClick={() => navigate("/")} type="text">
              返回首页
            </Button>
            <Steps
              current={currentStep}
              size="small"
              style={{ flex: 1 }}
              items={[
                { title: "选择场景" },
                { title: "确认详情" },
                { title: "开始对话" },
              ]}
            />
          </Flex>

          {currentStep < 2 ? (
            <Card
              title={<Title level={4} style={{ margin: 0 }}>选择练习场景</Title>}
              bordered={false}
              style={{ borderRadius: 12, boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}
            >
              {situations.length === 0 ? (
                <Flex justify="center" style={{ padding: 24 }}>
                  <Spin tip="加载场景中..." />
                </Flex>
              ) : (
                <div style={{ padding: "8px 0" }}>
                  {situations.map((situation, index) => (
                    <div
                      key={index}
                      onClick={() => setSelectedIndex(index)}
                      style={{
                        padding: "14px 16px",
                        marginBottom: 8,
                        borderRadius: 10,
                        cursor: "pointer",
                        border: selectedIndex === index ? "2px solid #1677ff" : "1px solid #f0f0f0",
                        background: selectedIndex === index ? "#e6f4ff" : "#fff",
                        transition: "all 0.2s ease",
                      }}
                    >
                      <Radio checked={selectedIndex === index} style={{ fontSize: 15 }}>
                        <span style={{ fontWeight: 500 }}>{situation.name_zh}</span>
                        <span style={{ color: "#8c8c8c", marginLeft: 8 }}>
                          {situation.name_en}
                        </span>
                      </Radio>
                      <div style={{ fontSize: 13, color: "#8c8c8c", marginTop: 4, paddingLeft: 24 }}>
                        {situation.description}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <Flex justify="space-between" style={{ marginTop: 16 }}>
                <Button onClick={() => navigate("/")}>返回</Button>
                <Button type="primary" onClick={handleConfirmSelection} loading={loadingDetail}>
                  确认选择
                </Button>
              </Flex>
            </Card>
          ) : (
            <Card
              title={
                <Flex align="center" gap={8}>
                  <CheckCircleOutlined style={{ color: "#52c41a" }} />
                  <span>场景已确认</span>
                </Flex>
              }
              bordered={false}
              style={{ borderRadius: 12, boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}
            >
              <div
                style={{
                  padding: "20px 24px",
                  background: "#f6ffed",
                  borderRadius: 10,
                  border: "1px solid #b7eb8f",
                  marginBottom: 20,
                }}
              >
                <Paragraph style={{ fontSize: 16, color: "#333", marginBottom: 12 }}>
                  {detailedSituation.description}
                </Paragraph>
                <Flex gap={24} wrap="wrap">
                  <div>
                    <Text type="secondary">角色</Text>
                    <br />
                    <Text strong>你：</Text>
                    <Text>{detailedSituation.roles.user}</Text>
                    <Text style={{ margin: "0 8px" }}>|</Text>
                    <Text strong>助手：</Text>
                    <Text>{detailedSituation.roles.assistant}</Text>
                  </div>
                  <div>
                    <Text type="secondary">先说话</Text>
                    <br />
                    <Text strong>
                      {detailedSituation.first === "user" ? "你" : "助手"}
                    </Text>
                  </div>
                </Flex>
              </div>

              <Flex justify="space-between">
                <Button onClick={handleResetScene}>重新选择</Button>
                <Button type="primary" size="large" onClick={handleStartConversation}>
                  开始对话
                </Button>
              </Flex>
            </Card>
          )}
        </div>
      </Content>
    </Layout>
  );
};

export default ScenarioSelPage;