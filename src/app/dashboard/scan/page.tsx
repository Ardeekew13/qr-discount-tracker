'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Card, Typography, Button, InputNumber, Tag, message, Result, Space, Input, Divider, Alert, Form, Row, Col } from 'antd';
import { ScanOutlined, CheckCircleOutlined, CameraOutlined, EditOutlined, UserAddOutlined } from '@ant-design/icons';
import { useMutation, useLazyQuery } from '@apollo/client';
import { QR_LOOKUP, RECORD_ATTENDANCE, REGISTER_CUSTOMER_TO_QR } from '@/graphql/operations';
import dayjs from 'dayjs';

const { Title, Text } = Typography;

type ScanState = 'idle' | 'customer-found' | 'unassigned' | 'success' | 'registered';

export default function ScanPage() {
  const [scanning, setScanning] = useState(false);
  const [scanState, setScanState] = useState<ScanState>('idle');
  const [customer, setCustomer] = useState<any>(null);
  const [qrItem, setQrItem] = useState<any>(null);
  const [scannedCode, setScannedCode] = useState('');
  const [totalAmount, setTotalAmount] = useState<number>(0);
  const [discountToUse, setDiscountToUse] = useState<number>(0);
  const [notes, setNotes] = useState('');
  const [manualCode, setManualCode] = useState('');
  const scannerRef = useRef<any>(null);
  const [registerForm] = Form.useForm();

  const finalAmount = totalAmount - (totalAmount * discountToUse / 100);

  const [lookupQR, { loading: lookupLoading }] = useLazyQuery(QR_LOOKUP, {
    fetchPolicy: 'network-only',
    onCompleted: (data: any) => {
      const result = data.qrLookup;
      if (!result.found) {
        message.error('QR code not recognized. Not in pool and no customer found.');
        return;
      }
      if (result.status === 'assigned' && result.customer) {
        setCustomer(result.customer);
        setDiscountToUse(result.customer.defaultDiscount);
        setScanState('customer-found');
      } else if (result.status === 'available') {
        setQrItem(result.qrPool);
        setScannedCode(result.qrPool.code);
        setScanState('unassigned');
      }
    },
    onError: (error: any) => message.error(error.message || 'Lookup failed'),
  });

  const [recordAttendance, { loading: recordingLoading }] = useMutation(RECORD_ATTENDANCE, {
    onCompleted: () => { setScanState('success'); message.success('Attendance recorded!'); },
    onError: (error: any) => message.error(error.message || 'Failed to record'),
  });

  const [registerCustomer, { loading: registering }] = useMutation(REGISTER_CUSTOMER_TO_QR, {
    onCompleted: (data: any) => {
      setCustomer(data.registerCustomerToQR);
      setScanState('registered');
      message.success('Customer registered successfully!');
    },
    onError: (error: any) => message.error(error.message || 'Registration failed'),
  });

  const startScanner = async () => {
    setScanning(true);
    handleReset();
    const { Html5Qrcode } = await import('html5-qrcode');
    // iOS Safari exposes a native BarcodeDetector that html5-qrcode prefers by
    // default, but it's unreliable there (camera opens, nothing ever decodes).
    // Force the zxing-based decoder instead, which works consistently on iOS.
    const scanner = new Html5Qrcode('qr-reader', { useBarCodeDetectorIfSupported: false, verbose: false });
    scannerRef.current = scanner;
    try {
      await scanner.start(
        { facingMode: 'environment' },
        // No aspectRatio: on iOS Safari it's applied to the camera track via a
        // post-start applyConstraints() call, which can decouple what's shown
        // on screen from what's actually captured into the canvas for
        // decoding. Letting the video use its native aspect ratio avoids that.
        { fps: 10, qrbox: { width: 250, height: 250 } },
        (decodedText: string) => { handleScanResult(decodedText); stopScanner(); },
        () => {}
      );
    } catch {
      message.error('Failed to start camera.');
      setScanning(false);
    }
  };

  const stopScanner = async () => {
    if (scannerRef.current) {
      try { await scannerRef.current.stop(); scannerRef.current.clear(); } catch {}
      scannerRef.current = null;
    }
    setScanning(false);
  };

  const handleScanResult = (code: string) => {
    const cleanCode = code.trim().toUpperCase();
    setScannedCode(cleanCode);
    lookupQR({ variables: { code: cleanCode } });
  };

  const handleManualSearch = () => {
    if (manualCode.trim()) {
      handleReset();
      const code = manualCode.trim().toUpperCase();
      setScannedCode(code);
      lookupQR({ variables: { code } });
    }
  };

  const handleRecordAttendance = () => {
    if (!customer) return;
    if (totalAmount <= 0) { message.error('Please enter the total amount'); return; }
    recordAttendance({ variables: { input: { customerCode: customer.customerCode, totalAmount, discountUsed: discountToUse, notes: notes || undefined } } });
  };

  const handleRegister = async () => {
    const values = await registerForm.validateFields();
    registerCustomer({ variables: { input: { ...values, code: scannedCode } } });
  };

  const handleReset = () => {
    setScanState('idle');
    setCustomer(null);
    setQrItem(null);
    setScannedCode('');
    setTotalAmount(0);
    setNotes('');
    setManualCode('');
    setDiscountToUse(0);
    registerForm.resetFields();
  };

  useEffect(() => { return () => { stopScanner(); }; }, []);

  // SUCCESS: Attendance recorded
  if (scanState === 'success') {
    return (
      <Row justify="center">
        <Col xs={24} sm={22} md={18} lg={14}>
          <Card>
            <Result
              status="success"
              title="Attendance Recorded!"
              subTitle={
                <div>
                  <p><strong>{customer?.fullName}</strong> ({customer?.customerCode})</p>
                  <p>Total Amount: ₱{totalAmount.toFixed(2)}</p>
                  <p>Discount: {discountToUse}%</p>
                  <p style={{ fontSize: 18, fontWeight: 'bold' }}>Final Amount: ₱{finalAmount.toFixed(2)}</p>
                  <p>Time: {dayjs().format('MMM DD, YYYY h:mm A')}</p>
                </div>
              }
              extra={[<Button type="primary" key="scan" icon={<ScanOutlined />} onClick={handleReset} size="large" block>Scan Another</Button>]}
            />
          </Card>
        </Col>
      </Row>
    );
  }

  // SUCCESS: Customer registered
  if (scanState === 'registered') {
    return (
      <Row justify="center">
        <Col xs={24} sm={22} md={18} lg={14}>
          <Card>
            <Result
              status="success"
              title="Customer Registered!"
              subTitle={<div><p><strong>{customer?.fullName}</strong> has been linked to <strong>{customer?.customerCode}</strong></p><p>They can now use this QR for check-in.</p></div>}
              extra={[<Button type="primary" key="scan" icon={<ScanOutlined />} onClick={handleReset} size="large" block>Scan Another</Button>]}
            />
          </Card>
        </Col>
      </Row>
    );
  }

  return (
    <div>
      <Title level={4} style={{ marginBottom: 16 }}>Scan QR Code</Title>

      {/* IDLE: Scanner + Manual Entry */}
      {scanState === 'idle' && (
        <Row justify="center">
          <Col xs={24} sm={22} md={18} lg={14} xl={12}>
            <Card style={{ marginBottom: 16 }}>
              <div id="qr-reader" style={{ width: '100%', maxWidth: 400, margin: '0 auto' }} />
              <div style={{ textAlign: 'center', marginTop: 16 }}>
                {!scanning ? (
                  <Button type="primary" icon={<CameraOutlined />} onClick={startScanner} size="large" block>Start Scanner</Button>
                ) : (
                  <Button danger onClick={stopScanner} size="large" block>Stop Scanner</Button>
                )}
              </div>
            </Card>

            <Card title="Manual Entry" size="small">
              <Row gutter={[8, 8]}>
                <Col xs={24} sm={18}>
                  <Input
                    placeholder="Enter Code (e.g., CUST-000001)"
                    value={manualCode}
                    onChange={(e) => setManualCode(e.target.value)}
                    onPressEnter={handleManualSearch}
                    size="large"
                  />
                </Col>
                <Col xs={24} sm={6}>
                  <Button type="primary" size="large" onClick={handleManualSearch} loading={lookupLoading} block>
                    Search
                  </Button>
                </Col>
              </Row>
            </Card>
          </Col>
        </Row>
      )}

      {/* CUSTOMER FOUND: Show details + Record attendance */}
      {scanState === 'customer-found' && customer && (
        <Row justify="center">
          <Col xs={24} sm={24} md={22} lg={18} xl={16}>
            <Card>
              <Alert message="Customer Found — Record Log" type="success" showIcon style={{ marginBottom: 16 }} />

              {/* Customer Info Grid */}
              <Row gutter={[12, 12]} style={{ marginBottom: 24 }}>
                <Col xs={24} sm={12}>
                  <Card size="small" style={{ background: '#fafafa' }}>
                    <Text type="secondary" style={{ fontSize: 12 }}>Customer Name</Text>
                    <div><Text strong style={{ fontSize: 16 }}>{customer.fullName}</Text></div>
                  </Card>
                </Col>
                <Col xs={24} sm={12}>
                  <Card size="small" style={{ background: '#fafafa' }}>
                    <Text type="secondary" style={{ fontSize: 12 }}>Customer Code</Text>
                    <div><Tag color="blue" style={{ fontSize: 14, marginTop: 4 }}>{customer.customerCode}</Tag></div>
                  </Card>
                </Col>
                <Col xs={12} sm={6}>
                  <Card size="small" style={{ background: '#fafafa' }}>
                    <Text type="secondary" style={{ fontSize: 12 }}>Discount</Text>
                    <div><Tag color="green" style={{ fontSize: 14, marginTop: 4 }}>{customer.defaultDiscount}%</Tag></div>
                  </Card>
                </Col>
                <Col xs={12} sm={6}>
                  <Card size="small" style={{ background: '#fafafa' }}>
                    <Text type="secondary" style={{ fontSize: 12 }}>Status</Text>
                    <div><Tag color={customer.status === 'active' ? 'green' : 'red'} style={{ fontSize: 14, marginTop: 4 }}>{customer.status?.toUpperCase()}</Tag></div>
                  </Card>
                </Col>
                <Col xs={12} sm={6}>
                  <Card size="small" style={{ background: '#fafafa' }}>
                    <Text type="secondary" style={{ fontSize: 12 }}>Visits</Text>
                    <div><Text strong style={{ fontSize: 16 }}>{customer.totalVisits || 0}</Text></div>
                  </Card>
                </Col>
                <Col xs={12} sm={6}>
                  <Card size="small" style={{ background: '#fafafa' }}>
                    <Text type="secondary" style={{ fontSize: 12 }}>Last Visit</Text>
                    <div><Text style={{ fontSize: 13 }}>{customer.lastVisit ? dayjs(customer.lastVisit).format('MMM DD') : 'First'}</Text></div>
                  </Card>
                </Col>
              </Row>

              <Divider style={{ margin: '16px 0' }} />

              {/* Transaction Details */}
              <Title level={5} style={{ marginBottom: 16 }}><EditOutlined /> Transaction Details</Title>
              <Row gutter={[12, 16]}>
                <Col xs={24} sm={8}>
                  <Text strong style={{ display: 'block', marginBottom: 8 }}>Total Amount</Text>
                  <InputNumber
                    min={0}
                    value={totalAmount}
                    onChange={(val) => setTotalAmount(val || 0)}
                    size="large"
                    prefix="₱"
                    style={{ width: '100%' }}
                    placeholder="0.00"
                  />
                </Col>
                <Col xs={12} sm={8}>
                  <Text strong style={{ display: 'block', marginBottom: 8 }}>Discount</Text>
                  <InputNumber
                    min={0}
                    max={100}
                    value={discountToUse}
                    onChange={(val) => setDiscountToUse(val || 0)}
                    size="large"
                    suffix="%"
                    style={{ width: '100%' }}
                  />
                </Col>
                <Col xs={12} sm={8}>
                  <Text strong style={{ display: 'block', marginBottom: 8 }}>Final Amount</Text>
                  <div style={{ padding: '8px 12px', background: '#f6ffed', border: '1px solid #b7eb8f', borderRadius: 8, fontSize: 20, fontWeight: 'bold', textAlign: 'center', lineHeight: '32px' }}>
                    ₱{finalAmount.toFixed(2)}
                  </div>
                </Col>
              </Row>

              <Row gutter={[12, 16]} style={{ marginTop: 16 }}>
                <Col xs={24}>
                  <Text strong style={{ display: 'block', marginBottom: 8 }}>Notes (optional)</Text>
                  <Input.TextArea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Add notes..." rows={2} />
                </Col>
              </Row>

              <Row gutter={[12, 12]} style={{ marginTop: 24 }}>
                <Col xs={24} sm={12}>
                  <Button type="primary" size="large" icon={<CheckCircleOutlined />} onClick={handleRecordAttendance} loading={recordingLoading} block>
                    Record Log
                  </Button>
                </Col>
                <Col xs={24} sm={12}>
                  <Button size="large" onClick={handleReset} block>Cancel</Button>
                </Col>
              </Row>
            </Card>
          </Col>
        </Row>
      )}

      {/* UNASSIGNED QR: Show registration form */}
      <div style={{ display: scanState === 'unassigned' ? 'block' : 'none' }}>
        <Row justify="center">
          <Col xs={24} sm={24} md={22} lg={18} xl={16}>
            <Card>
              <Alert
                message={<span>QR Code <Tag color="blue" style={{ margin: '0 4px' }}>{scannedCode}</Tag> is not yet assigned</span>}
                description="Fill in the customer details below to register this QR code."
                type="info"
                showIcon
                icon={<UserAddOutlined />}
                style={{ marginBottom: 24 }}
              />

              <Form form={registerForm} layout="vertical" size="large">
                <Row gutter={[12, 0]}>
                  <Col xs={24} sm={12}>
                    <Form.Item name="firstName" label="First Name" rules={[{ required: true, message: 'Required' }]}>
                      <Input placeholder="Juan" />
                    </Form.Item>
                  </Col>
                  <Col xs={24} sm={12}>
                    <Form.Item name="lastName" label="Last Name" rules={[{ required: true, message: 'Required' }]}>
                      <Input placeholder="Dela Cruz" />
                    </Form.Item>
                  </Col>
                </Row>
                <Row gutter={[12, 0]}>
                  <Col xs={24} sm={12}>
                    <Form.Item name="mobile" label="Mobile">
                      <Input placeholder="09171234567" />
                    </Form.Item>
                  </Col>
                  <Col xs={24} sm={12}>
                    <Form.Item name="email" label="Email" rules={[{ type: 'email' }]}>
                      <Input placeholder="email@example.com" />
                    </Form.Item>
                  </Col>
                </Row>
                <Row gutter={[12, 0]}>
                  <Col xs={24} sm={16}>
                    <Form.Item name="address" label="Address">
                      <Input placeholder="Address" />
                    </Form.Item>
                  </Col>
                  <Col xs={24} sm={8}>
                    <Form.Item name="defaultDiscount" label="Default Discount (%)">
                      <InputNumber min={0} max={100} style={{ width: '100%' }} placeholder="10" />
                    </Form.Item>
                  </Col>
                </Row>
                <Row gutter={[12, 0]}>
                  <Col xs={24}>
                    <Form.Item name="notes" label="Notes">
                      <Input.TextArea rows={2} placeholder="Optional notes..." />
                    </Form.Item>
                  </Col>
                </Row>
              </Form>

              <Row gutter={[12, 12]}>
                <Col xs={24} sm={14}>
                  <Button type="primary" size="large" icon={<UserAddOutlined />} onClick={handleRegister} loading={registering} block>
                    Register to {scannedCode}
                  </Button>
                </Col>
                <Col xs={24} sm={10}>
                  <Button size="large" onClick={handleReset} block>Cancel</Button>
                </Col>
              </Row>
            </Card>
          </Col>
        </Row>
      </div>
    </div>
  );
}

