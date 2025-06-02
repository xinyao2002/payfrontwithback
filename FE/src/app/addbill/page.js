"use client";
import React, { useState, useEffect } from "react";
import { Typography, Form, Input, Button, message, Space, Checkbox } from "antd";
import { baseURL } from "../../config.js";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Html5QrcodeScanner } from 'html5-qrcode';
import styles from './page.module.css';
import BottomNav from '../../components/BottomNav';

const { Title } = Typography;
const getCookie = (name) => {
  const match = document.cookie.match(new RegExp('(^|;\\s*)' + name + '=([^;]*)'));
  return match ? decodeURIComponent(match[2]) : null;
};
export default function AddBill() {
  const [form] = Form.useForm();
  const [participants, setParticipants] = useState([{ username: "", amount: "" }]);
  const [loading, setLoading] = useState(false);
  const [scanResult, setScanResult] = useState(null);
  const [scanningIndex, setScanningIndex] = useState(null);
  const [isEqually, setIsEqually] = useState(false);
  const [totalAmount, setTotalAmount] = useState(0);
  const [remainingAmount, setRemainingAmount] = useState(0);
  const router = useRouter();

  // Calculate remaining amount whenever participants or totalAmount changes
  useEffect(() => {
    const allocatedAmount = participants.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);
    const remaining = totalAmount - allocatedAmount;
    setRemainingAmount(remaining >= 0 ? remaining : 0);
  }, [participants, totalAmount]);

  useEffect(() => {
    const fetchCurrentUser = async () => {
      try {
        const response = await fetch(`${baseURL}/accounts/check-auth/`, {
          credentials: 'include',
          headers: {
            'Accept': 'application/json',
          }
        });

        if (!response.ok) {
          console.log('Not authenticated, redirecting to login...');
          router.push('/reg');
          return;
        }

        const data = await response.json();
        if (!data.authenticated) {
          console.log('Not authenticated, redirecting to login...');
          router.push('/reg');
          return;
        }

        console.log('Authenticated as:', data.user);
        setParticipants([{ username: data.user.username, amount: "" }]);
      } catch (error) {
        console.error('Auth check error:', error);
        router.push('/reg');
      }
    };

    fetchCurrentUser();
  }, [router]);

  // Handle equally split when total amount changes
  useEffect(() => {
    if (isEqually && totalAmount > 0) {
      const equalAmount = (totalAmount / participants.length).toFixed(2);
      const newParticipants = participants.map(p => ({
        ...p,
        amount: equalAmount
      }));
      setParticipants(newParticipants);
    }
  }, [isEqually, totalAmount, participants.length]);

  const handleTotalAmountChange = (value) => {
    const newTotal = parseFloat(value) || 0;
    setTotalAmount(newTotal);
    form.setFieldsValue({ TotalAmount: newTotal });
    
    if (isEqually && newTotal > 0) {
      const equalAmount = (newTotal / participants.length).toFixed(2);
      const newParticipants = participants.map(p => ({
        ...p,
        amount: equalAmount
      }));
      setParticipants(newParticipants);
    }
  };

  const handleEquallyChange = (checked) => {
    setIsEqually(checked);
    if (checked && totalAmount > 0) {
      const equalAmount = (totalAmount / participants.length).toFixed(2);
      const newParticipants = participants.map(p => ({
        ...p,
        amount: equalAmount
      }));
      setParticipants(newParticipants);
    }
  };

  useEffect(() => {
    if (scanningIndex !== null) {
      const scanner = new Html5QrcodeScanner(
        `reader-${scanningIndex}`,
        { fps: 10, qrbox: 250 },
        /* verbose= */ false
      );

      scanner.render(
        (decodedText, decodedResult) => {
          setScanResult(decodedText);
          setParticipants(prev => {
            const updated = [...prev];
            updated[scanningIndex].username = decodedText;
            return updated;
          });
          scanner.clear();
          setScanningIndex(null);
        },
        (errorMessage) => {
          // Handle scan error
        }
      );

      return () => {
        scanner.clear();
      };
    }
  }, [scanningIndex]);

  const startScanning = (index) => {
    setScanningIndex(index);
  };

  // Add participant
  const handleAddParticipant = () => {
    const newParticipant = { username: "", amount: isEqually ? (totalAmount / (participants.length + 1)).toFixed(2) : "" };
    setParticipants([...participants, newParticipant]);
  };

  // Remove participant
  const handleRemoveParticipant = (idx) => {
    const newParticipants = participants.filter((_, i) => i !== idx);
    setParticipants(newParticipants);
    if (isEqually && totalAmount > 0) {
      const equalAmount = (totalAmount / newParticipants.length).toFixed(2);
      const updatedParticipants = newParticipants.map(p => ({
        ...p,
        amount: equalAmount
      }));
      setParticipants(updatedParticipants);
    }
  };

  // Modify participant
  const handleParticipantChange = (idx, field, value) => {
    if (isEqually && field === 'amount') return;
    const newList = [...participants];
    newList[idx][field] = value;
    setParticipants(newList);
  };

  // Find user_id corresponding to username
  const fetchUserId = async (username) => {
    const res = await fetch(`${baseURL}/accounts/get-user-id/?username=${encodeURIComponent(username)}`);
    if (!res.ok) throw new Error("User not found: " + username);
    const data = await res.json();
    return data.user_id;
  };

  // Submit bill
  const handleSubmit = async () => {
    try {
      setLoading(true);
      const values = await form.validateFields();

      // Validate total amount
      if (!totalAmount || totalAmount <= 0) {
        message.error("Please enter a valid total amount");
        return;
      }

      // Validate participants
      const splits = [];
      for (const p of participants) {
        if (!p.username) {
          message.error("All participants must have a username");
          return;
        }
        const user_id = await fetchUserId(p.username.trim());
        splits.push({ user_id, amount: parseFloat(p.amount) });
      }

      const payload = {
        name: values.billName,
        total_amount: totalAmount,
        splits,
      };

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
    <div className={styles.container}>
      <div className={styles.header}>
        <Title level={2}>Send Bill</Title>
        <div className={styles.remaining}>remaining $ {remainingAmount.toFixed(2)}</div>
      </div>

      <Form form={form} layout="vertical" className={styles.form}>
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
          <Input 
            type="number" 
            min={0} 
            prefix="$" 
            placeholder="Total Amount" 
            onChange={(e) => handleTotalAmountChange(e.target.value)}
          />
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
              disabled={isEqually}
            />
            <Button 
              onClick={() => startScanning(idx)}
              style={{
                background: "#1248A0",
                color: "white",
                border: "none",
                borderRadius: 20,
                padding: "10px 20px",
                fontWeight: "bold",
                fontSize: 16,
                cursor: "pointer",
                boxShadow: "0px 2px 8px #dde3f7",
                height: "auto"
              }}
            >
              Scan QR
            </Button>
            {participants.length > 1 && (
              <Button danger onClick={() => handleRemoveParticipant(idx)}>
                Delete
              </Button>
            )}
          </Space>
        ))}
        <Button type="dashed" onClick={handleAddParticipant} style={{ width: "100%", marginBottom: 16 }}>
          + Add New Participant
        </Button>

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
          <Checkbox
            checked={isEqually}
            onChange={(e) => handleEquallyChange(e.target.checked)}
          >
            Split Equally
          </Checkbox>
        </div>

        <Form.Item>
          <Button
            type="primary"
            onClick={handleSubmit}
            loading={loading}
            style={{ 
              width: "100%",
              background: "#1248A0",
              color: "white",
              border: "none",
              borderRadius: 20,
              padding: "10px 30px",
              fontWeight: "bold",
              fontSize: 18,
              cursor: loading ? "not-allowed" : "pointer",
              boxShadow: "0px 2px 8px #dde3f7",
              height: "auto"
            }}
          >
            Process
          </Button>
        </Form.Item>
      </Form>

      {scanningIndex !== null && (
        <div id={`reader-${scanningIndex}`} className={styles.scanner}></div>
      )}

      <BottomNav />
    </div>
  );
}
