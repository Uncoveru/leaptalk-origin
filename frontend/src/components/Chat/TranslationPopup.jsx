import React, { useState, useEffect, useRef, useCallback } from "react";
import { Card, Spin, Typography } from "antd";
import { translateText } from "@/apis/analyzer.js";

const { Text } = Typography;

export function TranslationPopup() {
  const [popup, setPopup] = useState(null); // { x, y, word, data, loading }
  const popupRef = useRef(null);
  const abortRef = useRef(false);

  const handleMouseUp = useCallback(async (e) => {
    if (popupRef.current?.contains(e.target)) return;

    const selection = window.getSelection();
    const word = selection?.toString().trim();

    if (!word || word.length === 0) {
      setPopup(null);
      return;
    }

    const range = selection.getRangeAt(0);
    const rect = range.getBoundingClientRect();

    let x = rect.left + rect.width / 2;
    let y = rect.top - 8;
    let showAbove = true;

    if (y < 60) {
      y = rect.bottom + 8;
      showAbove = false;
    }

    x = Math.max(8, Math.min(x, window.innerWidth - 8));

    abortRef.current = false;
    setPopup({ x, y, word, data: {}, loading: true, showAbove });

    try {
      await translateText(word, (partial) => {
        if (abortRef.current) return;
        setPopup((prev) =>
          prev?.word === word
            ? { ...prev, data: { ...prev.data, ...partial }, loading: false }
            : prev
        );
      });
    } catch {
      setPopup((prev) =>
        prev?.word === word ? { ...prev, loading: false } : prev
      );
    }
  }, []);

  const handleMouseDown = useCallback((e) => {
    if (popupRef.current?.contains(e.target)) return;
    abortRef.current = true;
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

  const { data, loading, word, x, y, showAbove } = popup;
  const hasAny = data && Object.keys(data).length > 0;

  const transform = showAbove ? "translate(-50%, -100%)" : "translate(-50%, 0)";

  const style = {
    position: "fixed",
    left: x,
    top: y,
    transform,
    zIndex: 9999,
    minWidth: 200,
    maxWidth: 300,
    boxShadow: "0 4px 16px rgba(0,0,0,0.18)",
    borderRadius: 10,
    padding: 0,
  };

  return (
    <Card ref={popupRef} style={style} styles={{ body: { padding: "12px 14px" } }}>
      {/* header: word + phonetic + pos always visible once card opens */}
      <div style={{ marginBottom: 4, display: "flex", alignItems: "baseline", gap: 4 }}>
        <Text strong style={{ fontSize: 15 }}>{word}</Text>
        {data?.phonetic && (
          <Text type="secondary" style={{ fontSize: 12 }}>{data.phonetic}</Text>
        )}
        {data?.pos && (
          <Text type="secondary" style={{ fontSize: 12, fontStyle: "italic" }}>{data.pos}</Text>
        )}
      </div>

      {/* translation */}
      {data?.translation ? (
        <Text style={{ fontSize: 14, color: "#1677ff" }}>{data.translation}</Text>
      ) : loading ? (
        <Spin size="small" />
      ) : (
        <Text type="secondary" style={{ fontSize: 13 }}>翻译失败，请重试</Text>
      )}

      {/* example — appears once streamed in */}
      {data?.example && (
        <div style={{ marginTop: 6, borderTop: "1px solid #f0f0f0", paddingTop: 6 }}>
          <Text style={{ fontSize: 12, color: "#595959", display: "block" }}>
            {data.example}
          </Text>
          {data?.example_cn && (
            <Text type="secondary" style={{ fontSize: 12 }}>{data.example_cn}</Text>
          )}
        </div>
      )}

      {/* spinner while example is still loading */}
      {!loading && hasAny && !data?.example && (
        <div style={{ marginTop: 6 }}>
          <Spin size="small" />
        </div>
      )}
    </Card>
  );
}

export default TranslationPopup;
