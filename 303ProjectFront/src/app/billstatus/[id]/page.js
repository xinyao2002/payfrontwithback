'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Typography, Spin, Button, List, Avatar, Tag, message } from 'antd';
import { ArrowLeftOutlined } from '@ant-design/icons';
import { baseURL } from '../../../config'; // 确保路径正确
import Image from 'next/image';
import './BillStatusPage.css'; // 我们将创建这个 CSS 文件

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
      const fetchBillDetails = async () => {
        setLoading(true);
        setError(null);
        try {
          const response = await fetch(`${baseURL}/api/${billId}/`, {
            credentials: 'include',
            headers: { 'Accept': 'application/json' },
          });
          if (!response.ok) {
            if (response.status === 401) {
              router.push('/reg');
              return;
            }
            const errorData = await response.json().catch(() => ({ detail: 'Failed to load bill details.' }));
            throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
          }
          const data = await response.json();
          setBill(data);
        } catch (err) {
          setError(err.message);
          message.error(err.message);
        } finally {
          setLoading(false);
        }
      };
      fetchBillDetails();
    }
  }, [billId, router]);

  const handleReadyToPay = () => {
    message.info('"Ready To Pay" button clicked. Payment API call needs to be implemented.');
  };

  if (loading) {
    return (
      <div className="status-page-container">
        <Spin size="large" />
        {/* --- 底部菜单栏 --- */}
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
        {/* --- 底部菜单栏 --- */}
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
        {/* --- 底部菜单栏 --- */}
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
          <Button type="primary" size="large" block onClick={handleReadyToPay}>
            {currentStatusDetail.actionText} 
          </Button>
        ) : (
          <Paragraph style={{ textAlign: 'center', fontSize: '1.1em', color: currentStatusDetail.color }}>
            {currentStatusDetail.actionText}
          </Paragraph>
        )}
      </div>

      {/* --- 底部菜单栏 --- */}
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
