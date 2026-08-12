import { createHash } from "node:crypto";
import { isIP } from "node:net";

export const RESEARCH_POLICY_VERSION = "v2";
export const RESEARCH_MAX_PER_SECTOR = 2;
export const RESEARCH_FRESHNESS_HOURS = 48;

export type ResearchTier = "official" | "verified_news" | "social_signal";
export type ResearchRejectionReason =
  | "invalid_url"
  | "unsupported_protocol"
  | "private_host"
  | "untrusted_domain"
  | "stale"
  | "duplicate"
  | "sector_quota"
  | "invalid_payload"
  | "fetch_failed";

const TRUSTED_DOMAINS: Record<ResearchTier, readonly string[]> = {
  official: [
    "bitcoin.org", "bitcoincore.org", "ethereum.org", "solana.com", "chain.link", "aave.com", "uniswap.org",
    "avalanche.org", "polygon.technology", "arbitrum.io", "optimism.io", "near.org", "cosmos.network", "osmosis.zone",
    "sui.io", "aptos.dev", "starknet.io", "ripple.com", "stellar.org", "circle.com", "makerdao.com", "ondo.finance",
    "filecoin.io", "arweave.org", "storj.io", "oasisprotocol.org", "secret.network", "monero.org", "zcashcommunity.com",
    "fetch.ai", "rendernetwork.com", "bittensor.com", "thegraph.com", "decentraland.org", "sandbox.game", "axieinfinity.com",
    "immutable.com", "gala.com", "flow.com", "enjin.io",
  ],
  verified_news: [
    "reuters.com", "bloomberg.com", "ft.com", "coindesk.com", "theblock.co", "blockworks.co", "decrypt.co", "dlnews.com", "cointelegraph.com",
  ],
  social_signal: ["x.com", "twitter.com", "reddit.com", "discord.com", "t.me"],
};

function isPrivateIpv4(host: string) {
  const [first, second] = host.split(".").map(Number);
  return first === 10 || first === 127 || first === 0 || first === 169 && second === 254 || first === 172 && second >= 16 && second <= 31 || first === 192 && second === 168;
}

function isPrivateHost(host: string) {
  const normalized = host.toLowerCase().replace(/^\[|\]$/g, "");
  if (["localhost", "metadata.google.internal", "host.docker.internal"].includes(normalized) || normalized.endsWith(".local")) return true;
  if (isIP(normalized) === 4) return isPrivateIpv4(normalized);
  if (isIP(normalized) === 6) return normalized === "::1" || normalized.startsWith("fe80:") || normalized.startsWith("fc") || normalized.startsWith("fd");
  return false;
}

function hostMatches(host: string, domain: string) {
  return host === domain || host.endsWith(`.${domain}`);
}

export function trustedSourceTier(sourceUrl: string): { ok: true; host: string; tier: ResearchTier } | { ok: false; reason: ResearchRejectionReason; details: string; host?: string } {
  let parsed: URL;
  try {
    parsed = new URL(sourceUrl);
  } catch {
    return { ok: false, reason: "invalid_url", details: "URL ayrıştırılamadı." };
  }
  if (parsed.protocol !== "https:") return { ok: false, reason: "unsupported_protocol", details: "Yalnızca HTTPS kaynakları kabul edilir.", host: parsed.hostname };
  const host = parsed.hostname.toLowerCase();
  if (isPrivateHost(host)) return { ok: false, reason: "private_host", details: "Özel ağ veya yerel adres reddedildi.", host };
  for (const [tier, domains] of Object.entries(TRUSTED_DOMAINS) as Array<[ResearchTier, readonly string[]]>) {
    if (domains.some(domain => hostMatches(host, domain))) return { ok: true, host, tier };
  }
  return { ok: false, reason: "untrusted_domain", details: "Alan adı kaynak güven politikasında yok.", host };
}

export function parseFreshPublishedAt(value: string | Date | undefined, now = new Date(), freshnessHours = RESEARCH_FRESHNESS_HOURS): { ok: true; publishedAt: Date } | { ok: false; reason: ResearchRejectionReason; details: string } {
  if (!value) return { ok: false, reason: "invalid_payload", details: "Yayın zamanı zorunludur." };
  const publishedAt = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(publishedAt.getTime())) return { ok: false, reason: "invalid_payload", details: "Yayın zamanı geçerli ISO tarih biçiminde değil." };
  if (publishedAt.getTime() > now.getTime() + 5 * 60_000) return { ok: false, reason: "invalid_payload", details: "Yayın zamanı gelecekte olamaz." };
  if (now.getTime() - publishedAt.getTime() > freshnessHours * 60 * 60_000) return { ok: false, reason: "stale", details: `${freshnessHours} saatlik güncellik penceresinin dışında.` };
  return { ok: true, publishedAt };
}

export function createResearchContentHash(input: { sourceUrl: string; sourceTitle: string; body: string; publishedAt: Date }) {
  const normalized = [input.sourceUrl.trim().toLowerCase(), input.sourceTitle.trim().toLowerCase(), input.body.replace(/\s+/g, " ").trim().toLowerCase(), input.publishedAt.toISOString()].join("\n");
  return createHash("sha256").update(normalized).digest("hex");
}

export function validateResearchCandidate(input: { sourceUrl?: string; sourceTitle?: string; body: string; sourceTier: ResearchTier; publishedAt?: string | Date }, options: { now?: Date; freshnessHours?: number } = {}) {
  if (!input.sourceUrl || !input.sourceTitle?.trim() || input.body.trim().length < 12) {
    return { ok: false as const, reason: "invalid_payload" as const, details: "URL, başlık ve en az 12 karakterlik not zorunludur." };
  }
  const trust = trustedSourceTier(input.sourceUrl);
  if (!trust.ok) return trust;
  if (trust.tier !== input.sourceTier) return { ok: false as const, reason: "invalid_payload" as const, details: `Kaynak etiketi ${input.sourceTier}, alan adı politikası ise ${trust.tier} döndürüyor.`, host: trust.host };
  const freshness = parseFreshPublishedAt(input.publishedAt, options.now, options.freshnessHours);
  if (!freshness.ok) return freshness;
  return {
    ok: true as const,
    host: trust.host,
    sourceTier: trust.tier,
    publishedAt: freshness.publishedAt,
    contentHash: createResearchContentHash({ sourceUrl: input.sourceUrl, sourceTitle: input.sourceTitle, body: input.body, publishedAt: freshness.publishedAt }),
  };
}
