import React from 'react';
import { Modal } from 'antd';

interface ConfirmModalProps {
  open: boolean;
  title: string;
  content: string;
  onOk: () => void;
  onCancel: () => void;
}

const ConfirmModal: React.FC<ConfirmModalProps> = ({ open, title, content, onOk, onCancel }) => (
  <Modal open={open} title={title} onOk={onOk} onCancel={onCancel} centered>
    {content}
  </Modal>
);

export default ConfirmModal;
