import React from 'react';
import { Layout, Menu } from 'antd';
import { Link } from 'react-router-dom';

const { Sider } = Layout;

const AppSider: React.FC = () => (
  <Sider breakpoint="lg" collapsedWidth="0">
    <div className="logo" style={{ color: '#fff', padding: 16, fontWeight: 'bold' }}>Docs</div>
    <Menu theme="dark" mode="inline"
      items={[
        { key: '/explorer', label: <Link to="/explorer">Khám phá tài liệu</Link> },
        { key: '/search', label: <Link to="/search">Tìm kiếm</Link> },
        { key: '/profile', label: <Link to="/profile">Hồ sơ</Link> },
      ]}
    />
  </Sider>
);

export default AppSider;
