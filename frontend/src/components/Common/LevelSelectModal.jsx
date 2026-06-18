import React from "react";
import { Modal, Radio, Space, Tag, Typography } from "antd";

const { Text } = Typography;

const LEVELS = [
  { cefr: "A1", cn: "入门级", en: "Beginner", exams: "小学英语 / 初一水平", color: "default" },
  { cefr: "A2", cn: "基础级", en: "Elementary", exams: "中考英语 / 初二初三水平", color: "cyan" },
  { cefr: "B1", cn: "进阶级", en: "Intermediate", exams: "高考英语 / CET-4", color: "blue" },
  { cefr: "B2", cn: "中高级", en: "Upper-Intermediate", exams: "CET-6 / 雅思 5.5-6.0", color: "geekblue" },
  { cefr: "C1", cn: "高级", en: "Advanced", exams: "雅思 6.5-7.5 / 托福 90-105", color: "purple" },
  { cefr: "C2", cn: "精通级", en: "Proficiency", exams: "雅思 8.0+ / 托福 110+", color: "magenta" },
];

export function LevelSelectModal({ open, onConfirm, onCancel, defaultLevel = "B1" }) {
  const [selected, setSelected] = React.useState(defaultLevel);

  React.useEffect(() => {
    if (open) setSelected(defaultLevel);
  }, [open, defaultLevel]);

  return (
    <Modal
      title="选择难度等级"
      open={open}
      onOk={() => onConfirm(selected)}
      onCancel={onCancel}
      okText="确认"
      cancelText="取消"
      width={480}
    >
      <Radio.Group
        value={selected}
        onChange={(e) => setSelected(e.target.value)}
        style={{ width: "100%" }}
      >
        <Space direction="vertical" style={{ width: "100%" }}>
          {LEVELS.map((l) => (
            <Radio
              key={l.cefr}
              value={l.cefr}
              style={{
                width: "100%",
                padding: "10px 12px",
                borderRadius: 8,
                border: selected === l.cefr ? "1px solid #1677ff" : "1px solid #f0f0f0",
                background: selected === l.cefr ? "#e6f4ff" : "#fff",
                transition: "all 0.15s",
              }}
            >
              <Space>
                <Tag color={l.color} style={{ minWidth: 32, textAlign: "center" }}>{l.cefr}</Tag>
                <Text strong>{l.cn}</Text>
                <Text type="secondary" style={{ fontSize: 12 }}>{l.en} · {l.exams}</Text>
              </Space>
            </Radio>
          ))}
        </Space>
      </Radio.Group>
    </Modal>
  );
}

export { LEVELS };
export default LevelSelectModal;
