import React from 'react';
import { Spin } from 'antd';

const LoadingSpinner: React.FC = () => <Spin size="large" style={{ display: 'block', margin: '40px auto' }} />;

export default LoadingSpinner;
