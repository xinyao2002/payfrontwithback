"use client";
import React, { useState } from "react";
import { Typography, Form, Input, Button, message, Space } from "antd";
import { baseURL } from "../../config.js";
import { useRouter } from "next/navigation";

const { Title } = Typography;
const getCookie = (name) => {
  const match = document.cookie.match(new RegExp('(^|;\\s*)' + name + '=([^;]*)'));
  return match ? decodeURIComponent(match[2]) : null;
};
export default function AddBill() {
  const [form] = Form.useForm();
  const [participants, setParticipants] = useState([{ username: "", amount: "" }]);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  // 添加参与人
  const handleAddParticipant = () => {
    setParticipants([...participants, { username: "", amount: "" }]);
  };

  // 删除参与人
  const handleRemoveParticipant = (idx) => {
    setParticipants(participants.filter((_, i) => i !== idx));
  };

  // 修改参与人
  const handleParticipantChange = (idx, field, value) => {
    const newList = [...participants];
    newList[idx][field] = value;
    setParticipants(newList);
  };

  // 查找用户名对应的 user_id
  const fetchUserId = async (username) => {
    const res = await fetch(`${baseURL}/accounts/get-user-id/?username=${encodeURIComponent(username)}`);
    if (!res.ok) throw new Error("User not found: " + username);
    const data = await res.json();
    return data.user_id;
  };

  // 提交账单
  const handleSubmit = async () => {
    try {
      setLoading(true);
      const values = await form.validateFields();
      // 查找所有 user_id
      const splits = [];
      for (const p of participants) {
        if (!p.username || !p.amount) throw new Error("All participants must have username and amount");
        const user_id = await fetchUserId(p.username.trim());
        splits.push({ user_id, amount: parseFloat(p.amount) });
      }
      // 组装 payload
      const payload = {
        name: values.billName,
        total_amount: parseFloat(values.TotalAmount),
        splits,
      };
      // 提交到后端
      // const res = await fetch(`${baseURL}/api/create/`, {
      //   method: "POST",
      //   headers: { "Content-Type": "application/json" },
      //   credentials: "include",
      //   body: JSON.stringify(payload),
      // });
      const csrfToken = getCookie('csrftoken');
      console.log('csrftoken =', csrfToken); 

      const res = await fetch(`${baseURL}/api/create/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-CSRFToken": csrfToken
        },
        credentials: "include",
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Create bill failed");
      }
      message.success("Bill created!");
      router.push("/main");
    } catch (err) {
      message.error(err.message || "Error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 500, margin: "0 auto" }}>
      <Title level={2}>Add a New Bill</Title>
      <Form form={form} layout="vertical">
        <Form.Item
          name="billName"
          label="Bill Name"
          rules={[{ required: true, message: "Please input the bill name!" }]}
        >
          <Input placeholder="Bill Name" />
        </Form.Item>
        <Form.Item
          name="TotalAmount"
          label="Total Amount"
          rules={[{ required: true, message: "Please input the total amount!" }]}
        >
          <Input type="number" min={0} prefix="$" placeholder="Total Amount" />
        </Form.Item>
        <Title level={4}>Participants</Title>
        {participants.map((p, idx) => (
          <Space key={idx} style={{ display: "flex", marginBottom: 8 }}>
            <Input
              placeholder="Username"
              value={p.username}
              onChange={e => handleParticipantChange(idx, "username", e.target.value)}
              style={{ width: 120 }}
            />
            <Input
              placeholder="Amount"
              type="number"
              min={0}
              value={p.amount}
              onChange={e => handleParticipantChange(idx, "amount", e.target.value)}
              style={{ width: 100 }}
            />
            {participants.length > 1 && (
              <Button danger onClick={() => handleRemoveParticipant(idx)}>
                Delete
              </Button>
            )}
          </Space>
        ))}
        <Button type="dashed" onClick={handleAddParticipant} style={{ width: "100%", marginBottom: 16 }}>
          + Add Participant
        </Button>
        <Form.Item>
          <Button
            type="primary"
            onClick={handleSubmit}
            loading={loading}
            style={{ width: "100%" }}
            size="large"
          >
            Process
          </Button>
        </Form.Item>
      </Form>
    </div>
  );
}