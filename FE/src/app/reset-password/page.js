"use client";
import Image from "next/image";
import styles from "./page.module.css";
import { Typography, Form, Input, Button } from "antd";
import { useSearchParams} from 'next/navigation';
import { LockOutlined, UserOutlined } from "@ant-design/icons";
import { useRouter } from "next/navigation";
import { use } from "react";
import { baseURL } from "../../config.js"; // Import baseURL

const { Title } = Typography;

export default function ResetPassword() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const uid = searchParams.get('uid');
  const token = searchParams.get('token');
  const resetPwdAPI = `${baseURL}/accounts/reset-password/${uid}/${token}/`;
  const [form] = Form.useForm();

  const handleReset = () => {
    form.validateFields().then(async (values) => {
      await fetch(resetPwdAPI, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          password: values.newPassword,
        }),
      })
        .then(async (response) => {
          const result = await response.json();
          if (response.ok) {
            alert("Password reset successfully");
            router.push("/"); // redirect to login page
          } else {
            alert(`Error: ${result.error || response.statusText}`);
          }
        })
        .catch((error) => {
          alert("An error occurred while resetting the password");
        });
    });
  };

  return (
    <div>
      <div className={styles.resetPwdTitle}>
        <Title level={1} className={styles.resetPwdWord}>
          Reset Password
        </Title>
      </div>
      <div className={styles.resetContainer}>
      <Form form={form} layout="vertical" className={styles.resetForm}>
        <Form.Item
          name="newPassword"
          rules={[{ required: true, pattern: /^(?=.*[a-zA-Z])(?=.*\d).{6,}$/, message: "At least 6 characters with letters and numbers." }]}
          className={styles.inputItem}
        >
          <Input.Password
            className={styles.passwordInput}
            placeholder="New Password"
          />
        </Form.Item>

        <Form.Item
          name="confirmPassword"
          rules={[
            { required: true, message: "Please confirm your password" },
            ({ getFieldValue }) => ({
              validator(_, value) {
                if (!value || getFieldValue("newPassword") === value) {
                  return Promise.resolve();
                }
                return Promise.reject(
                  new Error("Passwords do not match!")
                );
              },
            }),
          ]}
          className={styles.inputItem}
        >
          <Input.Password
            className={styles.passwordInput}
            placeholder="Confirmed Password"
          />
        </Form.Item>

        <Form.Item>
          <Button type="primary" onClick={handleReset} className={styles.sendBtn} shape="round" size="medium">
          <Title level={2} className={styles.sendWord}>Reset Password</Title>
        </Button>
        </Form.Item>
      </Form>
    </div>
    </div>
  );
}
