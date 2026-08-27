import { Spin } from 'antd';

export default function Loading() {
  return (
    <div style={{ textAlign: 'center', padding: 100 }}>
      <Spin size="large" />
    </div>
  );
}
