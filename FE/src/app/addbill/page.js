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

// Add this new function at the top level
const calculateEqualSplit = (total, numParticipants) => {
  // Calculate base amount per person (truncated to 2 decimal places)
  const baseAmount = Math.floor((total / numParticipants) * 100) / 100;
  
  // Calculate the remainder in cents
  const totalInCents = Math.round(total * 100);
  const baseAmountInCents = Math.floor(baseAmount * 100);
  const remainderCents = totalInCents - (baseAmountInCents * numParticipants);
  
  // Create the split amounts array
  const splits = new Array(numParticipants).fill(baseAmount.toFixed(2));
  
  // Distribute the remainder one cent at a time
  for (let i = 0; i < remainderCents; i++) {
    splits[i] = (baseAmount + 0.01).toFixed(2);
  }
  
  return splits;
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
          router.push('/reg');
          return;
        }

        const data = await response.json();
        if (!data.authenticated) {
          router.push('/reg');
          return;
        }

        setParticipants([{ username: data.user.username, amount: "" }]);
      } catch (error) {
        router.push('/reg');
      }
    };

    fetchCurrentUser();
  }, [router]);

  const handleTotalAmountChange = (value) => {
    const newTotal = parseFloat(value) || 0;
    setTotalAmount(newTotal);
    form.setFieldsValue({ TotalAmount: newTotal });
    
    if (isEqually && newTotal > 0) {
      const splitAmounts = calculateEqualSplit(newTotal, participants.length);
      setParticipants(prev => prev.map((p, index) => ({
        ...p,
        amount: splitAmounts[index]
      })));
    }
  };

  const handleEquallyChange = (checked) => {
    setIsEqually(checked);
    if (checked && totalAmount > 0) {
      const splitAmounts = calculateEqualSplit(totalAmount, participants.length);
      setParticipants(prev => prev.map((p, index) => ({
        ...p,
        amount: splitAmounts[index]
      })));
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
    if (isEqually && totalAmount > 0) {
      const newLength = participants.length + 1;
      const splitAmounts = calculateEqualSplit(totalAmount, newLength);
      setParticipants(prev => {
        const newParticipants = prev.map((p, index) => ({
          ...p,
          amount: splitAmounts[index]
        }));
        newParticipants.push({ username: "", amount: splitAmounts[newLength - 1] });
        return newParticipants;
      });
    } else {
      setParticipants(prev => [...prev, { username: "", amount: "" }]);
    }
  };

  // Remove participant
  const handleRemoveParticipant = (idx) => {
    setParticipants(prev => {
      const newParticipants = prev.filter((_, i) => i !== idx);
      if (isEqually && totalAmount > 0) {
        const splitAmounts = calculateEqualSplit(totalAmount, newParticipants.length);
        return newParticipants.map((p, index) => ({
          ...p,
          amount: splitAmounts[index]
        }));
      }
      return newParticipants;
    });
  };

  // Modify participant
  const handleParticipantChange = (idx, field, value) => {
    if (isEqually && field === 'amount') return;
    setParticipants(prev => {
      const newList = [...prev];
      newList[idx][field] = value;
      return newList;
    });
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

      // Validate that split amounts sum up to total
      const splitSum = splits.reduce((sum, split) => sum + parseFloat(split.amount), 0);
      if (Math.abs(splitSum - totalAmount) > 0.01) {
        message.error("Split amounts do not sum up to total amount");
        return;
      }

      const payload = {
        name: values.billName,
        total_amount: totalAmount,
        splits,
      };

      const csrfToken = getCookie('csrftoken');

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
