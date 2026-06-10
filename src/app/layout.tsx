import type { Metadata } from 'next';
import { ApolloWrapper } from '@/lib/apollo-client';
import { AuthProvider } from '@/lib/auth-context';
import { AntdRegistry } from '@ant-design/nextjs-registry';
import '@ant-design/v5-patch-for-react-19';
import './globals.css';

export const metadata: Metadata = {
  title: 'QR Discount & Attendance System',
  description: 'Customer Discount & Attendance Management System',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body suppressHydrationWarning>
        <AntdRegistry>
          <ApolloWrapper>
            <AuthProvider>{children}</AuthProvider>
          </ApolloWrapper>
        </AntdRegistry>
      </body>
    </html>
  );
}
