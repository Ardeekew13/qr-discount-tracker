'use client';

import React from 'react';
import { Card, Descriptions, Tag, Table, Typography, Button, Space, Spin, Row, Col, Image, Divider, message } from 'antd';
import { ArrowLeftOutlined, DownloadOutlined, PrinterOutlined, QrcodeOutlined, ReloadOutlined } from '@ant-design/icons';
import { useQuery, useMutation } from '@apollo/client';
import { GET_CUSTOMER, GET_CUSTOMER_ATTENDANCE, REGENERATE_QR_CODE } from '@/graphql/operations';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import dayjs from 'dayjs';

const { Title, Text } = Typography;

export default function CustomerProfilePage() {
  const params = useParams();
  const router = useRouter();
  const { isAdmin } = useAuth();
  const customerId = params.id as string;

  const { data: customerData, loading: customerLoading, refetch } = useQuery(GET_CUSTOMER, { variables: { id: customerId }, skip: !customerId });
  const { data: attendanceData, loading: attendanceLoading } = useQuery(GET_CUSTOMER_ATTENDANCE, { variables: { customerId, page: 1, pageSize: 50 }, skip: !customerId });

  const [regenerateQR, { loading: regenerating }] = useMutation(REGENERATE_QR_CODE, {
    onCompleted: () => { message.success('QR code regenerated'); refetch(); },
    onError: (err: any) => message.error(err.message),
  });

  if (customerLoading) return <div style={{ textAlign: 'center', padding: 100 }}><Spin size="large" /></div>;
  const customer = customerData?.customer;
  if (!customer) return <Card>Customer not found</Card>;

  const handleDownloadQR = () => {
    if (customer.qrCode) {
      const link = document.createElement('a');
      link.href = customer.qrCode;
      link.download = `${customer.customerCode}-qr.png`;
      link.click();
    }
  };

  const handlePrintQR = () => {
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`<html><head><title>QR - ${customer.customerCode}</title></head><body style="text-align:center;padding:40px;font-family:Arial"><h2>${customer.fullName}</h2><p style="font-size:18px;color:#666">${customer.customerCode}</p><img src="${customer.qrCode}" style="width:300px;height:300px" /><p style="margin-top:20px;font-size:14px;color:#999">Scan this QR code for check-in</p></body></html>`);
      printWindow.document.close();
      printWindow.print();
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
            <div style={{ textAlign: 'center' }}>
              {customer.qrCode ? (
                <Image src={customer.qrCode} alt="QR Code" width={200} preview={false} style={{ border: '1px solid #f0f0f0', borderRadius: 8, padding: 8 }} />
              ) : (
                <div style={{ padding: 40, color: '#999' }}>No QR code generated</div>
              )}
              <div style={{ marginTop: 8 }}><Text strong>{customer.customerCode}</Text></div>
            </div>
            <Divider />
            <Space direction="vertical" style={{ width: '100%' }}>
              <Button icon={<DownloadOutlined />} block onClick={handleDownloadQR} disabled={!customer.qrCode}>Download QR</Button>
              <Button icon={<PrinterOutlined />} block onClick={handlePrintQR} disabled={!customer.qrCode}>Print QR Card</Button>
              {isAdmin && <Button icon={<ReloadOutlined />} block onClick={() => regenerateQR({ variables: { customerId: customer._id } })} loading={regenerating}>Regenerate QR</Button>}
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
