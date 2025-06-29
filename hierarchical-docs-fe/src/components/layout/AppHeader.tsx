import React from 'react';
import { Layout } from 'antd';

const { Header } = Layout;

const AppHeader: React.FC = () => (
  <Header style={{ background: '#fff', padding: 0, minHeight: 56 }}>
    <div style={{ fontWeight: 'bold', fontSize: 20, paddingLeft: 24 }}>Hierarchical Docs</div>
  </Header>
);

export default AppHeader;
