'use client';

import React from 'react';
import { Row, Col, Card, Statistic, Table, Typography, Spin } from 'antd';
import { TeamOutlined, CalendarOutlined, CheckCircleOutlined, PercentageOutlined, RiseOutlined } from '@ant-design/icons';
import { useQuery } from '@apollo/client';
import { GET_DASHBOARD_SUMMARY } from '@/graphql/operations';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const { Title } = Typography;

export default function DashboardPage() {
  const { data, loading } = useQuery(GET_DASHBOARD_SUMMARY);

  if (loading) return <div style={{ textAlign: 'center', padding: 100 }}><Spin size="large" /></div>;

  const summary = data?.dashboardSummary;

  const topColumns = [
    { title: 'Code', dataIndex: 'customerCode', key: 'code' },
    { title: 'Name', dataIndex: 'fullName', key: 'name' },
    { title: 'Visits', dataIndex: 'visits', key: 'visits' },
  ];

  return (
    <div>
      <Title level={4} style={{ marginBottom: 24 }}>Dashboard</Title>

      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} lg={6}>
          <Card hoverable><Statistic title="Total Customers" value={summary?.totalCustomers || 0} prefix={<TeamOutlined style={{ color: '#667eea' }} />} /></Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card hoverable><Statistic title="Today's Attendance" value={summary?.todayAttendance || 0} prefix={<CalendarOutlined style={{ color: '#52c41a' }} />} /></Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card hoverable><Statistic title="Monthly Attendance" value={summary?.monthlyAttendance || 0} prefix={<RiseOutlined style={{ color: '#faad14' }} />} /></Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card hoverable><Statistic title="Active Customers" value={summary?.activeCustomers || 0} prefix={<CheckCircleOutlined style={{ color: '#52c41a' }} />} /></Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} lg={8}>
          <Card><Statistic title="Average Discount Used" value={summary?.averageDiscount || 0} suffix="%" precision={1} prefix={<PercentageOutlined style={{ color: '#764ba2' }} />} /></Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} lg={12}>
          <Card title="Daily Attendance (Last 30 Days)">
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={summary?.dailyAttendance || []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="count" stroke="#667eea" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card title="Monthly Attendance (Last 12 Months)">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={summary?.monthlyAttendanceChart || []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill="#764ba2" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </Col>
      </Row>

      <Card title="Top Returning Customers">
        <Table dataSource={summary?.topReturningCustomers || []} columns={topColumns} rowKey="customerId" pagination={false} size="small" />
      </Card>
    </div>
  );
}
