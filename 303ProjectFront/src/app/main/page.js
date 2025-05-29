'use client';
import React, { useEffect, useRef, useState } from 'react';
import { Typography, Button, Table, Modal } from 'antd';
import Image from 'next/image';
import './MainPage.css';
import { baseURL } from "../../config.js"; // Import baseURL
import { useRouter } from 'next/navigation';
import BillResponse from '../accept/page';

const { Title } = Typography;

export default function MainPage() {
  const router = useRouter();
  const socketRef = useRef(null);
  const [bills, setBills] = useState([]);
  const [popBill, setPopBill] = useState(null);
  const [myId, setMyId] = useState(null);

  // 检查登录状态
  useEffect(() => {
    const checkAuth = async () => {
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
        setMyId(data.user.id);
      } catch (error) {
        console.error('Auth check error:', error);
        router.push('/reg');
      }
    };
    
    checkAuth();
  }, []);

  // 获取账单列表
  const fetchBills = async () => {
    try {
      const response = await fetch(`${baseURL}/api/`, {
        credentials: 'include',
        headers: {
          'Accept': 'application/json',
        }
      });
      
      if (response.status === 401) {
        router.push('/reg');
        return;
      }
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      const billsData = data.map(bill => ({
        key: bill.id,
        name: bill.name,
        time: new Date(bill.created_time).toLocaleDateString(),
        status: bill.status,
        amount: bill.total_amount
      }));
      setBills(billsData);
      // 调试输出 key
      if (billsData && billsData.length > 0) {
        const keys = billsData.map(b => b.key);
        console.log("bills to render:", billsData);
        console.log("keys:", keys, "unique:", new Set(keys).size === keys.length);
      }
    } catch (error) {
      console.error('Error fetching bills:', error);
      if (error.message.includes('401')) {
        router.push('/reg');
      }
    }
  };

  // 建立WebSocket连接
  useEffect(() => {
    const wsUrl = `${baseURL.replace('http', 'ws')}/ws/bills/`;
    console.log('Connecting to WebSocket:', wsUrl);
    const socket = new WebSocket(wsUrl);
    socketRef.current = socket;

    socket.onopen = () => {
      console.log('WebSocket connected');
    };

    socket.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);
        console.log('WebSocket data:', data);
        if (Array.isArray(data)) {
          // 第一次连接收到账单列表
          data.forEach(bill => {
            if (myId && bill.splits) {
              const mySplit = bill.splits.find(s => s.user_id === myId && s.agree === null);
              if (mySplit) {
                setPopBill({
                  billId: bill.id,
                  billAmount: mySplit.amount,
                  senderName: bill.name // 或 bill.created_by
                });
              }
            }
          });
        } else {
          // 后续 bill_update 推送的是单个账单
          if (myId && data.splits) {
            const mySplit = data.splits.find(s => s.user_id === myId && s.agree === null);
            if (mySplit) {
              setPopBill({
                billId: data.id,
                billAmount: mySplit.amount,
                senderName: data.name // 或 data.created_by
              });
            }
          }
        }
        // ...原有 setBills 逻辑...
        setBills(prevBills => {
          if (Array.isArray(data)) {
            // 如果是账单列表，直接替换
            return data.map(bill => ({
              key: bill.id,
              name: bill.name,
              time: new Date(bill.created_time).toLocaleDateString(),
              status: bill.status,
              amount: bill.total_amount
            }));
          } else {
            // 单个账单更新
            const index = prevBills.findIndex(bill => bill.key === data.id);
            if (index !== -1) {
              const newBills = [...prevBills];
              newBills[index] = {
                ...newBills[index],
                status: data.status,
                name: data.name,
                time: new Date(data.created_time).toLocaleDateString(),
                amount: data.total_amount
              };
              return newBills;
            } else {
              return [
                ...prevBills,
                {
                  key: data.id,
                  name: data.name,
                  time: new Date(data.created_time).toLocaleDateString(),
                  status: data.status,
                  amount: data.total_amount
                }
              ];
            }
          }
        });
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    };

    socket.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    socket.onclose = () => {
      console.log('WebSocket disconnected');
    };

    // 初始加载账单列表
    fetchBills();

    return () => {
      if (socket.readyState === WebSocket.OPEN) {
        socket.close();
      }
    };
  }, [myId]);

  const handleCreate = () => {
    router.push('/addbill');
  };

  const columns = [
    { 
      title: 'Name', 
      dataIndex: 'name', 
      key: 'name',
      render: (text, record) => (
        <a onClick={() => {
          if (record.status === 'unpaid') {
            router.push(`/accept/${record.key}`);
          } else {
            router.push(`/billstatus/${record.key}`);
          }
        }}>{text}</a>
      )
    },
    { title: 'Time', dataIndex: 'time', key: 'time' },
    { title: 'Amount', dataIndex: 'amount', key: 'amount', render: (amount) => `$${amount}` },
    { 
      title: 'Status', 
      dataIndex: 'status', 
      key: 'status',
      render: (status) => {
        const statusColors = {
          'unpaid': '#faad14',
          'pending': '#1890ff',
          'completed': '#52c41a',
          'failed': '#ff4d4f'
        };
        const statusText = {
          'unpaid': 'Unpaid',
          'pending': 'Pending',
          'completed': 'Completed',
          'failed': 'Failed'
        };
        return (
          <span style={{ color: statusColors[status] }}>
            {statusText[status]}
          </span>
        );
      }
    },
  ];

  return (
    <div className="main-page">
      <Title level={3} className="welcome-title">
        Welcome to <span className="brand">PayPay</span> 🎉
      </Title>

      <Button type="primary" className="create-button" onClick={handleCreate}>
        + CREATE
      </Button>

      <div className="transaction-section">
        <h4>Transactions</h4>
        <Table
          dataSource={bills}
          columns={columns}
          rowKey="key"
          pagination={false}
          size="small"
          className="transaction-table"
        />
      </div>

      <div className="bottom-nav">
        <div className="nav-item">
          <Image src="/avatar/yuan-icon.svg" width={24} height={24} alt="home" />
        </div>
        <div className="divider" />
        <div className="nav-item">
          <Image src="/avatar/profile-icon.svg" width={24} height={24} alt="profile" />
        </div>
      </div>

      {/* 页面底部渲染弹窗 */}
      {popBill && (
        <Modal
          open={!!popBill}
          onCancel={() => setPopBill(null)}
          footer={null}
          closable={false}
          maskClosable={false}
          centered
        >
          <BillResponse
            billId={popBill.billId}
            billAmount={popBill.billAmount}
            senderName={popBill.senderName}
          />
        </Modal>
      )}
    </div>
  );
}
