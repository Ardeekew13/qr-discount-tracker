'use client';

import React, { useState } from 'react';
import { Card, Table, Button, Space, Modal, Form, Input, Select, Tag, Typography, message, Popconfirm, Row, Col } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { useQuery, useMutation } from '@apollo/client';
import { GET_USERS, CREATE_USER, UPDATE_USER, DELETE_USER } from '@/graphql/operations';
import dayjs from 'dayjs';

const { Title } = Typography;
const { Option } = Select;

export default function UsersPage() {
  const [modalVisible, setModalVisible] = useState(false);
  const [editingUser, setEditingUser] = useState<any>(null);
  const [form] = Form.useForm();

  const { data, loading, refetch } = useQuery(GET_USERS);

  const [createUser, { loading: creating }] = useMutation(CREATE_USER, {
    onCompleted: () => { message.success('User created'); setModalVisible(false); form.resetFields(); refetch(); },
    onError: (err: any) => message.error(err.message),
  });

  const [updateUser, { loading: updating }] = useMutation(UPDATE_USER, {
    onCompleted: () => { message.success('User updated'); setModalVisible(false); setEditingUser(null); form.resetFields(); refetch(); },
    onError: (err: any) => message.error(err.message),
  });

  const [deleteUser] = useMutation(DELETE_USER, {
    onCompleted: () => { message.success('User deleted'); refetch(); },
    onError: (err: any) => message.error(err.message),
  });

  const handleAdd = () => { setEditingUser(null); form.resetFields(); setModalVisible(true); };
  const handleEdit = (record: any) => { setEditingUser(record); form.setFieldsValue({ ...record, password: undefined }); setModalVisible(true); };

  const handleSubmit = async () => {
    const values = await form.validateFields();
    if (editingUser) {
      const input: any = { ...values };
      if (!input.password) delete input.password;
      updateUser({ variables: { id: editingUser._id, input } });
    } else {
      createUser({ variables: { input: values } });
    }
  };

  const columns: any[] = [
    { title: 'Username', dataIndex: 'username', key: 'username', fixed: 'left' as const, width: 120 },
    { title: 'Full Name', dataIndex: 'fullName', key: 'fullName', ellipsis: true },
    { title: 'Email', dataIndex: 'email', key: 'email', responsive: ['md'] as any, ellipsis: true },
    { title: 'Role', dataIndex: 'role', key: 'role', width: 90, render: (r: string) => <Tag color={r === 'admin' ? 'purple' : 'blue'}>{r?.toUpperCase()}</Tag> },
    { title: 'Status', dataIndex: 'status', key: 'status', width: 85, render: (s: string) => <Tag color={s === 'active' ? 'green' : 'red'}>{s?.toUpperCase()}</Tag> },
    { title: 'Created', dataIndex: 'createdAt', key: 'createdAt', responsive: ['lg'] as any, width: 120, render: (d: string) => dayjs(d).format('MMM DD, YYYY') },
    {
      title: 'Actions', key: 'actions', width: 100, fixed: 'right' as const,
      render: (_: any, record: any) => (
        <Space size="small">
          <Button type="link" size="small" icon={<EditOutlined />} onClick={() => handleEdit(record)} />
          <Popconfirm title="Delete this user?" onConfirm={() => deleteUser({ variables: { id: record._id } })}>
            <Button type="link" size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <Row gutter={[12, 12]} align="middle" style={{ marginBottom: 16 }}>
        <Col xs={24} sm={14}>
          <Title level={4} style={{ margin: 0 }}>User Management</Title>
        </Col>
        <Col xs={24} sm={10} style={{ textAlign: 'right' }}>
          <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd} block={false}>Add User</Button>
        </Col>
      </Row>

      <Card styles={{ body: { padding: 0 } }}>
        <Table dataSource={data?.users || []} columns={columns} rowKey="_id" loading={loading} pagination={{ pageSize: 20 }} size="middle" scroll={{ x: 600 }} />
      </Card>

      <Modal title={editingUser ? 'Edit User' : 'Add User'} open={modalVisible} onOk={handleSubmit} onCancel={() => { setModalVisible(false); setEditingUser(null); form.resetFields(); }} confirmLoading={creating || updating} width="90%" style={{ maxWidth: 500 }}>
        <Form form={form} layout="vertical">
          <Form.Item name="username" label="Username" rules={[{ required: true }]}><Input disabled={!!editingUser} /></Form.Item>
          <Form.Item name="password" label={editingUser ? 'New Password (leave blank to keep)' : 'Password'} rules={editingUser ? [] : [{ required: true }]}><Input.Password /></Form.Item>
          <Form.Item name="fullName" label="Full Name" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="email" label="Email" rules={[{ type: 'email' }]}><Input /></Form.Item>
          <Row gutter={12}>
            <Col xs={24} sm={12}><Form.Item name="role" label="Role" rules={[{ required: true }]}><Select><Option value="admin">Admin</Option><Option value="staff">Staff</Option></Select></Form.Item></Col>
            {editingUser && <Col xs={24} sm={12}><Form.Item name="status" label="Status"><Select><Option value="active">Active</Option><Option value="inactive">Inactive</Option></Select></Form.Item></Col>}
          </Row>
        </Form>
      </Modal>
    </div>
  );
}
