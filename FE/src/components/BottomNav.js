'use client';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

export default function BottomNav() {
  const router = useRouter();

  return (
    <div style={{
      position: 'fixed',
      bottom: 0,
      left: 0,
      right: 0,
      background: 'white',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      height: '60px',
      boxShadow: '0 -2px 10px rgba(0, 0, 0, 0.1)',
      zIndex: 1000,
      padding: '0 20px'
    }}>
      <div style={{
        flex: 1,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        cursor: 'pointer'
      }} onClick={() => router.push('/main')}>
        <Image src="/avatar/yuan-icon.svg" width={24} height={24} alt="main" />
      </div>
      <div style={{ width: '1px', height: '32px', background: '#ccc' }} />
      <div style={{
        flex: 1,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        cursor: 'pointer'
      }} onClick={() => router.push('/profile')}>
        <Image src="/avatar/profile-icon.svg" width={24} height={24} alt="profile" />
      </div>
    </div>
  );
} 