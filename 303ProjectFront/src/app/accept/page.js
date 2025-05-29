"use client";
import React, { useEffect, useRef, useState } from "react";
import { baseURL } from "../../config.js";

// 传入 billId，billAmount, senderName 作为props
export default function BillResponse({
  billId = 123,
  billAmount = 5.12,
  senderName = "Raymond",
}) {
  const socketRef = useRef(null);
  const [inputAmount, setInputAmount] = useState(billAmount);
  const [isDisabled, setIsDisabled] = useState(true);
  const [statusMsg, setStatusMsg] = useState("");

  useEffect(() => {
    const wsUrl = `${baseURL.replace('http', 'ws')}/ws/bill/${billId}/`;
    const socket = new WebSocket(wsUrl);
    socketRef.current = socket;

    socket.onopen = () => {
      setStatusMsg("Connected!");
    };

    socket.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);
        // 根据后端返回的状态更新UI
        if (data.status === 'accepted') {
          setStatusMsg("Bill accepted!");
        } else if (data.status === 'rejected') {
          setStatusMsg("Bill rejected!");
        } else if (data.status === 'updated') {
          setStatusMsg(`Amount updated to $${data.amount}`);
        }
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    };

    socket.onerror = (error) => {
      console.error('WebSocket error:', error);
      setStatusMsg("Connection error!");
    };

    socket.onclose = () => {
      setStatusMsg("Disconnected.");
    };

    return () => {
      if (socket.readyState === WebSocket.OPEN) {
        socket.close();
      }
    };
  }, [billId]);

  // "接受"
  const handleAccept = () => {
    socketRef.current.send(JSON.stringify({ type: "accept" }));
    setStatusMsg("Accepted!");
  };

  // "拒绝"
  const handleReject = () => {
    socketRef.current.send(JSON.stringify({ type: "reject" }));
    setStatusMsg("Rejected!");
  };

  // 修改金额
  const handleSend = () => {
    socketRef.current.send(JSON.stringify({ type: "update_amount", amount: inputAmount }));
    setStatusMsg(`Amount updated to $${inputAmount}`);
  };

  // 输入框逻辑（可选禁用，只允许正数金额，且和原金额不同才可发送）
  const onAmountChange = (e) => {
    const val = parseFloat(e.target.value);
    setInputAmount(isNaN(val) ? "" : val);
    setIsDisabled(val === billAmount || val <= 0 || isNaN(val));
  };

  return (
    <div style={{
      background: "white",
      borderRadius: 24,
      width: 320,
      minHeight: 520,
      margin: "40px auto",
      padding: 32,
      boxShadow: "0px 4px 16px rgba(0,0,0,0.08)",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      fontFamily: "Roboto, sans-serif",
    }}>
      <div style={{ marginTop: 40, marginBottom: 20, fontSize: 22, textAlign: "center" }}>
        {senderName} Send You a Bill:
      </div>
      <div style={{ fontSize: 40, fontWeight: 600, margin: "8px 0 20px 0" }}>
        ${billAmount}
      </div>
      <div style={{ display: "flex", gap: 28, marginBottom: 24 }}>
        <button
          style={{
            background: "#1248A0",
            color: "white",
            border: "none",
            borderRadius: 20,
            padding: "10px 30px",
            fontWeight: "bold",
            fontSize: 18,
            cursor: "pointer",
            boxShadow: "0px 2px 8px #dde3f7",
          }}
          onClick={handleReject}
        >
          Refuse
        </button>
        <button
          style={{
            background: "#1248A0",
            color: "white",
            border: "none",
            borderRadius: 20,
            padding: "10px 30px",
            fontWeight: "bold",
            fontSize: 18,
            cursor: "pointer",
            boxShadow: "0px 2px 8px #dde3f7",
          }}
          onClick={handleAccept}
        >
          Accept
        </button>
      </div>

      <div style={{
        width: "100%",
        display: "flex",
        alignItems: "center",
        margin: "18px 0 4px 0",
      }}>
        <div style={{ flex: 1, height: 1, background: "#ccc" }}></div>
        <div style={{ margin: "0 8px", color: "#888" }}>or</div>
        <div style={{ flex: 1, height: 1, background: "#ccc" }}></div>
      </div>
      <div style={{ fontSize: 16, margin: "10px 0" }}>Choose Your Bill:</div>
      <input
        type="number"
        step="0.01"
        min="0"
        value={inputAmount}
        onChange={onAmountChange}
        style={{
          width: 150,
          height: 34,
          border: "1px solid #e1e1e1",
          borderRadius: 16,
          padding: "0 16px",
          fontSize: 16,
          color: "#999",
          background: "#f8f8f8",
          marginBottom: 10,
          outline: "none"
        }}
        placeholder={`$ ${billAmount}`}
      />
      <button
        style={{
          background: "#1248A0",
          color: "white",
          border: "none",
          borderRadius: 20,
          padding: "10px 50px",
          fontWeight: "bold",
          fontSize: 18,
          cursor: isDisabled ? "not-allowed" : "pointer",
          opacity: isDisabled ? 0.5 : 1,
          marginTop: 10,
          marginBottom: 18,
          boxShadow: "0px 2px 8px #dde3f7",
        }}
        onClick={handleSend}
        disabled={isDisabled}
      >
        Send
      </button>
      <div style={{ marginTop: 10, color: "#12b31e", minHeight: 24, fontSize: 15 }}>{statusMsg}</div>
    </div>
  );
}
