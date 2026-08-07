import { db } from "./firebaseAdmin";

type Bucket = { count: number; firstTs: number; lockedUntil?: number };
const buckets = new Map<string, Bucket>();

const WINDOW_MS = 60 * 60 * 1000; // 1 hour
const IP_MAX = 60; // max attempts per IP per window
const ID_MAX = 10; // max attempts per identifier (phone) per window
const RATE_LIMIT_COLLECTION = "rateLimits";

function now() {
  return Date.now();
}

function makeKey(prefix: string, kind: "ip" | "id", value: string) {
  return `${prefix}:${kind}:${value}`;
}

function sanitizeIp(value: string | null): string {
  const candidate = String(value || "").split(",")[0].trim();
  if (!candidate) return "unknown";
  const ipv4 = /^\d{1,3}(?:\.\d{1,3}){3}$/;
  const ipv6 = /^[0-9a-fA-F:.]+$/;
  if (ipv4.test(candidate)) {
    return candidate
      .split(".")
      .map((part) => Number(part))
      .every((num) => num >= 0 && num <= 255)
      ? candidate
      : "unknown";
  }
  if (ipv6.test(candidate)) {
    return candidate;
  }
  return "unknown";
}

export function getRequestIp(request: Request): string {
  const trustProxy = process.env.TRUST_PROXY === "true";
  const xRealIp = request.headers.get("x-real-ip");
  const xForwardedFor = request.headers.get("x-forwarded-for");

  if (trustProxy && xForwardedFor) {
    return sanitizeIp(xForwardedFor);
  }
  if (xRealIp) {
    return sanitizeIp(xRealIp);
  }
  if (xForwardedFor) {
    return sanitizeIp(xForwardedFor);
  }
  return "unknown";
}

function getMemoryBucket(key: string) {
  let bucket = buckets.get(key);
  if (!bucket) {
    bucket = { count: 0, firstTs: now() };
    buckets.set(key, bucket);
  }
  return bucket;
}

async function getFirestoreBucket(key: string): Promise<Bucket> {
  if (!db) {
    return getMemoryBucket(key);
  }
  try {
    const docRef = db.collection(RATE_LIMIT_COLLECTION).doc(key);
    const snap = await docRef.get();
    if (!snap.exists) {
      return { count: 0, firstTs: now() };
    }
    const data = snap.data() || {};
    return {
      count: Number(data.count || 0),
      firstTs: Number(data.firstTs || now()),
      lockedUntil: data.lockedUntil ? Number(data.lockedUntil) : undefined,
    };
  } catch (error) {
    console.warn("Rate limiter Firestore lookup failed, falling back to in-memory store.", error);
    return getMemoryBucket(key);
  }
}

async function setFirestoreBucket(key: string, bucket: Bucket) {
  if (!db) {
    buckets.set(key, bucket);
    return;
  }
  try {
    await db.collection(RATE_LIMIT_COLLECTION).doc(key).set(
      {
        count: bucket.count,
        firstTs: bucket.firstTs,
        lockedUntil: bucket.lockedUntil || null,
      },
      { merge: true }
    );
  } catch (error) {
    console.warn("Rate limiter Firestore write failed, falling back to in-memory store.", error);
    buckets.set(key, bucket);
  }
}

async function deleteFirestoreBucket(key: string) {
  if (!db) {
    buckets.delete(key);
    return;
  }
  try {
    await db.collection(RATE_LIMIT_COLLECTION).doc(key).delete();
  } catch (error) {
    console.warn("Rate limiter Firestore delete failed, falling back to in-memory cleanup.", error);
    buckets.delete(key);
  }
}

function computeLockout(count: number) {
  const base = 15 * 60 * 1000;
  const factor = Math.floor(count / 5);
  return base * Math.pow(2, Math.min(factor, 5));
}

function resetBucketIfExpired(bucket: Bucket) {
  if (now() - bucket.firstTs > WINDOW_MS) {
    bucket.count = 0;
    bucket.firstTs = now();
    delete bucket.lockedUntil;
  }
}

export async function checkLimit(action: string, ip: string, identifier?: string) {
  const ipKey = makeKey(action, "ip", ip || "unknown");
  const ipBucket = await getFirestoreBucket(ipKey);
  if (ipBucket.lockedUntil && ipBucket.lockedUntil > now()) {
    return { allowed: false, retryAfter: Math.ceil((ipBucket.lockedUntil - now()) / 1000) };
  }

  resetBucketIfExpired(ipBucket);
  if (ipBucket.count >= IP_MAX) {
    ipBucket.lockedUntil = now() + computeLockout(ipBucket.count);
    await setFirestoreBucket(ipKey, ipBucket);
    return { allowed: false, retryAfter: Math.ceil((ipBucket.lockedUntil - now()) / 1000) };
  }

  if (identifier) {
    const idKey = makeKey(action, "id", identifier);
    const idBucket = await getFirestoreBucket(idKey);
    if (idBucket.lockedUntil && idBucket.lockedUntil > now()) {
      return { allowed: false, retryAfter: Math.ceil((idBucket.lockedUntil - now()) / 1000) };
    }
    resetBucketIfExpired(idBucket);
    if (idBucket.count >= ID_MAX) {
      idBucket.lockedUntil = now() + computeLockout(idBucket.count);
      await setFirestoreBucket(idKey, idBucket);
      return { allowed: false, retryAfter: Math.ceil((idBucket.lockedUntil - now()) / 1000) };
    }
  }

  return { allowed: true };
}

async function incrementBucket(key: string, limit: number) {
  const bucket = await getFirestoreBucket(key);
  resetBucketIfExpired(bucket);
  bucket.count += 1;
  if (bucket.count >= limit) {
    bucket.lockedUntil = now() + computeLockout(bucket.count);
  }
  await setFirestoreBucket(key, bucket);
}

export async function recordFailure(action: string, ip: string, identifier?: string) {
  const ipKey = makeKey(action, "ip", ip || "unknown");
  await incrementBucket(ipKey, IP_MAX);
  if (identifier) {
    const idKey = makeKey(action, "id", identifier);
    await incrementBucket(idKey, ID_MAX);
  }
}

export async function recordSuccess(action: string, ip: string, identifier?: string) {
  const ipKey = makeKey(action, "ip", ip || "unknown");
  await deleteFirestoreBucket(ipKey);
  if (identifier) {
    const idKey = makeKey(action, "id", identifier);
    await deleteFirestoreBucket(idKey);
  }
}
