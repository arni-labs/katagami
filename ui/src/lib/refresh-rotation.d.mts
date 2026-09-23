export const BUCKET_SECONDS: number;
export const GRACE_MINUTES: number;
export function sha256Hex(input: string): Promise<string>;
export function bucketOf(nowMs: number): number;
export function successorToken(presentedHash: string, bucket: number, secret: string): Promise<string>;
export type Resolved<G> = { kind: "rotate" | "replay"; grant: G; next: string } | { kind: "invalid" };
export function resolveRefresh<G>(a: {
  presented: string;
  nowMs: number;
  secret: string;
  findGrantByHash: (hash: string) => Promise<G | null>;
}): Promise<Resolved<G>>;
export function settleRotation<G>(a: {
  presented: string;
  next: string;
  nowMs: number;
  secret: string;
  findGrantByHash: (hash: string) => Promise<G | null>;
}): Promise<string>;
