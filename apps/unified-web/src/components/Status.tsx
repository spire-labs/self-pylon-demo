"use client";
export default function Status({ label, value }: { label: string; value?: string }) {
  if (!value) return null;
  return (
    <div className="text-sm text-gray-600">
      {label}: {value}
    </div>
  );
}




