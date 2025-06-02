"use client";
import React from "react";
import { Form, Input, Button, Typography } from "antd";
import { useForm } from "antd/es/form/Form";
import { useRouter } from "next/navigation";
import "./register.css";
import { baseURL } from "../../config.js";
import BackButton from "../../components/BackButton";

const { Title } = Typography;

export default function Register() {
  const registerAPI = `${baseURL}/accounts/register/`;
  const [form] = useForm();
  const router = useRouter();

  const handleFinish = async (values) => {
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
          router.push("/");
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
    router.push("/");
  };

  return (
    <div className="register-page">
      <div className="register-header">
        <BackButton onClick={handleBack} />
        <Title level={2}>PayPay Registration</Title>
      </div>

      <div className="register-container">
        <Form
          form={form}
          layout="horizontal"
          labelCol={{ flex: "80px" }}
          wrapperCol={{ flex: "auto" }}
          onFinish={handleFinish}
          requiredMark={false}
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
              {
                validator: async (_, value) => {
                  if (!value) {
                    throw new Error("Please input your password!");
                  }
                  if (!/^(?=.*[a-zA-Z])(?=.*\d).{6,}$/.test(value)) {
                    throw new Error("At least 6 characters with letters and numbers");
                  }
                }
              }
            ]}
            className="uniform-input password-input"
            validateTrigger={['onChange', 'onBlur']}
          >
            <Input.Password placeholder="input password" />
          </Form.Item>

          <Form.Item
            label="Re-type Password"
            name="confirmPassword"
            dependencies={["password"]}
            rules={[
              {
                validator: async (_, value) => {
                  if (!value) {
                    throw new Error("Please re-type your password!");
                  }
                  const password = form.getFieldValue("password");
                  if (value && password && value !== password) {
                    throw new Error("The two passwords do not match!");
                  }
                }
              }
            ]}
            className="uniform-input password-input"
            validateTrigger={['onChange', 'onBlur']}
          >
            <Input.Password placeholder="input password" />
          </Form.Item>

          <Form.Item>
            <Button type="primary" htmlType="submit" block>
              <Title level={2} style={{ color: '#ffffff', margin: 0 }}>Register</Title>
            </Button>
          </Form.Item>
        </Form>
      </div>
    </div>
  );
}
