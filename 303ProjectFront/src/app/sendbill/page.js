// components/SendBill.jsx
"use client";

import { useState, useEffect } from "react";
import {
  List,
  Input,
  InputNumber,
  Button,
  Avatar,
  Checkbox,
  Divider,
  Typography,
  Space,
} from "antd";
import { UserOutlined } from "@ant-design/icons";
import styles from "./page.module.css";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { baseURL } from "../../config.js"; // Uncomment if you need baseURL

const { Title, Text } = Typography;

export default function SendBill() {
  const total = 40;

  const [recipients, setRecipients] = useState([]);
  const [userIdInput, setUserIdInput] = useState("");
  const [amountInput, setAmountInput] = useState(null);
  const [equally, setEqually] = useState(false);
  const router = useRouter();

  // 计算已用和剩余
  const used = recipients.reduce((sum, r) => sum + r.amount, 0);
  const remaining = Math.max(0, parseFloat((total - used).toFixed(2)));

  // 如果切换到“均分”，重新分配所有人
  useEffect(() => {
    if (equally && recipients.length > 0) {
      const n = recipients.length;
      const base = parseFloat((total / n).toFixed(2));
      const newList = recipients.map((r, i) => {
        if (i === n - 1) {
          // 最后一位：补齐总额，避免累积误差
          const prevSum = base * (n - 1);
          return {
            ...r,
            amount: parseFloat((total - prevSum).toFixed(2)),
          };
        }
        return { ...r, amount: base };
      });
      setRecipients(newList);
    }
    // 注意：只在 equally 切换时触发
  }, [equally]);

  const handleAdd = () => {
    if (!userIdInput) return;

    if (equally) {
      // 均分模式：只加 id，amount 先填 0，useEffect 会重算
      setRecipients([...recipients, { id: userIdInput, amount: 0 }]);
    } else {
      // 普通模式：用 amountInput
      if (amountInput === null || amountInput <= 0) return;
      if (amountInput > remaining) {
        alert("Amount exceeds remaining balance");
        return;
      } // 防止剩余为负
      setRecipients([
        ...recipients,
        { id: userIdInput, amount: parseFloat(amountInput.toFixed(2)) },
      ]);
    }

    // 清空输入
    setUserIdInput("");
    setAmountInput(null);
  };

  const handleDelete = (index) => {
    setRecipients(recipients.filter((_, i) => i !== index));
  };

  const handelSendBill = () => {
    alert("Bill sent successfully!");
    // log the userId and amounts
    console.log("Recipients:", recipients);
  };

  return (
    <div className={styles.container}>
      {/* 顶部 */}
      <div className={styles.header}>
        <Title level={2}>Send Bill</Title>
        <Text className={styles.remaining}>remaining ${remaining}</Text>
      </div>
      <Divider className={styles.divider} />

      {/* 列表与输入行 */}
      <div className={styles.listWrapper}>
        <List
          dataSource={[{ isInputRow: true }, ...recipients]}
          renderItem={(item, idx) => {
            // 第一行：输入区域
            if (idx === 0 && item.isInputRow) {
              return (
                <List.Item className={styles.inputRow}>
                  <Space>
                    <Input
                      placeholder="userID"
                      value={userIdInput}
                      onChange={(e) => setUserIdInput(e.target.value)}
                      style={{ width: 120 }}
                    />
                    <InputNumber
                      placeholder="Input Money"
                      min={0}
                      value={amountInput === null ? undefined : amountInput}
                      onChange={(v) => setAmountInput(v)}
                      disabled={equally}
                      style={{ width: 120 }}
                      formatter={(v) => (v !== undefined ? `$ ${v}` : "")}
                      parser={(v) => v.replace(/\$\s?|(,*)/g, "")}
                    />
                    <Button
                      type="link"
                      onClick={handleAdd}
                      disabled={remaining === 0 || !userIdInput}
                    >
                      Add
                    </Button>
                  </Space>
                </List.Item>
              );
            }

            // 后续：已添加的收款人
            const recipient = recipients[idx - 1];
            return (
              <List.Item
                className={styles.recipientRow}
                actions={[
                  <Button
                    type="link"
                    size="small"
                    key="delete"
                    danger
                    onClick={() => handleDelete(idx - 1)}
                  >
                    Delete
                  </Button>,
                ]}
              >
                <List.Item.Meta
                  avatar={<Avatar icon={<UserOutlined />} />}
                  title={recipient.id}
                  description={`$${recipient.amount.toFixed(2)}/$${total}`}
                />
              </List.Item>
            );
          }}
        />
      </div>

      {/* 底部：均分复选框 */}
      <div className={styles.footer}>
        <Checkbox
          checked={equally}
          onChange={(e) => setEqually(e.target.checked)}
        >
          equally
        </Checkbox>
      </div>

      <div className={styles.submitButton}>
        <Button
          type="primary"
          onClick={handelSendBill}
          className={styles.sendBtn}
          shape="round"
          size="medium"
        >
          <Title level={2} className={styles.sendWord}>
            Process
          </Title>
        </Button>
      </div>

      <div className={styles.bottom_nav}>
        <div className={styles.nav_item}>
          <Image
            src="/avatar/yuan-icon.svg"
            width={24}
            height={24}
            alt="home"
            onClick={() => router.push("/main")}
          />
        </div>
        <div className={styles.divider} />
        <div className={styles.nav_item}>
          <Image
            src="/avatar/profile-icon.svg"
            width={24}
            height={24}
            alt="profile"
            onClick={() => router.push("/profile")}
          />
        </div>
      </div>
    </div>
  );
}
