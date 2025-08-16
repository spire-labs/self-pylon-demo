"use client";
export default function Status({ label, value }: { label: string; value?: string }) {
  if (!value) return null;
  return (
    <div style={{ fontSize: 12, color: '#666' }}>
      {label}: {value}
    </div>
  );
}

