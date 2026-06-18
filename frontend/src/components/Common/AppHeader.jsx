import React from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Layout, Menu } from "antd";
import { CommentOutlined, HomeOutlined, FormOutlined } from "@ant-design/icons";
import "./AppHeader.css";

const { Header } = Layout;

export function AppHeader() {
  const navigate = useNavigate();
  const location = useLocation();

  const getSelectedKey = () => {
    if (location.pathname === "/") return "home";
    if (location.pathname.startsWith("/chat")) return "chat";
    if (location.pathname.startsWith("/scenario")) return "scenario";
    return "";
  };

  const menuItems = [
    { key: "home", icon: <HomeOutlined />, label: "首页", path: "/" },
    { key: "chat", icon: <CommentOutlined />, label: "自由对话", path: "/chat" },
    { key: "scenario", icon: <FormOutlined />, label: "情景对话", path: "/scenario" },
  ];

  const handleMenuClick = ({ key }) => {
    const item = menuItems.find((i) => i.key === key);
    if (!item) return;

    const targetPath = key === "chat" ? "/chat" : item.path;
    if (location.pathname === targetPath) return;

    if (key === "chat") {
      navigate("/chat", {
        state: {
          userId: "c05d3d7f-28f8-4277-88cd-bea5ace34c7f",
          chatInfo: { mode: 1, situation: "自由对话", level: "B1" },
        },
      });
    } else {
      navigate(item.path);
    }
  };

  return (
    <Header className="app-header">
      <div className="app-header-brand" onClick={() => navigate("/")}>
        <span className="app-header-logo">💬</span>
        <span className="app-header-title">语跃语伴</span>
      </div>
      <Menu
        mode="horizontal"
        selectedKeys={[getSelectedKey()]}
        items={menuItems}
        onClick={handleMenuClick}
        className="app-header-menu"
      />
      <div className="app-header-spacer" />
    </Header>
  );
}

export default AppHeader;
