'use client';

import React from 'react';
import { Card, Typography, Form, Input, Button, Row, Col, message } from 'antd';
import { LockOutlined } from '@ant-design/icons';
import { useMutation } from '@apollo/client';
import { CHANGE_PASSWORD } from '@/graphql/operations';

const { Title, Text } = Typography;

export default function ChangePasswordPage() {
  const [form] = Form.useForm();
  const [changePassword, { loading }] = useMutation(CHANGE_PASSWORD);

  const onFinish = async (values: { currentPassword: string; newPassword: string; confirmPassword: string }) => {
    try {
      const { data } = await changePassword({
        variables: { currentPassword: values.currentPassword, newPassword: values.newPassword },
      });
      if (data.changePassword.success) {
        message.success(data.changePassword.message);
        form.resetFields();
      } else {
        message.error(data.changePassword.message);
      }
    } catch (error: any) {
      message.error(error.message || 'Failed to change password');
    }
  };

  return (
    <Row justify="center">
      <Col xs={24} sm={20} md={14} lg={10}>
        <Card>
          <Title level={4} style={{ marginBottom: 4 }}>Change Password</Title>
          <Text type="secondary">Update the password for your own account.</Text>

          <Form
            form={form}
            layout="vertical"
            onFinish={onFinish}
            size="large"
            style={{ marginTop: 24 }}
          >
            <Form.Item
              name="currentPassword"
              label="Current Password"
              rules={[{ required: true, message: 'Please enter your current password' }]}
            >
              <Input.Password prefix={<LockOutlined />} placeholder="Current password" autoComplete="current-password" />
            </Form.Item>

            <Form.Item
              name="newPassword"
              label="New Password"
              rules={[
                { required: true, message: 'Please enter a new password' },
                { min: 8, message: 'Password must be at least 8 characters' },
              ]}
            >
              <Input.Password prefix={<LockOutlined />} placeholder="New password" autoComplete="new-password" />
            </Form.Item>

            <Form.Item
              name="confirmPassword"
              label="Confirm New Password"
              dependencies={['newPassword']}
              rules={[
                { required: true, message: 'Please confirm your new password' },
                ({ getFieldValue }) => ({
                  validator(_, value) {
                    if (!value || getFieldValue('newPassword') === value) return Promise.resolve();
                    return Promise.reject(new Error('Passwords do not match'));
                  },
                }),
              ]}
            >
              <Input.Password prefix={<LockOutlined />} placeholder="Confirm new password" autoComplete="new-password" />
            </Form.Item>

            <Form.Item style={{ marginBottom: 0, marginTop: 24 }}>
              <Button type="primary" htmlType="submit" loading={loading} block>
                Update Password
              </Button>
            </Form.Item>
          </Form>
        </Card>
      </Col>
    </Row>
  );
}
