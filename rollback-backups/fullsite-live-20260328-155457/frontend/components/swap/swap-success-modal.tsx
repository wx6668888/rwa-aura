'use client';

import { CheckCircle } from 'lucide-react';

interface SwapSuccessModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function SwapSuccessModal({ isOpen, onClose }: SwapSuccessModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-[#0d0d14] border border-[#ffffff1a] rounded-2xl p-8 max-w-md w-full mx-4">
        <div className="flex flex-col items-center text-center">
          <div className="w-16 h-16 rounded-full bg-[#10b98110] border border-[#10b98140] flex items-center justify-center mb-4">
            <CheckCircle className="w-10 h-10 text-[#10b981]" />
          </div>
          <h2 className="text-2xl font-bold text-[#10b981] mb-2">兑换成功！</h2>
          <p className="text-[#94a3b8] mb-6">您的交易已成功完成</p>
          <button
            onClick={onClose}
            className="w-full h-12 bg-[#00f5d4] text-[#05050a] rounded-full font-bold hover:brightness-110 transition-all"
          >
            确认
          </button>
        </div>
      </div>
    </div>
  );
}
