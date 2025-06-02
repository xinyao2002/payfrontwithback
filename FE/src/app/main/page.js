'use client';
import React, { useEffect, useRef, useState } from 'react';
import { Typography, Button, Table, Modal, message, Tag } from 'antd';
import Image from 'next/image';
import './MainPage.css';
import { baseURL } from "../../config.js"; // Import baseURL
import { useRouter } from 'next/navigation';
import BottomNav from '../../components/BottomNav';

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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const seenSplits = useRef(new Set());

  // Fetch bill list
  const fetchBills = async () => {
    setLoading(true);
    setError(null);
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
      // Only set bills when all data is ready
      if (myUsername) {
        const billsData = data.map(bill => {
          const userSplit = bill.splits.find(split => split.user === myUsername);
          // Only return complete data when user's split is found
          if (userSplit) {
            return {
              key: bill.id,
              name: bill.name,
              time: new Date(bill.created_time).toLocaleDateString(),
              status: bill.status,
              totalAmount: bill.total_amount,
              amount: userSplit.amount,
              splits: bill.splits
            };
          }
          return null;
        }).filter(Boolean); // Filter out null values
        setBills(billsData);
        setLoading(false);
      }
    } catch (error) {
      console.error('Error fetching bills:', error);
      setError(error.message);
      message.error(`Failed to load bills: ${error.message}`);
      setLoading(false);
    }
  };

  // Optimize authentication and data fetching process
  useEffect(() => {
    let isSubscribed = true;
    
    const initializeData = async () => {
      try {
        // Make authentication and bill requests in parallel
        const [authResponse, billsResponse] = await Promise.all([
          fetch(`${baseURL}/accounts/check-auth/`, {
            credentials: 'include',
            headers: { 'Accept': 'application/json' }
          }),
          fetch(`${baseURL}/api/`, {
            credentials: 'include',
            headers: { 'Accept': 'application/json' }
          })
        ]);

        // Check authentication response
        if (!authResponse.ok) {
          console.log('Not authenticated, redirecting to login...');
          router.push('/reg');
          return;
        }

        const authData = await authResponse.json();
        if (!authData.authenticated) {
          console.log('Not authenticated, redirecting to login...');
          router.push('/reg');
          return;
        }

        // If component is unmounted, don't proceed
        if (!isSubscribed) return;

        // Set user information
        setMyId(authData.user.id);
        setMyUsername(authData.user.username);

        // Process bill data
        if (billsResponse.ok) {
          const billsData = await billsResponse.json();
          if (isSubscribed && authData.user.username) {
            const processedBills = billsData.map(bill => {
              const userSplit = bill.splits.find(split => split.user === authData.user.username);
              if (userSplit) {
                return {
                  key: bill.id,
                  name: bill.name,
                  time: new Date(bill.created_time).toLocaleDateString(),
                  status: bill.status,
                  totalAmount: bill.total_amount,
                  amount: userSplit.amount,
                  splits: bill.splits
                };
              }
              return null;
            }).filter(Boolean);
            setBills(processedBills);
          }
        }
      } catch (error) {
        console.error('Error initializing data:', error);
        if (isSubscribed) {
          setError(error.message);
          message.error(`Failed to load data: ${error.message}`);
        }
      } finally {
        if (isSubscribed) {
          setLoading(false);
        }
      }
    };

    initializeData();

    // Cleanup function
    return () => {
      isSubscribed = false;
    };
  }, [router]);

  // Optimize WebSocket connection
  useEffect(() => {
    if (!myId || !myUsername) return;

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
          if (!Array.isArray(data)) {
            // Single bill update, use map to update
            return prevBills.map(bill => {
              if (bill.key === data.id) {
                const userSplit = data.splits.find(split => split.user === myUsername);
                if (userSplit) {
                  return {
                    ...bill,
                    status: data.status,
                    name: data.name,
                    time: new Date(data.created_time).toLocaleDateString(),
                    totalAmount: data.total_amount,
                    amount: userSplit.amount,
                    splits: data.splits
                  };
                }
              }
              return bill;
            });
          }
          
          // Batch update, replace with new data
          return data
            .map(bill => {
              const userSplit = bill.splits.find(split => split.user === myUsername);
              if (userSplit) {
                return {
                  key: bill.id,
                  name: bill.name,
                  time: new Date(bill.created_time).toLocaleDateString(),
                  status: bill.status,
                  totalAmount: bill.total_amount,
                  amount: userSplit.amount,
                  splits: bill.splits
                };
              }
              return null;
            })
            .filter(Boolean);
        });

        // Optimize queue processing
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
          setPendingSplitsQueue(prev => [...prev, ...newQueue]);
          if (!isModalVisible) {
            setPendingSplit(newQueue[0]);
            setIsModalVisible(true);
          }
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

    return () => {
      if (socket.readyState === WebSocket.OPEN) {
        socket.close();
      }
    };
  }, [myId, myUsername]);

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

  // Optimize table configuration
  const columns = [
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
      render: (text, record) => (
        <a onClick={() => router.push(`/billstatus/${record.key}`)}>{text}</a>
      ),
    },
    {
      title: 'Time',
      dataIndex: 'time',
      key: 'time',
    },
    {
      title: 'Total Amount',
      dataIndex: 'totalAmount',
      key: 'totalAmount',
      render: (amount) => amount ? `$${parseFloat(amount).toFixed(2)}` : '-',
    },
    {
      title: 'Your Share',
      dataIndex: 'amount',
      key: 'amount',
      render: (amount) => amount ? `$${parseFloat(amount).toFixed(2)}` : '-',
    },
    {
      title: 'Status',
      key: 'status',
      render: (text, record) => {
        let displayStatus = record.status;
        let tagColor = 'default';

        switch (record.status?.toLowerCase()) {
          case 'pending':
            displayStatus = 'Pending';
            tagColor = 'gold';
            break;
          case 'completed':
            displayStatus = 'Completed';
            tagColor = 'green';
            break;
          case 'ready':
            displayStatus = 'Ready To Pay';
            tagColor = 'blue';
            break;
          case 'failed':
            displayStatus = 'Failed';
            tagColor = 'red';
            break;
          default:
            displayStatus = record.status ? record.status.charAt(0).toUpperCase() + record.status.slice(1) : 'Unknown';
        }
        return <Tag color={tagColor}>{displayStatus}</Tag>;
      },
    }
  ];

  if (loading) {
    return (
      <div className="main-page-container">
        <BottomNav />
      </div>
    );
  }

  if (error) {
    return (
      <div className="main-page-container">
        <div style={{ textAlign: 'center', marginTop: '20px' }}>
          Error: {error}
        </div>
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="main-page-container" style={{ 
      paddingBottom: 80,
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column'
    }}> 
      <div className="main-header" style={{ 
        textAlign: 'center',
        marginBottom: '20px',
        padding: '15px 0'
      }}>
        <Title level={2} style={{ margin: 0 }}>My Bills</Title>
      </div>
      
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {(!loading && !error) ? (
          <>
            <Table 
              columns={columns} 
              dataSource={bills} 
              rowKey="key"
              className="bills-table"
              style={{ marginBottom: '20px' }}
              pagination={{
                pageSize: 10,
                position: ['bottomCenter'],
                showSizeChanger: false,
                showQuickJumper: false,
                size: 'small'
              }}
            />

            <div style={{
              display: 'flex',
              justifyContent: 'center',
              marginBottom: '20px'
            }}>
              <Button
                type="primary"
                onClick={handleCreate}
                style={{
                  background: "#1248A0",
                  color: "white",
                  border: "none",
                  borderRadius: 20,
                  padding: "10px 40px",
                  fontWeight: "bold",
                  fontSize: 18,
                  cursor: "pointer",
                  boxShadow: "0px 2px 8px #dde3f7",
                  height: "auto",
                  width: "auto",
                  minWidth: "200px"
                }}
              >
                Create New Bill
              </Button>
            </div>
          </>
        ) : (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '200px' }}>
            Loading Bills...
          </div>
        )}
      </div>

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

      <BottomNav />
    </div>
  );
}
