'use client';
import React, { useEffect, useRef, useState } from 'react';
import { Typography, Button, Table, Modal, message, Spin, Tag } from 'antd';
import Image from 'next/image';
import './MainPage.css';
import { baseURL } from "../../config.js"; // Import baseURL
import { useRouter } from 'next/navigation';

const { Title } = Typography;

export default function MainPage() {
  const router = useRouter();
  const socketRef = useRef(null);
  const [bills, setBills] = useState([]);
  const [myId, setMyId] = useState(null);
  const [myUsername, setMyUsername] = useState(null);
  const [pendingSplit, setPendingSplit] = useState(null);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [pendingSplitsQueue, setPendingSplitsQueue] = useState([]);
  const [initialAuthCheckDone, setInitialAuthCheckDone] = useState(false);
  const [billsLoading, setBillsLoading] = useState(true);
  const seenSplits = useRef(new Set());

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
        setMyUsername(data.user.username);
      } catch (error) {
        console.error('Auth check error:', error);
        router.push('/reg');
      } finally {
        setInitialAuthCheckDone(true);
      }
    };
    
    checkAuth();
  }, [router]);

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
        amount: bill.total_amount,
        splits: bill.splits
      }));
      setBills(billsData);
    } catch (error) {
      console.error('Error fetching bills:', error);
      if (error.message.includes('401')) {
        router.push('/reg');
      }
    } finally {
      setBillsLoading(false);
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
        setBills(prevBills => {
          if (Array.isArray(data)) {
            return data.map(bill => ({
              key: bill.id,
              name: bill.name,
              time: new Date(bill.created_time).toLocaleDateString(),
              status: bill.status,
              amount: bill.total_amount
            }));
          } else {
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

        // Check for new pending splits and show modal if needed
        const newQueue = [];
        if (Array.isArray(data.splits)) {
          for (const split of data.splits) {
            const splitKey = `${data.id}-${split.user}`;
            if (
              split.user === myUsername &&
              split.agree === null &&
              !seenSplits.current.has(splitKey)
            ) {
              seenSplits.current.add(splitKey);
              newQueue.push({
                ...split,
                billId: data.id,
                billName: data.name,
              });
            }
          }
        }

        if (newQueue.length > 0) {
          setPendingSplitsQueue(newQueue);
          setPendingSplit(newQueue[0]);
          setIsModalVisible(true);
        }

      } catch (err) {
        console.error("WebSocket parse error:", err);
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

  useEffect(() => {
    const initiateModalSequenceIfNeeded = (currentBills, currentUsername) => {
      if (isModalVisible) return;

      const newQueue = [];

      for (const bill of currentBills) {
        if (Array.isArray(bill.splits)) {
          for (const split of bill.splits) {
            const splitKey = `${bill.key}-${split.user}`;
            if (
              split.user === currentUsername &&
              split.agree === null &&
              !seenSplits.current.has(splitKey)
            ) {
              seenSplits.current.add(splitKey);
              newQueue.push({
                ...split,
                billId: bill.key,
                billName: bill.name,
              });
            }
          }
        }
      }

      setPendingSplitsQueue(newQueue);

      if (newQueue.length > 0) {
        setPendingSplit(newQueue[0]);
        setIsModalVisible(true);
      }
    };

    initiateModalSequenceIfNeeded(bills, myUsername);
  }, [bills, myUsername, isModalVisible]);

  const handleCreate = () => {
    router.push('/addbill');
  };

  const handleModalAction = async (action) => {
    if (!pendingSplit) return;

    try {
      const url = action === 'accept' 
      ? `${baseURL}/api/accept_bill/${pendingSplit.billId}/`
      : `${baseURL}/api/reject_bill/${pendingSplit.billId}/`;

      const response = await fetch(url, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: action === 'accept' ? JSON.stringify({ amount: pendingSplit.amount }) : JSON.stringify({})
      });     

      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(`Action failed: ${response.status} - ${errorData}`);
      }
      message.success(`Split ${action}ed!`);
      
      fetchBills();

      const updatedQueue = pendingSplitsQueue.slice(1);
      setPendingSplitsQueue(updatedQueue);

      if (updatedQueue.length > 0) {
        setPendingSplit(updatedQueue[0]);
        setIsModalVisible(true);
      } else {
        setIsModalVisible(false);
        setPendingSplit(null);
      }

    } catch(error) {
      console.error('Failed to update split:', error);
      message.error(`Failed to update split: ${error.message}`);
    }
  };

  const handleModalCloseOrCancel = () => {
    const updatedQueue = pendingSplitsQueue.slice(1);
    setPendingSplitsQueue(updatedQueue);

    if (updatedQueue.length > 0) {
      setPendingSplit(updatedQueue[0]);
      setIsModalVisible(true);
    } else {
      setIsModalVisible(false);
      setPendingSplit(null);
    }
  };

  const columns = [
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
      render: (text, record) => <a onClick={() => router.push(`/billstatus/${record.key}`)}>{text}</a>,
    },
    {
      title: 'Time',
      dataIndex: 'time',
      key: 'time',
    },
    {
      title: 'Amount',
      dataIndex: 'amount',
      key: 'amount',
      render: (amount) => `$${parseFloat(amount).toFixed(2)}`,
    },
    {
      title: 'Status',
      key: 'status',
      render: (text, record) => {
        let displayStatus = record.status;
        let tagColor = 'default';

        const statusLowerCase = record.status ? record.status.toLowerCase() : '';
        if (statusLowerCase === 'pending') {
          displayStatus = 'Pending';
          tagColor = 'gold';
        }
        else if (statusLowerCase === 'completed') {
          displayStatus = 'Completed';
          tagColor = 'green';
        } else if (statusLowerCase === 'ready') {
          displayStatus = 'Ready To Pay';
          tagColor = 'blue';
        } else if (statusLowerCase === 'failed') {
          displayStatus = 'Failed';
          tagColor = 'red';
        } else {
          displayStatus = record.status ? record.status.charAt(0).toUpperCase() + record.status.slice(1) : 'Unknown';
        }
        return <Tag color={tagColor}>{displayStatus}</Tag>;
      },
    },
    {
      title: 'Action',
      key: 'action',
      render: (text, record) => (
        <Button onClick={() => router.push(`/billstatus/${record.key}`)}>
          View Details
        </Button>
      ),
    },
  ];

  if (!initialAuthCheckDone || billsLoading) {
    return (
      <div className="main-page-container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <Spin size="large" tip={!initialAuthCheckDone ? "Authenticating..." : "Loading Bills..."} />
      </div>
    );
  }

  return (
    <div className="main-page-container" style={{ paddingBottom: 64 }}> {/* 为底部导航留空间 */}
      <div className="header-container">
        <Title level={2} className="main-title">My Bills</Title>
        <Button type="primary" onClick={handleCreate} className="create-bill-button">
          Create New Bill
        </Button>
      </div>
      
      <Table 
        columns={columns} 
        dataSource={bills} 
        rowKey="key"
        className="bills-table" 
      />

      {pendingSplit && (
        <Modal
          title={`Bill Split: ${pendingSplit.billName}`}
          open={isModalVisible}
          onCancel={handleModalCloseOrCancel}
          footer={[
            <Button key="refuse" danger onClick={() => handleModalAction('refuse')}>
              Refuse
            </Button>,
            <Button key="accept" type="primary" onClick={() => handleModalAction('accept')}>
              Accept
            </Button>,
          ]}
        >
          <p>You have a pending bill split of <Typography.Text strong>${parseFloat(pendingSplit.amount).toFixed(2)}</Typography.Text> for the bill "{pendingSplit.billName}".</p>
          <p>Do you want to accept or refuse this split?</p>
        </Modal>
      )}

      {/* --- 底部菜单栏 --- */}
      <div className="bottom-nav">
        <div
          className="nav-item"
          onClick={() => router.push('/main')}
          style={{ cursor: 'pointer' }}
        >
          <Image src="/avatar/yuan-icon.svg" width={24} height={24} alt="main" />
        </div>
        <div className="divider" />
        <div
          className="nav-item"
          onClick={() => router.push('/profile')}
          style={{ cursor: 'pointer' }}
        >
          <Image src="/avatar/profile-icon.svg" width={24} height={24} alt="profile" />
        </div>
      </div>
    </div>
  );
}
