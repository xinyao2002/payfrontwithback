"use client";
import { Button, Typography } from "antd";
import { ArrowLeftOutlined } from "@ant-design/icons";
import styles from "./styles.module.css";

const { Text } = Typography;

export default function BackButton({ onClick, destinationText = "Log In Page" }) {
  return (
    <div className={styles.backBtnLine}>
      <Button
        type="link"
        icon={<ArrowLeftOutlined style={{ fontSize: "20px" }} />}
        className={styles.backBtn}
        onClick={onClick}
      >
        <span style={{ fontSize: "20px", fontWeight: "bold" }}>Back</span>{" "}
        <Text type="secondary" style={{ fontSize: "15px" }}>
          {destinationText}
        </Text>
      </Button>
    </div>
  );
} 