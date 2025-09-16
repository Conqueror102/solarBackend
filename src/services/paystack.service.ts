

const BASE = "https://api.paystack.co";


const SECRET = process.env.PAYSTACK_SECRET;
if (!SECRET) {
  throw new Error("PAYSTACK_SECRET is not set");
}
const AUTH = `Bearer ${SECRET}`;

type PaystackEnvelope<T = unknown> = {
  status: boolean;
  message: string;
  data: T;
};

async function api<T = unknown>(path: string, init: RequestInit = {}): Promise<PaystackEnvelope<T>> {
  // Build headers explicitly to satisfy RequestInit types
  const headers: HeadersInit = {
    Authorization: AUTH,
    "Content-Type": "application/json",
    ...(init.headers as Record<string, string> | undefined),
  };

  const res = await fetch(`${BASE}${path}`, { ...init, headers });
  const data = (await res.json().catch(() => ({}))) as Partial<PaystackEnvelope<T>>;

  if (!res.ok || data?.status === false) {
    throw new Error((data?.message as string) || `Paystack error (${res.status})`);
  }

  // data.status is true here (or res.ok); cast to envelope
  return data as PaystackEnvelope<T>;
}

export function initialize(body: {
  email: string;
  amount: number;             // kobo
  currency?: "NGN" | "GHS" | "USD";
  metadata?: Record<string, unknown>;
  callback_url?: string;
}) {
  return api<{
    access_code: string;
    authorization_url: string;
    reference: string;
  }>("/transaction/initialize", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function verify(reference: string) {
  return api<any>(`/transaction/verify/${reference}`, { method: "GET" });
}
