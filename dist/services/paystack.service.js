const BASE = "https://api.paystack.co";
const SECRET = process.env.PAYSTACK_SECRET;
if (!SECRET) {
    throw new Error("PAYSTACK_SECRET is not set");
}
const AUTH = `Bearer ${SECRET}`;
async function api(path, init = {}) {
    // Build headers explicitly to satisfy RequestInit types
    const headers = {
        Authorization: AUTH,
        "Content-Type": "application/json",
        ...init.headers,
    };
    const res = await fetch(`${BASE}${path}`, { ...init, headers });
    const data = (await res.json().catch(() => ({})));
    if (!res.ok || data?.status === false) {
        throw new Error(data?.message || `Paystack error (${res.status})`);
    }
    // data.status is true here (or res.ok); cast to envelope
    return data;
}
export function initialize(body) {
    return api("/transaction/initialize", {
        method: "POST",
        body: JSON.stringify(body),
    });
}
export function verify(reference) {
    return api(`/transaction/verify/${reference}`, { method: "GET" });
}
