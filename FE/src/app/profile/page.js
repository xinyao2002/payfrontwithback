'use client';
import React, { useEffect, useState } from 'react';
import { Typography, Button, Spin } from 'antd';
import Image from 'next/image';
import QRCode from 'react-qr-code';
import './profile.css';
import { useRouter } from 'next/navigation';
import { baseURL } from "../../config.js";

const { Title, Text } = Typography;

// Responsive sizes for different devices
const deviceSizes = {
  mobile: {
    avatarSize: 120,
    qrSize: 100,
    fontSize: '40px',
  },
  tablet: {
    avatarSize: 150,
    qrSize: 110,
    fontSize: '50px',
  },
  desktop: {
    avatarSize: 180,
    qrSize: 120,
    fontSize: '60px',
  }
};

export default function ProfilePage() {
  const router = useRouter();
  const [userInfo, setUserInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [windowWidth, setWindowWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 0);

  // Add window resize listener
  useEffect(() => {
    const handleResize = () => {
      setWindowWidth(window.innerWidth);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Get current device size
  const getCurrentDeviceSize = () => {
    if (windowWidth < 768) return deviceSizes.mobile;
    if (windowWidth < 1024) return deviceSizes.tablet;
    return deviceSizes.desktop;
  };

  const currentSize = getCurrentDeviceSize();

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

        const userId = data.user.id;
        const username = data.user.username;

        // Fetch personal bill data
        const billResponse = await fetch(`${baseURL}/api/personalbill/`, {
          credentials: 'include',
          headers: {
            'Accept': 'application/json',
          }
        });

        if (!billResponse.ok) {
          throw new Error('Failed to fetch personal bill data');
        }

        const billData = await billResponse.json();

        setUserInfo({
          id: userId,
          username: username,
          first_name: data.user.first_name,
          last_name: data.user.last_name,
          totalSpend: billData.total_spend ?? 0,
          monthSpend: billData.month_spend ?? 0,
          numBills: billData.num_bills ?? 0,
        });
      } catch (error) {
        console.error('Error fetching user info or personal bill data:', error);
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
    return null; // Don't display content
  }

  // qr code
  const qrContent = `https://localhost:3000/profile/${userInfo.username}`;

  return (
    <div className="profile-page" style={{
      padding: windowWidth < 768 ? '20px' : '40px',
      maxWidth: '100%',
      boxSizing: 'border-box'
    }}>
      <div className="profile-avatar" style={{
        width: currentSize.avatarSize,
        height: currentSize.avatarSize,
        borderRadius: '50%',
        background: '#1248A0',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'white',
        fontSize: currentSize.fontSize,
        fontWeight: 'bold',
        margin: '0 auto'
      }}>
        {userInfo.first_name && userInfo.last_name ? 
          `${userInfo.first_name[0]}${userInfo.last_name[0]}` : 
          userInfo.username[0].toUpperCase()}
      </div>

      <div className="profile-qrcode" style={{ 
        textAlign: 'center', 
        margin: windowWidth < 768 ? '15px 0' : '20px 0' 
      }}>
        <QRCode
          value={userInfo.username}
          size={currentSize.qrSize}
          style={{ width: currentSize.qrSize, height: currentSize.qrSize }}
        />
        <div style={{ 
          fontSize: windowWidth < 768 ? 10 : 12, 
          color: '#888', 
          marginTop: 4 
        }}>
          Add me to the bill
        </div>
      </div>

      <Title level={4} className="profile-name" style={{
        fontSize: windowWidth < 768 ? '18px' : '24px'
      }}>
        {userInfo.username}
      </Title>
      
      <Text className="profile-total" style={{
        fontSize: windowWidth < 768 ? '14px' : '16px'
      }}>
        Total spend: <span>${parseFloat(userInfo.totalSpend).toFixed(2)}</span>
      </Text>

      <div className="profile-card" style={{
        padding: windowWidth < 768 ? '15px' : '20px',
        margin: windowWidth < 768 ? '15px 0' : '20px 0'
      }}>
        <p style={{ fontSize: windowWidth < 768 ? '14px' : '16px' }}>
          Current Month: ${parseFloat(userInfo.monthSpend).toFixed(2)}
        </p>
        <p style={{ fontSize: windowWidth < 768 ? '14px' : '16px' }}>
          Num Bills: {userInfo.numBills}
        </p>
      </div>

      <Button 
        type="primary" 
        className="logout-button" 
        onClick={handleLogout}
        style={{
          background: "#1248A0",
          color: "white",
          border: "none",
          borderRadius: 20,
          padding: windowWidth < 768 ? "8px 20px" : "10px 30px",
          fontWeight: "bold",
          fontSize: windowWidth < 768 ? 16 : 18,
          cursor: "pointer",
          boxShadow: "0px 2px 8px #dde3f7",
          height: "auto",
          width: windowWidth < 768 ? '80%' : 'auto',
          margin: windowWidth < 768 ? '0 auto' : undefined,
          display: windowWidth < 768 ? 'block' : undefined
        }}
      >
        Log Out
      </Button>

      {/* Bottom navigation */}
      <div className="bottom-nav" style={{
        padding: windowWidth < 768 ? '10px 0' : '15px 0'
      }}>
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
