'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Typography, Spin, Button, List, Avatar, Tag, message } from 'antd';
import { ArrowLeftOutlined } from '@ant-design/icons';
import { baseURL } from '../../../config'; // 确保路径正确
import './BillStatusPage.css'; // 我们将创建这个 CSS 文件

const { Title, Text, Paragraph } = Typography;

// 定义状态及其对应的颜色和文本
const statusDetails = {
  pending: { color: 'orange', text: 'Pending', actionText: 'Waiting for responses...' },
  ready: { color: 'blue', text: 'Ready To Pay', actionText: 'Ready To Pay' }, // 更新为 'ready'
  failed: { color: 'red', text: 'Failed', actionText: 'Transaction Failed.' }, // 更新 actionText
  completed: { color: 'green', text: 'Completed', actionText: 'Completed!' },
  // 'unpaid' 状态在详情页不再直接使用，因为它是由主页逻辑根据当前用户是否同意来临时决定的
};

export default function BillStatusPage() {
  const router = useRouter();
  const params = useParams();
  const billId = params.id;

  const [bill, setBill] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentUser, setCurrentUser] = useState(null); // 存储当前用户信息

  // 获取当前登录用户的信息 (可选，但有助于判断某些UI逻辑)
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
              router.push('/reg'); // 未授权，跳转到登录
              return;
            }
            const errorData = await response.json().catch(() => ({ detail: 'Failed to load bill details.' }));
            throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
          }
          const data = await response.json();
          console.log('Fetched bill details:', data);
          setBill(data);
        } catch (err) {
          console.error('Error fetching bill details:', err);
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
    // TODO: 实现调用后端支付API的逻辑
    // 例如: POST /api/bill/{billId}/pay/
    message.info('"Ready To Pay" button clicked. Payment API call needs to be implemented.');
    // 成功后可能需要重新获取账单状态或导航到支付成功/处理中页面
  };

  if (loading) {
    return <div className="status-page-container"><Spin size="large" /></div>;
  }

  if (error) {
    return <div className="status-page-container error-message">Error: {error}</div>;
  }

  if (!bill) {
    return <div className="status-page-container">Bill not found.</div>;
  }

  // 直接使用后端提供的 bill.status 作为 displayStatusKey
  // 后端应该在 BillSplit 被接受/拒绝时，相应地更新 Bill 对象的 status 字段
  const displayStatusKey = bill.status ? bill.status.toLowerCase() : 'pending'; // 默认为 'pending' 如果 status 不存在

  const currentStatusDetail = statusDetails[displayStatusKey] || statusDetails.pending;
  
  // totalAgreedAmount 的计算逻辑可以保持不变，用于显示当前已同意的总额
  const totalAgreedAmount = bill.splits?.reduce((sum, split) => split.agree === true ? sum + parseFloat(split.amount) : sum, 0) || 0;

  return (
    <div className="status-page-container">
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
            // 根据 split.agree 来决定每个参与者的状态
            if (split.agree === true) {
              splitStatusText = 'Accepted';
              splitStatusColor = 'success';
            } else if (split.agree === false) {
              splitStatusText = 'Refused';
              splitStatusColor = 'error';
            } else if (split.agree === null) {
              splitStatusText = 'Waiting'; // 明确 'pending' 状态下的 'Waiting'
              splitStatusColor = 'processing';
            }
            // 如果需要显示 paid 状态 (虽然你说可以忽略completed)
            // if (split.paid) { splitStatusText = 'Paid'; splitStatusColor = 'success'; }

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
        {/* "Ready To Pay" 按钮仅在 bill.status 为 'ready' 时显示 */}
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
    </div>
  );
} 