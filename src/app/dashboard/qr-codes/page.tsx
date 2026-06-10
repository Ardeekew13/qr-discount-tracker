'use client';

import React, { useState } from 'react';
import { Card, Button, InputNumber, Table, Tag, Typography, message, Row, Col, Space, Select, Image, Modal, Input, Spin, Popconfirm } from 'antd';
import { DownloadOutlined, PlusOutlined, QrcodeOutlined, SearchOutlined, DeleteOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useLazyQuery } from '@apollo/client';
import { GET_QR_POOL, GET_QR_POOL_IMAGES, BATCH_GENERATE_QR, DELETE_QR_CODE } from '@/graphql/operations';
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
  const [printModalVisible, setPrintModalVisible] = useState(false);
  const [printImages, setPrintImages] = useState<any[]>([]);
  const { isAdmin } = useAuth();

  const { data, loading, refetch } = useQuery(GET_QR_POOL, {
    variables: { status: statusFilter, search: search || undefined, page, pageSize },
    fetchPolicy: 'cache-and-network',
  });

  const [fetchImages, { loading: imagesLoading }] = useLazyQuery(GET_QR_POOL_IMAGES, {
    fetchPolicy: 'network-only',
    onCompleted: (result) => {
      setPrintImages(result.qrPoolImages || []);
      setPrintModalVisible(true);
    },
    onError: (err: any) => message.error('Failed to load images: ' + err.message),
  });

  const [batchGenerate, { loading: generating }] = useMutation(BATCH_GENERATE_QR, {
    onCompleted: (result) => {
      message.success(`Generated ${result.batchGenerateQR.count} QR codes!`);
      // Load images for the newly generated batch for printing
      const ids = result.batchGenerateQR.items.map((i: any) => i._id);
      fetchImages({ variables: { ids } });
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

  const handleSavePage = () => {
    const items = data?.qrPool?.items;
    if (!items?.length) return;
    const ids = items.map((i: any) => i._id);
    fetchImages({ variables: { ids } });
  };

  const handleSaveSingle = (id: string) => {
    fetchImages({ variables: { ids: [id] } });
  };

  const doDownload = (images: any[]) => {
    images.forEach((item: any) => {
      const img = new window.Image();
      img.onload = () => {
        const padding = 20;
        const textHeight = 40;
        const canvasWidth = img.width + padding * 2;
        const canvasHeight = img.height + padding * 2 + textHeight;

        const canvas = document.createElement('canvas');
        canvas.width = canvasWidth;
        canvas.height = canvasHeight;
        const ctx = canvas.getContext('2d')!;

        // White background
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvasWidth, canvasHeight);

        // Draw QR image
        ctx.drawImage(img, padding, padding);

        // Draw code text below
        ctx.fillStyle = '#000000';
        ctx.font = 'bold 24px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(item.code, canvasWidth / 2, img.height + padding + textHeight - 10);

        // Download
        const link = document.createElement('a');
        link.href = canvas.toDataURL('image/png');
        link.download = `${item.code}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      };
      img.src = item.qrImage;
    });
    if (images.length > 1) message.success(`${images.length} QR codes saved!`);
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
          <Button type="link" size="small" icon={<DownloadOutlined />} onClick={() => handleSaveSingle(record._id)}>Save</Button>
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
            Pre-generate QR codes and save as images. Register customers later when they present their QR card.
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
          <Col xs={12} sm={7} md={4}>
            <Button icon={<DownloadOutlined />} onClick={handleSavePage} loading={imagesLoading} disabled={!data?.qrPool?.items?.length} block>
              Save All
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

      {/* Print Modal */}
      <Modal
        title={`Save ${printImages.length} QR Code${printImages.length > 1 ? 's' : ''}`}
        open={printModalVisible}
        onCancel={() => setPrintModalVisible(false)}
        width={700}
        footer={[
          <Button key="close" onClick={() => setPrintModalVisible(false)}>Close</Button>,
          <Button key="save" type="primary" icon={<DownloadOutlined />} onClick={() => doDownload(printImages)}>
            Save as Picture{printImages.length > 1 ? 's' : ''}
          </Button>,
        ]}
      >
        {imagesLoading ? (
          <div style={{ textAlign: 'center', padding: 40 }}><Spin size="large" /><p>Loading QR images...</p></div>
        ) : (
          <div style={{ maxHeight: 400, overflow: 'auto' }}>
            <Row gutter={[16, 16]}>
              {printImages.map((item: any) => (
                <Col xs={12} sm={8} md={6} key={item._id}>
                  <Card size="small" style={{ textAlign: 'center' }} hoverable>
                    <Image src={item.qrImage} width={80} preview={false} />
                    <div style={{ marginTop: 4 }}>
                      <Text style={{ fontSize: 11, fontFamily: 'monospace' }}>{item.code}</Text>
                    </div>
                  </Card>
                </Col>
              ))}
            </Row>
          </div>
        )}
      </Modal>
    </div>
  );
}
