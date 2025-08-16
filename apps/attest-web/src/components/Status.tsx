"use client";
import { shortHash } from '../lib/status';

export default function Status({ label, value }: { label: string; value?: string }) {
  if (!value) return null;
  const v = value.startsWith('0x') && value.length > 20 ? shortHash(value) : value;
  return (
    <div style={{ fontSize: 12, color: '#666' }}>
      {label}: {v}
    </div>
  );
}

