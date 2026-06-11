'use client';

import React, { useState } from 'react';
import { Card, Button, InputNumber, Table, Tag, Typography, message, Row, Col, Space, Select, Modal, Input, Popconfirm } from 'antd';
import { DownloadOutlined, PlusOutlined, QrcodeOutlined, PrinterOutlined, DeleteOutlined } from '@ant-design/icons';
import { useQuery, useMutation } from '@apollo/client';
import { GET_QR_POOL, BATCH_GENERATE_QR, DELETE_QR_CODE } from '@/graphql/operations';
import { QRCodeDisplay, downloadQRCode, downloadMultipleQRCodes, printQRCodes } from '@/components/QRCodeDisplay';
import { useAuth } from '@/lib/auth-context';
import dayjs from 'dayjs';

const { Title, Text } = Typography;
const { Option } = Select;

export default function QRCodesPage() {
  const [count, setCount] = useState<number>(10);
  const [statusFilter, setStatusFilter] = useState<string | undefined>(undefined);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [previewModalVisible, setPreviewModalVisible] = useState(false);
  const [previewCodes, setPreviewCodes] = useState<string[]>([]);
  const { isAdmin } = useAuth();

  const { data, loading, refetch } = useQuery(GET_QR_POOL, {
    variables: { status: statusFilter, search: search || undefined, page, pageSize },
    fetchPolicy: 'cache-and-network',
  });

  const [batchGenerate, { loading: generating }] = useMutation(BATCH_GENERATE_QR, {
    onCompleted: (result) => {
      message.success(`Generated ${result.batchGenerateQR.count} QR codes!`);
      // Show preview of newly generated codes
      setPreviewCodes(result.batchGenerateQR.codes || []);
      setPreviewModalVisible(true);
      refetch();
    },
    onError: (err: any) => message.error(err.message),
  });

  const [deleteQRCode] = useMutation(DELETE_QR_CODE, {
    onCompleted: () => { message.success('QR code deleted'); refetch(); },
    onError: (err: any) => message.error(err.message),
  });

  const handleGenerate = () => {
    if (count < 1 || count > 500) {
      message.error('Count must be between 1 and 500');
      return;
    }
    batchGenerate({ variables: { count } });
  };

  const handleSearch = () => {
    setSearch(searchInput.trim());
    setPage(1);
  };

  const handleDownloadPage = async () => {
    const items = data?.qrPool?.items;
    if (!items?.length) return;
    const codes = items.map((i: any) => i.code);
    await downloadMultipleQRCodes(codes);
    message.success(`${codes.length} QR codes downloaded!`);
  };

  const handlePrintPage = async () => {
    const items = data?.qrPool?.items;
    if (!items?.length) return;
    const printItems = items.map((i: any) => ({ code: i.code, label: i.customer?.fullName }));
    await printQRCodes(printItems);
  };

  const handleDownloadSingle = async (code: string) => {
    await downloadQRCode(code);
    message.success('QR code downloaded');
  };

  const handleDownloadPreview = async () => {
    await downloadMultipleQRCodes(previewCodes);
    message.success(`${previewCodes.length} QR codes downloaded!`);
  };

  const handlePrintPreview = async () => {
    await printQRCodes(previewCodes.map((code) => ({ code })));
  };

  const columns: any[] = [
    {
      title: 'Code',
      dataIndex: 'code',
      key: 'code',
      render: (c: string) => <Text strong copyable style={{ fontFamily: 'monospace' }}>{c}</Text>,
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 120,
      render: (s: string) => <Tag color={s === 'available' ? 'blue' : 'green'}>{s === 'available' ? '🟡 Available' : '✅ Assigned'}</Tag>,
    },
    {
      title: 'Assigned To',
      key: 'customer',
      render: (_: any, record: any) => record.customer?.fullName || <Text type="secondary">—</Text>,
    },
    {
      title: 'Batch',
      dataIndex: 'batchId',
      key: 'batchId',
      width: 160,
      render: (b: string) => <Text type="secondary" style={{ fontSize: 12 }}>{b}</Text>,
    },
    {
      title: 'Generated',
      dataIndex: 'generatedAt',
      key: 'generatedAt',
      width: 130,
      render: (d: string) => dayjs(d).format('MMM DD, YYYY'),
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 140,
      render: (_: any, record: any) => (
        <Space size="small">
          <Button type="link" size="small" icon={<DownloadOutlined />} onClick={() => handleDownloadSingle(record.code)}>Save</Button>
          {isAdmin && (
            <Popconfirm
              title="Delete QR Code"
              description={record.status === 'assigned' ? 'This will also delete the assigned customer and their attendance logs.' : 'Are you sure?'}
              onConfirm={() => deleteQRCode({ variables: { id: record._id } })}
              okText="Delete"
              okButtonProps={{ danger: true }}
            >
              <Button type="link" size="small" danger icon={<DeleteOutlined />}>Delete</Button>
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div>
      <Title level={4} style={{ marginBottom: 16 }}>QR Code Management</Title>

      {/* Batch Generate Section */}
      {isAdmin && (
        <Card title={<span><QrcodeOutlined /> Generate QR Code Batch</span>} style={{ marginBottom: 16 }}>
          <Row gutter={[12, 12]} align="middle">
            <Col xs={12} sm={6}>
              <Text style={{ display: 'block', marginBottom: 4 }}>Quantity:</Text>
              <InputNumber min={1} max={500} value={count} onChange={(v) => setCount(v || 10)} style={{ width: '100%' }} />
            </Col>
            <Col xs={12} sm={10}>
              <Text style={{ display: 'block', marginBottom: 4 }}>&nbsp;</Text>
              <Button type="primary" icon={<PlusOutlined />} onClick={handleGenerate} loading={generating} size="large" block>
                Generate
              </Button>
            </Col>
          </Row>
          <Text type="secondary" style={{ marginTop: 12, display: 'block', fontSize: 12 }}>
            Pre-generate QR codes (stored as code strings only — images generated on demand). Register customers later when they present their QR card.
          </Text>
        </Card>
      )}

      {/* Filter & Table */}
      <Card title="QR Code Pool" style={{ overflow: 'hidden' }}>
        <Row gutter={[8, 8]} style={{ marginBottom: 16 }}>
          <Col xs={24} sm={10} md={8}>
            <Input.Search
              placeholder="Search code..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onSearch={handleSearch}
              allowClear
              onClear={() => { setSearch(''); setSearchInput(''); }}
              style={{ width: '100%' }}
            />
          </Col>
          <Col xs={12} sm={7} md={6}>
            <Select placeholder="Status" allowClear value={statusFilter} onChange={(v) => { setStatusFilter(v); setPage(1); }} style={{ width: '100%' }}>
              <Option value="available">Available</Option>
              <Option value="assigned">Assigned</Option>
            </Select>
          </Col>
          <Col xs={6} sm={4} md={3}>
            <Button icon={<DownloadOutlined />} onClick={handleDownloadPage} disabled={!data?.qrPool?.items?.length} block>
              Save
            </Button>
          </Col>
          <Col xs={6} sm={3} md={3}>
            <Button icon={<PrinterOutlined />} onClick={handlePrintPage} disabled={!data?.qrPool?.items?.length} block>
              Print
            </Button>
          </Col>
        </Row>
        <Table
          dataSource={data?.qrPool?.items || []}
          columns={columns}
          rowKey="_id"
          loading={loading}
          pagination={{
            current: page,
            pageSize,
            total: data?.qrPool?.total || 0,
            onChange: (p) => setPage(p),
            showTotal: (total: number) => `Total ${total} QR codes`,
            showSizeChanger: false,
          }}
          size="middle"
          scroll={{ x: 700 }}
        />
      </Card>

      {/* Preview Modal - shows dynamically generated QR images */}
      <Modal
        title={`Generated ${previewCodes.length} QR Code${previewCodes.length > 1 ? 's' : ''}`}
        open={previewModalVisible}
        onCancel={() => setPreviewModalVisible(false)}
        width={700}
        footer={[
          <Button key="close" onClick={() => setPreviewModalVisible(false)}>Close</Button>,
          <Button key="print" icon={<PrinterOutlined />} onClick={handlePrintPreview}>Print</Button>,
          <Button key="save" type="primary" icon={<DownloadOutlined />} onClick={handleDownloadPreview}>
            Download All
          </Button>,
        ]}
      >
        <div style={{ maxHeight: 400, overflow: 'auto' }}>
          <Row gutter={[16, 16]}>
            {previewCodes.map((code: string) => (
              <Col xs={12} sm={8} md={6} key={code}>
                <Card size="small" style={{ textAlign: 'center' }} hoverable>
                  <QRCodeDisplay value={code} size={80} />
                  <div style={{ marginTop: 4 }}>
                    <Text style={{ fontSize: 11, fontFamily: 'monospace' }}>{code}</Text>
                  </div>
                </Card>
              </Col>
            ))}
          </Row>
        </div>
      </Modal>
    </div>
  );
}
