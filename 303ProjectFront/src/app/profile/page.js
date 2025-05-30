'use client';
import React, { useEffect, useState } from 'react';
import { Typography, Button, Spin } from 'antd';
import Image from 'next/image';
import QRCode from 'react-qr-code';
import './profile.css';
import { useRouter } from 'next/navigation';
import { baseURL } from "../../config.js";

const { Title, Text } = Typography;

export default function ProfilePage() {
  const router = useRouter();
  const [userInfo, setUserInfo] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUserInfo = async () => {
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

        // 这里假设后端 data.user 返回 { id, username, total_spend, month_spend, num_bills }
        setUserInfo({
          id: data.user.id,
          username: data.user.username,
          totalSpend: data.user.total_spend ?? 0,
          monthSpend: data.user.month_spend ?? 0,
          numBills: data.user.num_bills ?? 0,
        });
      } catch (error) {
        router.push('/reg');
      } finally {
        setLoading(false);
      }
    };

    fetchUserInfo();
  }, [router]);

  const handleLogout = () => {
    alert('Logged out');
    router.push('/');
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        <Spin size="large" tip="Loading..." />
      </div>
    );
  }

  if (!userInfo) {
    return null; // 不显示内容
  }

  // 二维码内容，可按实际需求调整
  const qrContent = `https://yourapp.com/profile/${userInfo.id}`;

  return (
    <div className="profile-page">
      <div className="profile-avatar">
        <Image
          src="/avatar/avatar.png"
          alt="Avatar"
          width={180}
          height={180}
          className="avatar-image"
        />
      </div>

      {/* 动态二维码 */}
      <div className="profile-qrcode" style={{ textAlign: 'center', margin: '20px 0' }}>
        <QRCode
          value={qrContent}
          size={120}
          style={{ width: 120, height: 120 }}
        />
        <div style={{ fontSize: 12, color: '#888', marginTop: 4 }}>扫码访问我的主页</div>
      </div>

      <Title level={4} className="profile-name">{userInfo.username}</Title>
      <Text className="profile-total">Total spend: <span>${parseFloat(userInfo.totalSpend).toFixed(2)}</span></Text>

      <div className="profile-card">
        <p>Current Month: ${parseFloat(userInfo.monthSpend).toFixed(2)}</p>
        <p>Num Bills: {userInfo.numBills}</p>
      </div>

      <Button type="primary" className="logout-button" onClick={handleLogout}>
        Log Out
      </Button>

      <div className="bottom-nav">
        <div className="nav-item">
          <Image src="/avatar/yuan-icon.svg" width={24} height={24} alt="icon" />
        </div>
        <div className="divider" />
        <div className="nav-item">
          <Image src="/avatar/profile-icon.svg" width={24} height={24} alt="icon" />
        </div>
      </div>
    </div>
  );
}
