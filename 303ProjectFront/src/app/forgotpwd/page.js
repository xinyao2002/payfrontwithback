"use client";
import React from "react";
import styles from "./page.module.css";
import { Button, Typography, Input, Form, message } from "antd";
import { ArrowLeftOutlined } from "@ant-design/icons";
const { Title, Text } = Typography;
import { useRouter } from "next/navigation";
import { baseURL } from "../../config.js"; // Import baseURL

export default function ForgotPassword() {
  const forgotPwdAPI = `${baseURL}/accounts/forgot-password/`;
  const [form] = Form.useForm();
  const router = useRouter();
  // Go Back to main page
  const handelBack = () => {
    router.push("/");
  };

  // Send email to reset password
  const handleSend = () => {
    fetch(forgotPwdAPI, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email: form.getFieldValue("email") }),
    })
      .then(async (response) => {
        const result = await response.json();
        if (response.ok) {
          console.log(result);
          message.success("Email sent successfully");
          alert("Email sent successfully");
          router.push("/"); // redirect to reset password page
        } else {
          message.error(`Error: ${result.error || response.statusText}`);
          console.error("Error:", result);
        }
      })
      .catch((error) => {
        console.error("Error:", error);
        message.error("An error occurred while sending the email");
      });
  }

  return (
    <div>
      <div className={styles.backBtnLine}>
        <Button
          type="link"
          icon={<ArrowLeftOutlined style={{ fontSize: "20px" }} />}
          className={styles.backBtn}
          onClick={handelBack}
        >
          <span style={{ fontSize: "20px", fontWeight: "bold" }}>Back</span>{" "}
          <Text type="secondary" style={{ fontSize: "15px !important" }}>
            Log In Page
          </Text>
        </Button>
      </div>
      <div className={styles.forgotPwdTitle}>
        <Title level={1} className={styles.forgotPwdWord}>
          Forgot Password
        </Title>
      </div>
      <div className={styles.emailInputContainer}>
        <Text className={styles.emailInputTitle}>
          Please enter your email address
        </Text>
        <Form form={form} layout="vertical" className={styles.emailInputContainer}>
        <Form.Item
          name="email"
          rules={[
            { required: true, message: "Please enter your email!" },
            {
              type: "email",
              message: "The input is not a valid email address!",
            },
          ]}
        >
          <Input
            className={styles.emailInput}
            placeholder="Email"
            size="medium"
          />
        </Form.Item>

        <Button type="primary" onClick={handleSend} className={styles.sendBtn} shape="round" size="medium">
          <Title level={2} className={styles.sendWord}>Send</Title>
        </Button>
      </Form>
      </div>
    </div>
  );
}
