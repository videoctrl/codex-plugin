import { isIP } from "node:net";

export function isRemoteReference(value: string) {
  return /^https?:\/\//i.test(value);
}

export function assertSafeRemoteReferenceUrl(value: string) {
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    throw new Error("Reference URL is not valid.");
  }

  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
    throw new Error("Reference URL must use https or http.");
  }

  const host = parsed.hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (host === "localhost" || host === "0.0.0.0" || host.endsWith(".localhost")) {
    throw new Error("Reference URL cannot point to a local address.");
  }

  const ipVersion = isIP(host);
  if (ipVersion === 4 && isPrivateIpv4(host)) {
    throw new Error("Reference URL cannot point to a private address.");
  }
  if (ipVersion === 6 && isPrivateIpv6(host)) {
    throw new Error("Reference URL cannot point to a private address.");
  }

  return parsed.toString();
}

function isPrivateIpv4(host: string) {
  const parts = host.split(".").map((part) => Number(part));
  const [first, second] = parts;
  return (
    first === 10 ||
    first === 127 ||
    first === 0 ||
    (first === 169 && second === 254) ||
    (first === 172 && second >= 16 && second <= 31) ||
    (first === 192 && second === 168)
  );
}

function isPrivateIpv6(host: string) {
  return host === "::1" || host.startsWith("fc") || host.startsWith("fd") || host.startsWith("fe80:");
}
