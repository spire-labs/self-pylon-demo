export function shortHash(tx?: string) {
  if (!tx) return '';
  return tx.slice(0, 10) + '…' + tx.slice(-6);
}

export function formatError(e: unknown) {
  if (!e) return 'Unknown error';
  const any = e as any;
  return any?.shortMessage || any?.message || String(e);
}

