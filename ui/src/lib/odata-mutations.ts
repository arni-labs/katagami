import "server-only";

const API_BASE = process.env.NEXT_PUBLIC_TEMPER_API_URL || "http://localhost:3500";
const TENANT = process.env.NEXT_PUBLIC_TEMPER_TENANT || "default";
const API_KEY = process.env.TEMPER_API_KEY || "";

const headers: Record<string, string> = {
  "Content-Type": "application/json",
  "X-Tenant-Id": TENANT,
  ...(API_KEY ? { Authorization: `Bearer ${API_KEY}` } : {}),
};

export async function dispatchAction(
  entitySet: string,
  id: string,
  action: string,
  params: Record<string, string | number | boolean>,
): Promise<void> {
  const res = await fetch(
    `${API_BASE}/tdata/${entitySet}('${id}')/Temper.${action}`,
    {
      method: "POST",
      headers,
      body: JSON.stringify(params),
    },
  );
  if (!res.ok) {
    throw new Error(`Action ${action} failed ${res.status}: ${await res.text()}`);
  }
}

export async function deleteEntity(
  entitySet: string,
  id: string,
): Promise<void> {
  const res = await fetch(`${API_BASE}/tdata/${entitySet}('${id}')`, {
    method: "DELETE",
    headers,
  });
  if (!res.ok) {
    throw new Error(`Delete failed ${res.status}: ${await res.text()}`);
  }
}
