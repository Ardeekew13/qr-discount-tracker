'use client';

import React from 'react';
import { Card, Descriptions, Tag, Table, Typography, Button, Space, Spin, Row, Col, Divider, message } from 'antd';
import { ArrowLeftOutlined, DownloadOutlined, PrinterOutlined, QrcodeOutlined } from '@ant-design/icons';
import { useQuery } from '@apollo/client';
import { GET_CUSTOMER, GET_CUSTOMER_ATTENDANCE } from '@/graphql/operations';
import { QRCodeDisplay, downloadQRCode, printQRCodes } from '@/components/QRCodeDisplay';
import { useRouter, useParams } from 'next/navigation';
import dayjs from 'dayjs';

const { Title, Text } = Typography;

export default function CustomerProfilePage() {
  const params = useParams();
  const router = useRouter();
  const customerId = params.id as string;

  const { data: customerData, loading: customerLoading } = useQuery(GET_CUSTOMER, { variables: { id: customerId }, skip: !customerId });
  const { data: attendanceData, loading: attendanceLoading } = useQuery(GET_CUSTOMER_ATTENDANCE, { variables: { customerId, page: 1, pageSize: 50 }, skip: !customerId });

  if (customerLoading) return <div style={{ textAlign: 'center', padding: 100 }}><Spin size="large" /></div>;
  const customer = customerData?.customer;
  if (!customer) return <Card>Customer not found</Card>;

  // QR value: use qrCode if it's a short code string, otherwise fallback to customerCode
  // (handles legacy Base64 data that hasn't been migrated yet)
  const qrValue = customer.qrCode && !customer.qrCode.startsWith('data:')
    ? customer.qrCode
    : customer.customerCode;

  const handleDownloadQR = async () => {
    if (qrValue) {
      await downloadQRCode(qrValue, `${customer.customerCode}-qr.png`);
      message.success('QR code downloaded');
    }
  };

  const handlePrintQR = async () => {
    if (qrValue) {
      await printQRCodes([{ code: qrValue, label: `${customer.fullName} — ${customer.customerCode}` }]);
    }
  };

  const attendanceColumns: any[] = [
    { title: 'Date', dataIndex: 'scannedAt', key: 'date', render: (d: string) => dayjs(d).format('MMM DD, YYYY') },
    { title: 'Time', dataIndex: 'scannedAt', key: 'time', render: (d: string) => dayjs(d).format('h:mm A') },
    { title: 'Total Amount', dataIndex: 'totalAmount', key: 'totalAmount', render: (v: number) => v != null ? `₱${v.toFixed(2)}` : '-' },
    { title: 'Discount', dataIndex: 'discountUsed', key: 'discount', render: (v: number) => <Tag color="green">{v}%</Tag> },
    { title: 'Final Amount', dataIndex: 'finalAmount', key: 'finalAmount', render: (v: number) => v != null ? <Tag color="blue">₱{v.toFixed(2)}</Tag> : '-' },
    { title: 'Staff', dataIndex: ['staff', 'fullName'], key: 'staff' },
    { title: 'Notes', dataIndex: 'notes', key: 'notes', render: (n: string) => n || '-' },
  ];

  return (
    <div>
      <Button icon={<ArrowLeftOutlined />} onClick={() => router.back()} style={{ marginBottom: 16 }}>Back</Button>
      <Row gutter={[24, 24]}>
        <Col xs={24} lg={16}>
          <Card title={<Title level={5} style={{ margin: 0 }}>Customer Information</Title>}>
            <Descriptions bordered column={{ xs: 1, sm: 2 }}>
              <Descriptions.Item label="Customer Code"><Tag color="blue" style={{ fontSize: 14 }}>{customer.customerCode}</Tag></Descriptions.Item>
              <Descriptions.Item label="Full Name"><Text strong>{customer.fullName}</Text></Descriptions.Item>
              <Descriptions.Item label="Mobile">{customer.mobile || '-'}</Descriptions.Item>
              <Descriptions.Item label="Email">{customer.email || '-'}</Descriptions.Item>
              <Descriptions.Item label="Address" span={2}>{customer.address || '-'}</Descriptions.Item>
              <Descriptions.Item label="Default Discount"><Tag color="green" style={{ fontSize: 14 }}>{customer.defaultDiscount}%</Tag></Descriptions.Item>
              <Descriptions.Item label="Status"><Tag color={customer.status === 'active' ? 'green' : 'red'}>{customer.status?.toUpperCase()}</Tag></Descriptions.Item>
              <Descriptions.Item label="Total Visits">{customer.totalVisits || 0}</Descriptions.Item>
              <Descriptions.Item label="Last Visit">{customer.lastVisit ? dayjs(customer.lastVisit).format('MMM DD, YYYY h:mm A') : 'Never'}</Descriptions.Item>
              <Descriptions.Item label="Notes" span={2}>{customer.notes || '-'}</Descriptions.Item>
            </Descriptions>
          </Card>
        </Col>
        <Col xs={24} lg={8}>
          <Card title={<span><QrcodeOutlined /> QR Code</span>}>
            <QRCodeDisplay value={qrValue} size={200} label={customer.customerCode} />
            <Divider />
            <Space direction="vertical" style={{ width: '100%' }}>
              <Button icon={<DownloadOutlined />} block onClick={handleDownloadQR} disabled={!qrValue}>Download QR</Button>
              <Button icon={<PrinterOutlined />} block onClick={handlePrintQR} disabled={!qrValue}>Print QR Card</Button>
            </Space>
          </Card>
        </Col>
      </Row>
      <Card title="Attendance History" style={{ marginTop: 24 }}>
        <Table dataSource={attendanceData?.customerAttendance?.logs || []} columns={attendanceColumns} rowKey="_id" loading={attendanceLoading} pagination={{ total: attendanceData?.customerAttendance?.total || 0, pageSize: 20, showTotal: (total: number) => `Total ${total} records` }} size="middle" />
      </Card>
    </div>
  );
}
