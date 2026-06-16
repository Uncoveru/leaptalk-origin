import React from "react";
import {Button, Flex} from "antd";

/**
 * 汇总信息面板
 * @param {Object} props
 * @param {function} props.onClose - 关闭回调
 * @param {function} props.onDownLoad - 下载回调
 */
export function SummaryInfoPanel({onClose, onDownLoad, downloading}) {
  return (
    <Flex justify="flex-end" gap="middle" style={{marginBottom: 16}}>
      <Button onClick={onDownLoad} type="primary" loading={downloading}>
        下载
      </Button>
      <Button onClick={onClose} disabled={downloading}>关闭</Button>
    </Flex>
  );
}
