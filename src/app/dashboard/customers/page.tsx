'use client';

import React, { useState } from 'react';
import { Card, Table, Button, Modal, Form, Input, InputNumber, Select, Tag, Typography, message, Row, Col, Dropdown } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, EyeOutlined, SearchOutlined, MoreOutlined } from '@ant-design/icons';
import { useQuery, useMutation } from '@apollo/client';
import { GET_CUSTOMERS, CREATE_CUSTOMER, UPDATE_CUSTOMER, DELETE_CUSTOMER } from '@/graphql/operations';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import dayjs from 'dayjs';

const { Title } = Typography;
const { Option } = Select;

export default function CustomersPage() {
  const [modalVisible, setModalVisible] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<any>(null);
  const [searchText, setSearchText] = useState('');
  const [pagination, setPagination] = useState({ current: 1, pageSize: 20 });
  const [form] = Form.useForm();
  const router = useRouter();
  const { isAdmin } = useAuth();

  const { data, loading, refetch } = useQuery(GET_CUSTOMERS, {
    variables: { filter: { search: searchText || undefined, page: pagination.current, pageSize: pagination.pageSize } },
  });

  const [createCustomer, { loading: creating }] = useMutation(CREATE_CUSTOMER, {
    onCompleted: () => { message.success('Customer created'); setModalVisible(false); form.resetFields(); refetch(); },
    onError: (err: any) => message.error(err.message),
  });

  const [updateCustomer, { loading: updating }] = useMutation(UPDATE_CUSTOMER, {
    onCompleted: () => { message.success('Customer updated'); setModalVisible(false); setEditingCustomer(null); form.resetFields(); refetch(); },
    onError: (err: any) => message.error(err.message),
  });

  const [deleteCustomer] = useMutation(DELETE_CUSTOMER, {
    onCompleted: () => { message.success('Customer deleted'); refetch(); },
    onError: (err: any) => message.error(err.message),
  });

  const handleAdd = () => { setEditingCustomer(null); form.resetFields(); setModalVisible(true); };
  const handleEdit = (record: any) => { setEditingCustomer(record); form.setFieldsValue(record); setModalVisible(true); };

  const handleSubmit = async () => {
    const values = await form.validateFields();
    if (editingCustomer) {
      updateCustomer({ variables: { id: editingCustomer._id, input: values } });
    } else {
      createCustomer({ variables: { input: values } });
    }
  };

  const handleTableChange = (pag: any) => {
    setPagination({ current: pag.current, pageSize: pag.pageSize });
  };

  const columns: any[] = [
    { title: 'Code', dataIndex: 'customerCode', key: 'customerCode', width: 120, fixed: 'left' as const },
    { title: 'Name', dataIndex: 'fullName', key: 'fullName', ellipsis: true },
    { title: 'Mobile', dataIndex: 'mobile', key: 'mobile', responsive: ['md'] as any },
    { title: 'Discount', dataIndex: 'defaultDiscount', key: 'defaultDiscount', width: 80, render: (val: number) => <Tag color="green">{val}%</Tag> },
    { title: 'Visits', dataIndex: 'totalVisits', key: 'totalVisits', width: 90, responsive: ['sm'] as any },
    { title: 'Status', dataIndex: 'status', key: 'status', width: 85, render: (s: string) => <Tag color={s === 'active' ? 'green' : 'red'}>{s?.toUpperCase()}</Tag> },
    { title: 'Last Visit', dataIndex: 'lastVisit', key: 'lastVisit', width: 120, responsive: ['lg'] as any, render: (d: string) => d ? dayjs(d).format('MMM DD, YYYY') : '-' },
    {
      title: 'Actions', key: 'actions', width: 90, fixed: 'right' as const,
      render: (_: any, record: any) => {
        const items: any[] = [
          { key: 'view', icon: <EyeOutlined />, label: 'View Profile' },
          ...(isAdmin ? [
            { key: 'edit', icon: <EditOutlined />, label: 'Edit' },
            { type: 'divider' },
            { key: 'delete', icon: <DeleteOutlined />, label: 'Delete', danger: true },
          ] : []),
        ];
        const onClick = (e: any) => {
          if (e.key === 'view') router.push(`/dashboard/customers/${record._id}`);
          else if (e.key === 'edit') handleEdit(record);
          else if (e.key === 'delete') {
            Modal.confirm({
              title: 'Delete Customer',
              content: `Are you sure you want to delete ${record.fullName}?`,
              okText: 'Delete',
              okButtonProps: { danger: true },
              onOk: () => deleteCustomer({ variables: { id: record._id } }),
            });
          }
        };
        return (
          <Dropdown menu={{ items, onClick }} trigger={['click']} placement="bottomRight">
            <Button type="text" icon={<MoreOutlined style={{ fontSize: 18 }} />} />
          </Dropdown>
        );
      },
    },
  ];

  return (
    <div>
      <Row gutter={[12, 12]} align="middle" style={{ marginBottom: 16 }}>
        <Col xs={24} sm={8} md={6}>
          <Title level={4} style={{ margin: 0 }}>Customers</Title>
        </Col>
        <Col xs={24} sm={16} md={18}>
          <Row gutter={[8, 8]} justify="end">
            <Col xs={24} sm={14} md={10}>
              <Input.Search placeholder="Search customers..." allowClear onSearch={setSearchText} style={{ width: '100%' }} prefix={<SearchOutlined />} />
            </Col>
            {isAdmin && (
              <Col xs={24} sm={10} md={6}>
                <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd} block>Add Customer</Button>
              </Col>
            )}
          </Row>
        </Col>
      </Row>

      <Card styles={{ body: { padding: 0 } }}>
        <Table
          dataSource={data?.customers?.customers || []} columns={columns} rowKey="_id" loading={loading}
          pagination={{ current: pagination.current, pageSize: pagination.pageSize, total: data?.customers?.total || 0, showSizeChanger: true, showTotal: (total: number) => `Total ${total} customers` }}
          onChange={handleTableChange} scroll={{ x: 800 }} size="middle"
        />
      </Card>

      <Modal title={editingCustomer ? 'Edit Customer' : 'Add Customer'} open={modalVisible} onOk={handleSubmit} onCancel={() => { setModalVisible(false); setEditingCustomer(null); form.resetFields(); }} confirmLoading={creating || updating} width="90%" style={{ maxWidth: 600 }}>
        <Form form={form} layout="vertical">
          <Row gutter={12}>
            <Col xs={24} sm={12}><Form.Item name="firstName" label="First Name" rules={[{ required: true }]}><Input /></Form.Item></Col>
            <Col xs={24} sm={12}><Form.Item name="lastName" label="Last Name" rules={[{ required: true }]}><Input /></Form.Item></Col>
          </Row>
          <Row gutter={12}>
            <Col xs={24} sm={12}><Form.Item name="mobile" label="Mobile"><Input /></Form.Item></Col>
            <Col xs={24} sm={12}><Form.Item name="email" label="Email" rules={[{ type: 'email' }]}><Input /></Form.Item></Col>
          </Row>
          <Form.Item name="address" label="Address"><Input.TextArea rows={2} /></Form.Item>
          <Row gutter={12}>
            <Col xs={24} sm={12}><Form.Item name="defaultDiscount" label="Default Discount (%)"><InputNumber min={0} max={100} style={{ width: '100%' }} /></Form.Item></Col>
            <Col xs={24} sm={12}><Form.Item name="status" label="Status"><Select><Option value="active">Active</Option><Option value="inactive">Inactive</Option></Select></Form.Item></Col>
          </Row>
          <Form.Item name="notes" label="Notes"><Input.TextArea rows={2} /></Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
