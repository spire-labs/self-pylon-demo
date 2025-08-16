export type SelfProofPayload = {
  proof: `0x${string}`;
  publicSignals: string[]; // decimal strings
  commitment: `0x${string}`; // 32-byte hex
  attributeSetId: number;
};

export type SelfRequest = {
  version: number;
  appName: string;
  scope: string; // application scope
  disclosures: {
    minimumAge?: number;
    nationality?: boolean;
    gender?: boolean;
    humanity?: boolean;
  };
  userId?: string; // wallet address or identifier
  userDefinedData?: string;
};

export function buildDeeplink(req: SelfRequest, callbackUrl: string): string {
  // Placeholder builder compatible with our current pages; replace with Self SDK call later.
  const payload = encodeURIComponent(JSON.stringify({ req, callbackUrl }));
  return `self://proof?request=${payload}&redirect=${encodeURIComponent(callbackUrl + '?payload=')}`;
}

export function parseCallback(search: string): SelfProofPayload | null {
  const params = new URLSearchParams(search);
  const raw = params.get('payload') || params.get('data') || params.get('proof');
  if (!raw) return null;
  const decoded = safeDecodeURIComponent(raw);
  // Try JSON parse first
  let obj: any | null = tryJsonParse(decoded);
  // If not JSON, try base64 → JSON
  if (!obj) {
    const b64 = safeBase64Decode(decoded);
    obj = tryJsonParse(b64);
  }
  if (!obj) return null;
  return normalizeSelfPayload(obj);
}

// Attempt to normalize Self QR onSuccess event payload into our proof format
export function fromSuccessEvent(eventData: unknown): SelfProofPayload | null {
  if (!eventData) return null;
  try {
    const anyData = eventData as any;
    return normalizeSelfPayload(anyData);
  } catch {
    return null;
  }
}

// Helpers
function tryJsonParse(value: string | null): any | null {
  if (!value) return null;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function safeDecodeURIComponent(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function safeBase64Decode(value: string): string {
  try {
    if (typeof window !== 'undefined' && (window as any).atob) {
      return (window as any).atob(value);
    }
    // Node/SSR
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    return Buffer.from(value, 'base64').toString('utf-8');
  } catch {
    return value;
  }
}

function normalizeSelfPayload(anyData: any): SelfProofPayload | null {
  if (!anyData || typeof anyData !== 'object') return null;
  // Direct match
  if (anyData.proof && anyData.publicSignals && anyData.commitment) {
    return {
      proof: anyData.proof as `0x${string}`,
      publicSignals: (anyData.publicSignals as unknown[]).map(String),
      commitment: anyData.commitment as `0x${string}`,
      attributeSetId: Number(anyData.attributeSetId ?? 1)
    };
  }
  // Nested formats (e.g., { data: {...} })
  const inner = anyData.data || anyData.payload || anyData.result || null;
  if (inner && inner.proof && inner.publicSignals && inner.commitment) {
    return {
      proof: inner.proof as `0x${string}`,
      publicSignals: (inner.publicSignals as unknown[]).map(String),
      commitment: inner.commitment as `0x${string}`,
      attributeSetId: Number(inner.attributeSetId ?? 1)
    };
  }
  // Unsupported (token-based or server-side verification flow). Return null to rely on backend (not used here)
  return null;
}

export function toRegistryArgs(payload: SelfProofPayload | null) {
  if (!payload) {
    return [
      '0x',
      [1n],
      '0x0000000000000000000000000000000000000000000000000000000000000000' as `0x${string}`,
      1n
    ] as const;
  }
  return [
    payload.proof,
    payload.publicSignals.map((x) => BigInt(x)),
    payload.commitment,
    BigInt(payload.attributeSetId)
  ] as const;
}

export function toHubArgs(payload: any): readonly [`0x${string}`, `0x${string}`] | null {
  if (!payload || typeof payload !== 'object') return null;
  // Expect hex strings under keys proofPayload and userContextData
  const proofPayload = (payload.proofPayload || payload.proof_payload || null) as string | null;
  const userContextData = (payload.userContextData || payload.user_context_data || null) as string | null;
  if (
    proofPayload && userContextData &&
    /^0x[0-9a-fA-F]*$/.test(proofPayload) &&
    /^0x[0-9a-fA-F]*$/.test(userContextData)
  ) {
    return [proofPayload as `0x${string}`, userContextData as `0x${string}`] as const;
  }
  return null;
}

