import React from 'react';
import ThermalReceiptModal from '@/components/common/ThermalReceiptModal';

interface ReceiptModalProps {
  orderId: string;
  onClose: () => void;
}

export default function ReceiptModal({ orderId, onClose }: ReceiptModalProps) {
  return <ThermalReceiptModal orderId={orderId} onClose={onClose} />;
}
