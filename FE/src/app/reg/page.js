"use client";
import React from "react";
import { Form, Input, Button, Typography } from "antd";
import { ArrowLeftOutlined } from "@ant-design/icons";
import { useForm } from "antd/es/form/Form";
import { useRouter } from "next/navigation";
import "./register.css";
import { baseURL } from "../../config.js"; // Import baseURL

const { Title, Text } = Typography;

export default function Register() {
  console.log("baseURL:", baseURL);
  const registerAPI = `${baseURL}/accounts/register/`;
  const [form] = useForm();
  const router = useRouter();

  const handleFinish = async (values) => {
    //console.log('Submitted values:', values);
    const { username, firstName, lastName, email, password } = values;
    const data = {
      username: username,
      email: email,
      password: password,
      first_name: firstName,
      last_name: lastName,
    };
    console.log("Registering with data:", data);
    await fetch(registerAPI, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: 'include',
      body: JSON.stringify(data),
    })
      .then(async (response) => {
        const result = await response.json();
        if (response.ok) {
          console.log(result);
          router.push("/"); // redirect to main page
        } else {
          alert(`Registration failed: ${result.error || response.statusText}`);
          console.error("Registration error:", result);
        }
      })
      .catch((error) => {
        console.error("Error:", error);
        alert("An error occurred during registration");
      });
  };

  const handleBack = () => {
    router.push("/"); // back to main
  };

  return (
    <div className="register-page">
      {/* return button */}
      <div className="register-header">
        <Button
          type="link"
          icon={<ArrowLeftOutlined />}
          className="back-button"
          onClick={handleBack}
        >
          Back <Text type="secondary">Log In Page</Text>
        </Button>
        <Title level={2}>PayPay Registration</Title>
      </div>

      {/* reg card */}
      <div className="register-container">
        <Form
          form={form}
          layout="horizontal"
          labelCol={{ flex: "80px" }}
          wrapperCol={{ flex: "auto" }}
          onFinish={handleFinish}
          requiredMark="optional"
        >
          <Form.Item
            label="User Name"
            name="username"
            rules={[
              { required: true, message: "Please input your user name!" },
            ]}
            className="uniform-input"
          >
            <Input placeholder="example" />
          </Form.Item>

          <Form.Item
            label="First Name"
            name="firstName"
            rules={[
              { required: true, message: "Please input your first name!" },
            ]}
            className="uniform-input"
          >
            <Input placeholder="example" />
          </Form.Item>

          <Form.Item
            label="Last Name"
            name="lastName"
            rules={[
              { required: true, message: "Please input your last name!" },
            ]}
            className="uniform-input"
          >
            <Input placeholder="example" />
          </Form.Item>

          <Form.Item
            label="Email"
            name="email"
            rules={[
              { required: true, message: "Please input your email!" },
              { type: "email", message: "Invalid email!" },
            ]}
            className="uniform-input"
          >
            <Input placeholder="example@example.com" />
          </Form.Item>

          <Form.Item
            label="Password"
            name="password"
            rules={[
              { required: true, message: "Please input your password!" },
              {
                pattern: /^(?=.*[a-zA-Z])(?=.*\d).{6,}$/,
                message: "At least 6 characters with letters and numbers.",
              },
            ]}
            className="uniform-input"
          >
            <Input.Password placeholder="input password" />
          </Form.Item>

          <Text type="danger" style={{ fontSize: 12 }}>
            (At least 6 characters and include numbers and characters)
          </Text>

          <Form.Item
            label="Re-type Password"
            name="confirmPassword"
            dependencies={["password"]}
            rules={[
              { required: true, message: "Please confirm your password!" },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue("password") === value) {
                    return Promise.resolve();
                  }
                  return Promise.reject(new Error("Passwords do not match!"));
                },
              }),
            ]}
            className="uniform-input"
          >
            <Input.Password placeholder="input password" />
          </Form.Item>

          <Form.Item>
            <Button type="primary" htmlType="submit" block size="large">
              Register
            </Button>
          </Form.Item>
        </Form>
      </div>
    </div>
  );
}
