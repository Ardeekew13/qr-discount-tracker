'use client';

import React, { useState, useEffect } from 'react';
import { Layout, Menu, Avatar, Dropdown, Typography, Button, Spin, Drawer } from 'antd';
import { DashboardOutlined, TeamOutlined, ScanOutlined, BarChartOutlined, UserOutlined, LogoutOutlined, MenuOutlined, QrcodeOutlined, LoadingOutlined, CloseOutlined, LockOutlined } from '@ant-design/icons';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';

const { Header, Sider, Content } = Layout;
const { Text } = Typography;

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(true);
  const [mobileView, setMobileView] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [navigating, setNavigating] = useState(false);
  const { user, loading, logout, isAdmin } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading && !user) router.replace('/login');
  }, [user, loading, router]);

  useEffect(() => {
    setNavigating(false);
    setDrawerOpen(false);
  }, [pathname]);

  useEffect(() => {
    const handleResize = () => {
      const isMobile = window.innerWidth < 768;
      setMobileView(isMobile);
      if (!isMobile) setDrawerOpen(false);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  if (loading || !user) {
    return <div style={{ height: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center' }}><Spin size="large" /></div>;
  }

  const menuItems = [
    { key: '/dashboard', icon: <DashboardOutlined />, label: 'Dashboard' },
    { key: '/dashboard/scan', icon: <ScanOutlined />, label: 'Scan QR' },
    { key: '/dashboard/customers', icon: <TeamOutlined />, label: 'Customers' },
    { key: '/dashboard/qr-codes', icon: <QrcodeOutlined />, label: 'QR Codes' },
    { key: '/dashboard/reports', icon: <BarChartOutlined />, label: 'Reports' },
    ...(isAdmin ? [{ key: '/dashboard/users', icon: <UserOutlined />, label: 'Users' }] : []),
  ];

  const userMenuItems = [
    { key: 'profile', icon: <UserOutlined />, label: `${user.fullName} (${user.role})`, disabled: true },
    { type: 'divider' as const },
    { key: '/dashboard/change-password', icon: <LockOutlined />, label: 'Change Password' },
    { key: 'logout', icon: <LogoutOutlined />, label: 'Logout', danger: true },
  ];

  const handleMenuClick = (e: any) => {
    if (e.key !== pathname) {
      setNavigating(true);
      router.push(e.key);
    }
    if (mobileView) setDrawerOpen(false);
  };

  const handleUserMenuClick = async (e: any) => {
    if (e.key === 'logout') { await logout(); router.push('/login'); }
    else if (e.key === '/dashboard/change-password') { router.push(e.key); }
  };

  const selectedKey = menuItems.find((item) => pathname === item.key)?.key || '/dashboard';

  const sidebarContent = (
    <>
      <div style={{ height: 64, display: 'flex', alignItems: 'center', justifyContent: 'center', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
        {!collapsed && <Text strong style={{ color: '#fff', fontSize: 16, whiteSpace: 'nowrap' }}>QR Discount</Text>}
      </div>
      <Menu theme="dark" mode="inline" selectedKeys={[selectedKey]} items={menuItems} onClick={handleMenuClick} />
    </>
  );

  return (
    <Layout style={{ minHeight: '100vh' }}>
      {/* Desktop: Fixed Sidebar */}
      {!mobileView && (
        <Sider
          trigger={null}
          collapsible
          collapsed={collapsed}
          style={{ overflow: 'auto', height: '100vh', position: 'fixed', left: 0, top: 0, bottom: 0, zIndex: 100, boxShadow: '2px 0 8px rgba(0,0,0,0.1)' }}
        >
          {sidebarContent}
        </Sider>
      )}

      {/* Mobile: Drawer */}
      {mobileView && (
        <Drawer
          placement="left"
          open={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          width={250}
          closable={false}
          styles={{ body: { padding: 0, background: '#001529' }, header: { display: 'none' } }}
        >
          <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '12px 16px' }}>
            <Button type="text" icon={<CloseOutlined />} onClick={() => setDrawerOpen(false)} style={{ color: '#fff' }} />
          </div>
          {sidebarContent}
        </Drawer>
      )}

      <Layout style={{ marginLeft: mobileView ? 0 : (collapsed ? 80 : 200), transition: 'all 0.2s' }}>
        <Header style={{ padding: '0 16px', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: '0 1px 4px rgba(0,0,0,0.08)', position: 'sticky', top: 0, zIndex: 99 }}>
          <Button
            type="text"
            icon={<MenuOutlined />}
            onClick={() => mobileView ? setDrawerOpen(true) : setCollapsed(!collapsed)}
          />
          <Dropdown menu={{ items: userMenuItems, onClick: handleUserMenuClick }} placement="bottomRight">
            <div style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Avatar icon={<UserOutlined />} style={{ backgroundColor: '#667eea' }} />
              {!mobileView && <Text>{user.fullName}</Text>}
            </div>
          </Dropdown>
        </Header>
        <Content style={{ margin: mobileView ? 12 : 24, minHeight: 280, position: 'relative' }}>
          {navigating && (
            <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', background: 'rgba(255,255,255,0.7)', zIndex: 50, borderRadius: 8 }}>
              <Spin indicator={<LoadingOutlined style={{ fontSize: 32 }} spin />} />
              <Text type="secondary" style={{ marginTop: 12 }}>Loading...</Text>
            </div>
          )}
          {children}
        </Content>
        <div style={{ textAlign: 'center', padding: '16px 0', color: '#999', fontSize: 12 }}>
          © {new Date().getFullYear()} Developed by <strong>Ron Derick Quilicot</strong>
        </div>
      </Layout>
    </Layout>
  );
}
