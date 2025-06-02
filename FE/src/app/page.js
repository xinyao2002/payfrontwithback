"use client";
import Image from "next/image";
import styles from "./page.module.css";
import { Typography, Form, Input, Button } from "antd";
import { LockOutlined, UserOutlined } from "@ant-design/icons";
import { useRouter } from 'next/navigation'; 
import { baseURL } from "../config.js"; // Import baseURL

const { Title } = Typography;

export default function Home() {
  const loginAPI = `${baseURL}/accounts/login/`;
  const router = useRouter();

  const onFinish = (values) => {
    fetch(loginAPI, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: 'include',
      body: JSON.stringify({
        email: values.email,
        password: values.password,
      }),
    })
      .then(async (response) => {
        const result = await response.json();
        if (response.ok) {
          router.push("/main");
        } else {
          alert(`Login failed: ${result.error || response.statusText}`);
        }
      })
      .catch(() => {
        alert("An error occurred during login");
      });
  };

  const handleRegistration = () => {
    router.push('/reg');  // redirect to reg
  };

  const handleResetPassword = () => {
    router.push('/forgotpwd');  // redirect to reset
    // also can use router.push('/reset')
  };

  return (
    <div className={styles.page}>
      <div className={styles.avatar}>
        <Image
          src="/avatar/avatar.png"
          alt="Avatar"
          width={236}
          height={228}
          className={styles.avatarImage}
          priority={true}
        />
      </div>

      <div>
        <p className={styles.name}>PayPay</p>
      </div>

      <div className={styles.loginBoard}>
        <div className={styles.loginBoardTitle}>
          <Title level={5} style={{ whiteSpace: 'nowrap' }}>Welcome Back</Title>
        </div>

        <div className={styles.loginBoardContent}>
          <Form
            layout="vertical"
            onFinish={onFinish}
            className={styles.loginForm}
          >
            <div className={styles.formItem}>
              <span className={styles.label}>Email Address:</span>
              <Form.Item
                name="email"
                rules={[
                  { required: true, message: "Please enter your email" },
                  { type: "email", message: "Email format not correct" },
                ]}
                noStyle
              >
                <Input
                  className={styles.input}
                  prefix={<UserOutlined />}
                  placeholder="example"
                />
              </Form.Item>
            </div>

            <div className={styles.formItem}>
              <span className={styles.label}>Password:</span>
              <Form.Item
                name="password"
                rules={[
                  { required: true, message: "Please input password" },
                  { min: 6, message: "At least 6 characters" },
                ]}
                noStyle
              >
                <Input.Password
                  className={styles.input}
                  placeholder="input password"
                />
              </Form.Item>
            </div>

            <div style={{ display: "flex" }}>
              <Form.Item className={styles.buttonWrapper}>
                <Button
                  type="primary"
                  htmlType="submit"
                  className={styles.loginButton}
                >
                  Log In
                </Button>
              </Form.Item>

              <Button
                type="link"
                className={styles.resetButton}
                onClick={handleResetPassword}
              >
                Forgot Password
              </Button>
            </div>
          </Form>

          <div className={styles.register}>
            <span className={styles.registerText}>Dont have an account?</span>
            <Button
              type="link"
              className={styles.registerButton}
              onClick={handleRegistration}
            >
              Register
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
