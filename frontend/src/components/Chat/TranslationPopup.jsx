import React, { useState, useEffect, useRef, useCallback } from "react";
import { Card, Spin, Typography } from "antd";
import { translateText } from "@/apis/analyzer.js";

const { Text } = Typography;

export function TranslationPopup() {
  const [popup, setPopup] = useState(null); // { x, y, word, data, loading }
  const popupRef = useRef(null);

  const handleMouseUp = useCallback(async (e) => {
    // ignore clicks inside the popup itself
    if (popupRef.current?.contains(e.target)) return;

    const selection = window.getSelection();
    const word = selection?.toString().trim();

    if (!word || word.length === 0) {
      setPopup(null);
      return;
    }

    const range = selection.getRangeAt(0);
    const rect = range.getBoundingClientRect();
    const x = rect.left + window.scrollX + rect.width / 2;
    const y = rect.top + window.scrollY - 8;

    setPopup({ x, y, word, data: null, loading: true });

    try {
      const data = await translateText(word);
      setPopup((prev) => prev?.word === word ? { ...prev, data, loading: false } : prev);
    } catch {
      setPopup((prev) => prev?.word === word ? { ...prev, loading: false } : prev);
    }
  }, []);

  const handleMouseDown = useCallback((e) => {
    if (popupRef.current?.contains(e.target)) return;
    setPopup(null);
  }, []);

  useEffect(() => {
    document.addEventListener("mouseup", handleMouseUp);
    document.addEventListener("mousedown", handleMouseDown);
    return () => {
      document.removeEventListener("mouseup", handleMouseUp);
      document.removeEventListener("mousedown", handleMouseDown);
    };
  }, [handleMouseUp, handleMouseDown]);

  if (!popup) return null;

  const style = {
    position: "fixed",
    left: popup.x,
    top: popup.y,
    transform: "translate(-50%, -100%)",
    zIndex: 9999,
    minWidth: 200,
    maxWidth: 300,
    boxShadow: "0 4px 16px rgba(0,0,0,0.18)",
    borderRadius: 10,
    padding: 0,
  };

  return (
    <Card ref={popupRef} style={style} bodyStyle={{ padding: "12px 14px" }}>
      {popup.loading ? (
        <div style={{ textAlign: "center", padding: "8px 0" }}>
          <Spin size="small" />
        </div>
      ) : popup.data ? (
        <div>
          <div style={{ marginBottom: 4 }}>
            <Text strong style={{ fontSize: 15 }}>{popup.word}</Text>
            {popup.data.phonetic && (
              <Text type="secondary" style={{ fontSize: 12, marginLeft: 6 }}>
                {popup.data.phonetic}
              </Text>
            )}
            {popup.data.pos && (
              <Text type="secondary" style={{ fontSize: 12, marginLeft: 4, fontStyle: "italic" }}>
                {popup.data.pos}
              </Text>
            )}
          </div>
          <Text style={{ fontSize: 14, color: "#1677ff" }}>{popup.data.translation}</Text>
          {popup.data.example && (
            <div style={{ marginTop: 6, borderTop: "1px solid #f0f0f0", paddingTop: 6 }}>
              <Text style={{ fontSize: 12, color: "#595959", display: "block" }}>
                {popup.data.example}
              </Text>
              <Text type="secondary" style={{ fontSize: 12 }}>
                {popup.data.example_cn}
              </Text>
            </div>
          )}
        </div>
      ) : (
        <Text type="secondary" style={{ fontSize: 13 }}>翻译失败，请重试</Text>
      )}
    </Card>
  );
}

export default TranslationPopup;
