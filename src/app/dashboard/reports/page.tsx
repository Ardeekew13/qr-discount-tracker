'use client';

import React, { useState } from 'react';
import { Card, Table, Typography, DatePicker, Select, Row, Col, Button, Tag, Tabs } from 'antd';
import { DownloadOutlined, FileExcelOutlined } from '@ant-design/icons';
import { useQuery } from '@apollo/client';
import { GET_ATTENDANCE_LOGS, GET_CUSTOMER_REPORTS, GET_USERS } from '@/graphql/operations';
import { useAuth } from '@/lib/auth-context';
import dayjs from 'dayjs';

const { Title } = Typography;
const { RangePicker } = DatePicker;

export default function ReportsPage() {
  const [dateRange, setDateRange] = useState<[any, any] | null>(null);
  const [selectedStaff, setSelectedStaff] = useState<string | undefined>();
  const [attendancePage, setAttendancePage] = useState(1);
  const { isAdmin } = useAuth();

  const { data: attendanceData, loading: attendanceLoading } = useQuery(GET_ATTENDANCE_LOGS, {
    variables: {
      filter: {
        startDate: dateRange?.[0]?.startOf('day').toISOString(),
        endDate: dateRange?.[1]?.endOf('day').toISOString(),
        staffId: selectedStaff,
      },
      page: attendancePage,
      pageSize: 20,
    },
  });

  const { data: reportsData, loading: reportsLoading } = useQuery(GET_CUSTOMER_REPORTS);
  const { data: usersData } = useQuery(GET_USERS, { skip: !isAdmin });

  const handleExportCSV = (data: any[], filename: string) => {
    if (!data?.length) return;
    const headers = Object.keys(data[0]).filter((k) => !k.startsWith('__'));
    const csvContent = [headers.join(','), ...data.map((row) => headers.map((h) => `"${row[h] || ''}"`).join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${filename}-${dayjs().format('YYYY-MM-DD')}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const attendanceColumns: any[] = [
    { title: 'Customer', key: 'customer', fixed: 'left' as const, width: 120, ellipsis: true, render: (_: any, r: any) => r.customer?.fullName || r.customerCode },
    { title: 'Code', dataIndex: 'customerCode', key: 'code', width: 120, responsive: ['md'] as any },
    { title: 'Date', dataIndex: 'scannedAt', key: 'date', width: 110, render: (d: string) => dayjs(d).format('MMM DD, YYYY') },
    { title: 'Time', dataIndex: 'scannedAt', key: 'time', width: 80, responsive: ['sm'] as any, render: (d: string) => dayjs(d).format('h:mm A') },
    { title: 'Total', dataIndex: 'totalAmount', key: 'totalAmount', width: 100, render: (v: number) => v != null ? `₱${v.toFixed(2)}` : '-' },
    { title: 'Disc.', dataIndex: 'discountUsed', key: 'discount', width: 70, render: (v: number) => <Tag color="green">{v}%</Tag> },
    { title: 'Final', dataIndex: 'finalAmount', key: 'finalAmount', width: 100, render: (v: number) => v != null ? <Tag color="blue">₱{v.toFixed(2)}</Tag> : '-' },
    { title: 'Staff', key: 'staff', width: 120, responsive: ['lg'] as any, render: (_: any, r: any) => r.staff?.fullName || '-' },
    { title: 'Notes', dataIndex: 'notes', key: 'notes', responsive: ['xl'] as any, ellipsis: true, render: (v: string) => v || '-' },
  ];

  const customerReportColumns: any[] = [
    { title: 'Customer', dataIndex: 'fullName', key: 'fullName', fixed: 'left' as const, width: 130, ellipsis: true, sorter: (a: any, b: any) => a.fullName.localeCompare(b.fullName) },
    { title: 'Code', dataIndex: 'customerCode', key: 'code', width: 120, responsive: ['md'] as any },
    { title: 'Visits', dataIndex: 'totalVisits', key: 'totalVisits', width: 70, sorter: (a: any, b: any) => a.totalVisits - b.totalVisits, defaultSortOrder: 'descend' as const },
    { title: 'Avg. Disc.', dataIndex: 'averageDiscount', key: 'avgDiscount', width: 90, render: (v: number) => <Tag color="green">{v?.toFixed(1)}%</Tag> },
    { title: 'Revenue', dataIndex: 'totalRevenue', key: 'totalRevenue', width: 110, sorter: (a: any, b: any) => (a.totalRevenue || 0) - (b.totalRevenue || 0), render: (v: number) => v != null ? `₱${v.toFixed(2)}` : '-' },
    { title: 'Discount', dataIndex: 'totalDiscountAmount', key: 'totalDiscount', width: 110, responsive: ['sm'] as any, render: (v: number) => v != null ? <Tag color="orange">₱{v.toFixed(2)}</Tag> : '-' },
    { title: 'Last Visit', dataIndex: 'lastVisit', key: 'lastVisit', width: 110, responsive: ['lg'] as any, render: (d: string) => d ? dayjs(d).format('MMM DD, YYYY') : '-' },
  ];

  const tabItems = [
    {
      key: 'attendance', label: 'Logs Report',
      children: (
        <>
          <Row gutter={[8, 8]} style={{ marginBottom: 16 }}>
            <Col xs={24} sm={12} md={8}><RangePicker style={{ width: '100%' }} onChange={(dates: any) => setDateRange(dates)} allowClear /></Col>
            {isAdmin && (
              <Col xs={24} sm={12} md={8}>
                <Select placeholder="Filter by Staff" allowClear style={{ width: '100%' }} onChange={setSelectedStaff} options={usersData?.users?.map((u: any) => ({ label: u.fullName, value: u._id })) || []} />
              </Col>
            )}
            <Col xs={24} sm={12} md={4}>
              <Button icon={<DownloadOutlined />} block onClick={() => handleExportCSV(attendanceData?.attendanceLogs?.logs?.map((l: any) => ({ Customer: l.customer?.fullName, Code: l.customerCode, Date: dayjs(l.scannedAt).format('YYYY-MM-DD'), Time: dayjs(l.scannedAt).format('HH:mm'), 'Total Amount': l.totalAmount?.toFixed(2) || '0.00', Discount: `${l.discountUsed}%`, 'Final Amount': l.finalAmount?.toFixed(2) || '0.00', Staff: l.staff?.fullName, Notes: l.notes || '' })) || [], 'attendance-report')}>Export</Button>
            </Col>
          </Row>
          <Table dataSource={attendanceData?.attendanceLogs?.logs || []} columns={attendanceColumns} rowKey="_id" loading={attendanceLoading} pagination={{ current: attendancePage, pageSize: 20, total: attendanceData?.attendanceLogs?.total || 0, onChange: setAttendancePage, showTotal: (total: number) => `${total} records` }} size="small" scroll={{ x: 900 }} />
        </>
      ),
    },
    {
      key: 'customers', label: 'Customer Report',
      children: (
        <>
          <Row justify="end" style={{ marginBottom: 16 }}>
            <Col xs={24} sm={8}>
              <Button icon={<FileExcelOutlined />} block onClick={() => handleExportCSV(reportsData?.customerReports?.map((r: any) => ({ Customer: r.fullName, Code: r.customerCode, 'Total Visits': r.totalVisits, 'Avg Discount': `${r.averageDiscount}%`, 'Total Revenue': `₱${r.totalRevenue?.toFixed(2) || '0.00'}`, 'Total Discount Given': `₱${r.totalDiscountAmount?.toFixed(2) || '0.00'}`, 'Last Visit': r.lastVisit ? dayjs(r.lastVisit).format('YYYY-MM-DD') : '-' })) || [], 'customer-report')}>Export</Button>
            </Col>
          </Row>
          <Table dataSource={reportsData?.customerReports || []} columns={customerReportColumns} rowKey="customerId" loading={reportsLoading} pagination={{ pageSize: 20, showTotal: (total: number) => `${total} customers` }} size="small" scroll={{ x: 700 }} />
        </>
      ),
    },
  ];

  return (
    <div>
      <Title level={4} style={{ marginBottom: 24 }}>Reports</Title>
      <Card><Tabs items={tabItems} /></Card>
    </div>
  );
}
