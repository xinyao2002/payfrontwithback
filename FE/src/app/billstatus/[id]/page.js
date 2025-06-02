'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Typography, Button, List, Avatar, Tag, message, Modal, Card } from 'antd';
import { ArrowLeftOutlined, WifiOutlined } from '@ant-design/icons';
import { baseURL } from '../../../config'; // Make sure the path is correct
import Image from 'next/image';
import './BillStatusPage.css'; // We will create this CSS file

const { Title, Text, Paragraph } = Typography;

const statusDetails = {
  pending: { color: 'orange', text: 'Pending', actionText: 'Waiting for responses...' },
  ready: { color: 'blue', text: 'Ready To Pay', actionText: 'Ready To Pay' },
  failed: { color: 'red', text: 'Failed', actionText: 'Transaction Failed.' },
  completed: { color: 'green', text: 'Completed', actionText: 'Completed!' },
};

export default function BillStatusPage() {
  const router = useRouter();
  const params = useParams();
  const billId = params.id;

  const [bill, setBill] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [virtualCard, setVirtualCard] = useState(null);
  const [nfcSupported, setNfcSupported] = useState(false);
  const socketRef = useRef(null);

  useEffect(() => {
    const fetchCurrentUser = async () => {
      try {
        const response = await fetch(`${baseURL}/accounts/check-auth/`, { credentials: 'include' });
        if (response.ok) {
          const data = await response.json();
          if (data.authenticated) {
            setCurrentUser(data.user);
          }
        }
      } catch (e) {
        console.warn('Could not fetch current user for BillStatusPage:', e);
      }
    };
    fetchCurrentUser();
  }, []);

  useEffect(() => {
    if (billId) {
      // Setup WebSocket connection
      const wsUrl = `${baseURL.replace('http', 'ws')}/ws/bill/${billId}/`;
      const socket = new WebSocket(wsUrl);
      socketRef.current = socket;

      socket.onopen = () => {
        console.log('WebSocket connected for bill status');
      };

      socket.onmessage = (e) => {
        try {
          const data = JSON.parse(e.data);
          console.log('Received bill update:', data);
          setBill(data);
          setLoading(false);
        } catch (err) {
          console.error('Error parsing WebSocket message:', err);
        }
      };

      socket.onerror = (error) => {
        console.error('WebSocket error:', error);
        setError('Failed to connect to real-time updates');
      };

      socket.onclose = () => {
        console.log('WebSocket disconnected');
      };

      // Cleanup function
      return () => {
        if (socket.readyState === WebSocket.OPEN) {
          socket.close();
        }
      };
    }
  }, [billId]);

  useEffect(() => {
    // Check if NFC is supported
    if ('NDEFReader' in window) {
      setNfcSupported(true);
    }
  }, []);

  const generateVirtualCard = () => {
    // Generate random card details
    const cardNumber = Array(4).fill(0).map(() => Math.floor(1000 + Math.random() * 9000)).join(' ');
    const expiryMonth = String(Math.floor(1 + Math.random() * 12)).padStart(2, '0');
    const expiryYear = String(new Date().getFullYear() + Math.floor(1 + Math.random() * 5)).slice(-2);
    const cvv = String(Math.floor(100 + Math.random() * 900));

    return {
      number: cardNumber,
      expiry: `${expiryMonth}/${expiryYear}`,
      cvv: cvv,
      type: 'Virtual Card'
    };
  };

  const handleReadyToPay = () => {
    const newVirtualCard = generateVirtualCard();
    setVirtualCard(newVirtualCard);
    setIsModalVisible(true);
  };

  const handleNFCShare = async () => {
    if (!virtualCard) return;

    try {
      const ndef = new window.NDEFReader();
      await ndef.write({
        records: [{
          recordType: "text",
          data: JSON.stringify({
            cardNumber: virtualCard.number,
            expiry: virtualCard.expiry,
            type: virtualCard.type
          })
        }]
      });
      message.success('Ready to share via NFC. Please touch your device to another NFC-enabled device.');
    } catch (error) {
      message.error('NFC sharing failed. Make sure NFC is enabled on your device.');
      console.error('NFC Error:', error);
    }
  };

  if (loading) {
    return (
      <div className="status-page-container">
        {/* --- Bottom Menu Bar --- */}
        <div className="bottom-nav">
          <div className="nav-item" onClick={() => router.push('/main')} style={{ cursor: 'pointer' }}>
            <Image src="/avatar/yuan-icon.svg" width={24} height={24} alt="main" />
          </div>
          <div className="divider" />
          <div className="nav-item" onClick={() => router.push('/profile')} style={{ cursor: 'pointer' }}>
            <Image src="/avatar/profile-icon.svg" width={24} height={24} alt="profile" />
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="status-page-container error-message">
        Error: {error}
        {/* --- Bottom Menu Bar --- */}
        <div className="bottom-nav">
          <div className="nav-item" onClick={() => router.push('/main')} style={{ cursor: 'pointer' }}>
            <Image src="/avatar/yuan-icon.svg" width={24} height={24} alt="main" />
          </div>
          <div className="divider" />
          <div className="nav-item" onClick={() => router.push('/profile')} style={{ cursor: 'pointer' }}>
            <Image src="/avatar/profile-icon.svg" width={24} height={24} alt="profile" />
          </div>
        </div>
      </div>
    );
  }

  if (!bill) {
    return (
      <div className="status-page-container">
        Bill not found.
        {/* --- Bottom Menu Bar --- */}
        <div className="bottom-nav">
          <div className="nav-item" onClick={() => router.push('/main')} style={{ cursor: 'pointer' }}>
            <Image src="/avatar/yuan-icon.svg" width={24} height={24} alt="main" />
          </div>
          <div className="divider" />
          <div className="nav-item" onClick={() => router.push('/profile')} style={{ cursor: 'pointer' }}>
            <Image src="/avatar/profile-icon.svg" width={24} height={24} alt="profile" />
          </div>
        </div>
      </div>
    );
  }

  const displayStatusKey = bill.status ? bill.status.toLowerCase() : 'pending';
  const currentStatusDetail = statusDetails[displayStatusKey] || statusDetails.pending;
  const totalAgreedAmount = bill.splits?.reduce((sum, split) => split.agree === true ? sum + parseFloat(split.amount) : sum, 0) || 0;

  return (
    <div className="status-page-container" style={{ paddingBottom: 80 }}>
      <div className="status-header">
        <Button icon={<ArrowLeftOutlined />} onClick={() => router.push('/main')} type="text">
          Bill Status
        </Button>
      </div>

      <div className="bill-summary-card">
        <Title level={4} style={{ textAlign: 'center', marginBottom: '8px' }}>{bill.name}</Title>
        <Tag color={currentStatusDetail.color} style={{ display: 'block', textAlign: 'center', marginBottom: '16px', fontSize: '0.9em' }}>
          {currentStatusDetail.text.toUpperCase()}
        </Tag>
        <Title level={2} style={{ textAlign: 'center', marginBottom: '20px' }}>
          ${totalAgreedAmount.toFixed(2)} / ${parseFloat(bill.total_amount).toFixed(2)}
        </Title>

        <List
          itemLayout="horizontal"
          dataSource={bill.splits || []}
          renderItem={(split) => {
            let splitStatusText = 'Waiting';
            let splitStatusColor = 'default';
            if (split.agree === true) {
              splitStatusText = 'Accepted';
              splitStatusColor = 'success';
            } else if (split.agree === false) {
              splitStatusText = 'Refused';
              splitStatusColor = 'error';
            } else if (split.agree === null) {
              splitStatusText = 'Waiting';
              splitStatusColor = 'processing';
            }
            return (
              <List.Item>
                <List.Item.Meta
                  avatar={<Avatar>{split.user?.charAt(0).toUpperCase()}</Avatar>}
                  title={<Text>{split.user}</Text>}
                  description={`Amount: $${parseFloat(split.amount).toFixed(2)}`}
                />
                <Tag color={splitStatusColor}>{splitStatusText}</Tag>
              </List.Item>
            );
          }}
        />
      </div>

      <div className="status-footer-action">
        {displayStatusKey === 'ready' ? (
          <Button 
            type="primary" 
            size="large" 
            block 
            onClick={handleReadyToPay}
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
              height: "auto"
            }}
          >
            {currentStatusDetail.actionText} 
          </Button>
        ) : (
          <Paragraph style={{ textAlign: 'center', fontSize: '1.1em', color: currentStatusDetail.color }}>
            {currentStatusDetail.actionText}
          </Paragraph>
        )}
      </div>

      <Modal
        title="Virtual Credit Card Generated"
        open={isModalVisible}
        onOk={() => setIsModalVisible(false)}
        onCancel={() => setIsModalVisible(false)}
        centered
        footer={[
          nfcSupported ? (
            <Button
              key="nfc"
              type="primary"
              icon={<WifiOutlined />}
              onClick={handleNFCShare}
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
                height: "auto",
                marginRight: 8
              }}
            >
              Share via NFC
            </Button>
          ) : null,
          <Button 
            key="ok" 
            type="primary" 
            onClick={() => setIsModalVisible(false)}
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
              height: "auto"
            }}
          >
            OK
          </Button>
        ]}
      >
        {virtualCard && (
          <div>
            <Card style={{ background: 'linear-gradient(135deg, #00466e 0%, #17547e 100%)', color: 'white', padding: '20px' }}>
              <div style={{ marginBottom: '20px' }}>
                <div style={{ fontSize: '24px', marginBottom: '20px' }}>{virtualCard.number}</div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ fontSize: '12px' }}>VALID THRU</div>
                    <div>{virtualCard.expiry}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '12px' }}>CVV</div>
                    <div>{virtualCard.cvv}</div>
                  </div>
                </div>
              </div>
              <div style={{ fontSize: '18px' }}>{virtualCard.type}</div>
            </Card>
            <div style={{ marginTop: '20px', textAlign: 'center' }}>
              <p>This is a virtual card generated for this transaction.</p>
              {nfcSupported && (
                <p style={{ color: '#666', fontSize: '12px', marginTop: '8px' }}>
                  You can share this card via NFC with compatible devices
                </p>
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* --- Bottom Menu Bar --- */}
      <div className="bottom-nav">
        <div className="nav-item" onClick={() => router.push('/main')} style={{ cursor: 'pointer' }}>
          <Image src="/avatar/yuan-icon.svg" width={24} height={24} alt="main" />
        </div>
        <div className="divider" />
        <div className="nav-item" onClick={() => router.push('/profile')} style={{ cursor: 'pointer' }}>
          <Image src="/avatar/profile-icon.svg" width={24} height={24} alt="profile" />
        </div>
      </div>
    </div>
  );
}
