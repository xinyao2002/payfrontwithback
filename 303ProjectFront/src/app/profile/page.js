'use client';
import React from 'react';
import { Typography, Button } from 'antd';
import Image from 'next/image';
import './profile.css';
import { useRouter } from 'next/navigation';
import { baseURL } from "../../config.js"; // Import baseURL

const { Title, Text } = Typography;

export default function ProfilePage() {
  const router = useRouter();

  const handleLogout = () => {
    // 清理 session、token 等
    alert('Logged out');
    router.push('/'); // 返回首页或登录页
  };

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

      <Title level={4} className="profile-name">Xinyao Feng</Title>
      <Text className="profile-total">Total spend: <span>$321.00</span></Text>

      <div className="profile-card">
        <p>Current Month: $21</p>
        <p>Num Bills: 3</p>
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
