import React, { useCallback, useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Layout, Spin, Result, Button, Flex, Typography, message } from "antd";
import MessageShow from "@/components/Summary/MessageShow.jsx";
import SummaryShow from "@/components/Summary/SummaryShow.jsx";
import { SummaryInfoPanel } from "@/components/Summary/SummaryInfoPanel.jsx";
import { getChat } from "@/apis/chat.js";
import { analyzeSummarize, downloadReportDocx } from "@/apis/analyzer.js";
import "./Common.css";

const { Text } = Typography;

export function SummaryPage() {
  const location = useLocation();
  const navigate = useNavigate();

  const chatId = location.state?.chatId;
  const [messages, setMessages] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    async function fetchData() {
      if (!chatId) {
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const chatRes = await getChat(chatId);
        setMessages(chatRes.messages || []);
        const summaryRes = await analyzeSummarize(chatId);
        setSummary(summaryRes);
      } catch (e) {
        console.error("获取数据失败", e);
        setError(e.message || "获取数据失败");
      } finally {
        setLoading(false);
      }
    }

    void fetchData();
  }, [chatId]);

  const onDownLoad = useCallback(
    async function () {
      if (loading || !chatId) {
        message.warning("数据尚未加载完成，请稍后重试");
        return;
      }
      setDownloading(true);
      try {
        await downloadReportDocx(chatId);
        message.success("报告下载成功");
      } catch (error) {
        console.error("下载失败:", error);
        message.error("下载失败，请重试");
      } finally {
        setDownloading(false);
      }
    },
    [loading, chatId]
  );

  function onClose() {
    navigate("/");
  }

  return (
    <Layout className="layoutRoot">
      <Layout.Content className="contentBox">
        <SummaryInfoPanel onDownLoad={onDownLoad} onClose={onClose} downloading={downloading} />
        {!chatId ? (
          <Result
            status="warning"
            title="未找到会话信息"
            extra={
              <Button type="primary" onClick={onClose}>
                返回首页
              </Button>
            }
          />
        ) : loading ? (
          <Flex vertical align="center" justify="center" style={{ padding: 48 }}>
            <Spin size="large" />
            <Text type="secondary" style={{ marginTop: 16 }}>正在生成分析报告...</Text>
          </Flex>
        ) : error ? (
          <Result
            status="error"
            title="加载失败"
            subTitle={error}
            extra={
              <Button type="primary" onClick={onClose}>
                返回首页
              </Button>
            }
          />
        ) : (
          <>
            <SummaryShow summary={summary || {}} />
            <div style={{ height: 16 }} />
            <MessageShow messages={messages} />
          </>
        )}
      </Layout.Content>
    </Layout>
  );
}

export default SummaryPage;
