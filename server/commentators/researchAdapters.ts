import { ENV } from "../_core/env";
import { invokeLLM, listLLMModels } from "../_core/llm";
import { trustedSourceTier, type ResearchTier } from "./researchTrust";

export type ResearchCandidate = {
  sectorId: string;
  sourceTier: ResearchTier;
  sourceUrl: string;
  sourceTitle: string;
  publishedAt: string;
  body: string;
};

export type AdapterRejection = {
  sectorId: string;
  sourceUrl?: string;
  sourceHost?: string;
  reason: "invalid_url" | "unsupported_protocol" | "private_host" | "untrusted_domain" | "fetch_failed";
  details: string;
};

type GdeltArticle = { title?: string; url?: string; seendate?: string };
type GdeltResponse = { articles?: GdeltArticle[] };

const GDELT_DOC_URL = "https://api.gdeltproject.org/api/v2/doc/doc";
const ADAPTER_TIMEOUT_MS = 8_000;
const MAX_SOURCE_BYTES = 40_000;

const SECTOR_QUERIES: Record<string, string> = {
  reserve: "bitcoin OR digital gold",
  infrastructure: "ethereum OR solana OR smart contract OR layer 1",
  frontier: "crypto AI OR decentralized AI OR blockchain AI",
  liquidity: "tokenization OR RWA OR stablecoin OR institutional crypto",
  archive: "filecoin OR arweave OR decentralized storage OR privacy crypto",
  commons: "GameFi OR NFT gaming OR metaverse OR blockchain gaming",
};

function stripHtml(value: string) {
  return value.replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<style[\s\S]*?<\/style>/gi, " ").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function decodeHtml(value: string) {
  return value.replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">");
}

export function gdeltSeenAt(value: string | undefined) {
  if (!value) return null;
  const compact = value.match(/^(\d{4})(\d{2})(\d{2})T?(\d{2})?(\d{2})?(\d{2})?/);
  if (!compact) return null;
  const [, year, month, day, hour = "00", minute = "00", second = "00"] = compact;
  const parsed = new Date(`${year}-${month}-${day}T${hour}:${minute}:${second}Z`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

async function fetchWithTimeout(url: string, maxBytes = MAX_SOURCE_BYTES) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ADAPTER_TIMEOUT_MS);
  try {
    const response = await fetch(url, { signal: controller.signal, headers: { "user-agent": "BitColosiaResearchBot/1.0 (public-source-validation)" } });
    if (!response.ok) throw new Error(`Kaynak HTTP ${response.status}`);
    const text = await response.text();
    return text.slice(0, maxBytes);
  } finally {
    clearTimeout(timer);
  }
}

async function extractPublicExcerpt(sourceUrl: string, fallbackTitle: string) {
  const trust = trustedSourceTier(sourceUrl);
  if (!trust.ok) throw new Error(`Kaynak URL güven katmanından geçmedi: ${trust.reason}`);
  const html = await fetchWithTimeout(sourceUrl);
  const title = decodeHtml(html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? fallbackTitle).trim().slice(0, 512);
  const description = html.match(/<meta[^>]+(?:name|property)=["'](?:description|og:description)["'][^>]+content=["']([^"']+)["']/i)?.[1]
    ?? html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+(?:name|property)=["'](?:description|og:description)["']/i)?.[1]
    ?? "";
  const excerpt = decodeHtml(stripHtml(description)).slice(0, 2_400);
  if (!excerpt) throw new Error("Kaynakta özetlenebilir kamu metni bulunamadı.");
  const metaPublished = html.match(/<meta[^>]+(?:property|name)=["'](?:article:published_time|date|datePublished)["'][^>]+content=["']([^"']+)["']/i)?.[1];
  const parsedPublished = metaPublished ? new Date(metaPublished) : null;
  return { title: title || fallbackTitle, excerpt, publishedAt: parsedPublished && !Number.isNaN(parsedPublished.getTime()) ? parsedPublished : null };
}

async function conciseResearchNote(input: { sectorId: string; title: string; excerpt: string; sourceUrl: string }) {
  const system = "Yalnızca verilen kaynak başlığı ve alıntısından Türkçe, yatırım tavsiyesi içermeyen 2-4 cümlelik tarafsız bir araştırma notu üret. Kaynakta olmayan iddia, fiyat tahmini veya tavsiye ekleme. JSON olarak sadece {\"body\":\"...\"} döndür.";
  const messages = [
    { role: "system" as const, content: system },
    { role: "user" as const, content: JSON.stringify(input) },
  ];
  let text = "";
  if (ENV.researchLlmApiUrl && ENV.researchLlmApiKey) {
    const endpoint = ENV.researchLlmApiUrl.endsWith("/chat/completions")
      ? ENV.researchLlmApiUrl
      : `${ENV.researchLlmApiUrl.replace(/\/$/, "")}/v1/chat/completions`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), ADAPTER_TIMEOUT_MS);
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        signal: controller.signal,
        headers: { "content-type": "application/json", authorization: `Bearer ${ENV.researchLlmApiKey}` },
        body: JSON.stringify({ model: ENV.researchLlmModel || "gpt-4o-mini", max_tokens: 220, response_format: { type: "json_object" }, messages }),
      });
      if (!response.ok) throw new Error(`Araştırma LLM HTTP ${response.status}`);
      const payload = await response.json() as { choices?: Array<{ message?: { content?: unknown } }> };
      const content = payload.choices?.[0]?.message?.content;
      text = typeof content === "string" ? content : "";
    } finally {
      clearTimeout(timer);
    }
  } else {
    const catalog = await listLLMModels();
    const model = catalog.data.find(item => item.id === "gpt-5-mini")?.id ?? catalog.data[0]?.id;
    if (!model) throw new Error("Araştırma özeti için model bulunamadı.");
    const response = await invokeLLM({ model, maxTokens: 220, response_format: { type: "json_object" }, messages });
    const raw = response.choices[0]?.message.content;
    text = typeof raw === "string" ? raw : "";
  }
  try {
    const parsed = JSON.parse(text) as { body?: unknown };
    if (typeof parsed.body === "string" && parsed.body.trim().length >= 12) return parsed.body.trim().slice(0, 1_600);
  } catch {
    // JSON dışı model yanıtı güvenlik açısından aşağıdaki kaynak alıntısı fallback'ine düşer.
  }
  return `Kaynak başlığı: ${input.title}. Kaynağın kamuya açık özetinde şu ifade yer alıyor: ${input.excerpt}`.slice(0, 1_600);
}

export async function collectGdeltResearch(sectorIds: string[], maxLlmCalls: number, maxSearchCalls = sectorIds.length) {
  const entries: ResearchCandidate[] = [];
  const rejections: AdapterRejection[] = [];
  let searchCalls = 0;
  let llmCalls = 0;
  for (const sectorId of sectorIds) {
    if (searchCalls >= maxSearchCalls) break;
    const query = SECTOR_QUERIES[sectorId];
    if (!query) continue;
    const params = new URLSearchParams({ query, mode: "artlist", format: "json", maxrecords: "8", timespan: "48h", sort: "datedesc" });
    let data: GdeltResponse;
    try {
      searchCalls += 1;
      data = JSON.parse(await fetchWithTimeout(`${GDELT_DOC_URL}?${params.toString()}`, 120_000)) as GdeltResponse;
    } catch (error) {
      rejections.push({ sectorId, reason: "fetch_failed", details: error instanceof Error ? error.message.slice(0, 512) : "GDELT isteği başarısız." });
      continue;
    }
    for (const article of data.articles ?? []) {
      if (entries.some(entry => entry.sectorId === sectorId)) break;
      if (!article.url || !article.title || llmCalls >= maxLlmCalls) continue;
      const trusted = trustedSourceTier(article.url);
      if (!trusted.ok) {
        const host = "host" in trusted && typeof trusted.host === "string" ? trusted.host : undefined;
        const reason = trusted.reason === "unsupported_protocol" || trusted.reason === "private_host" || trusted.reason === "untrusted_domain"
          ? trusted.reason
          : "invalid_url";
        rejections.push({ sectorId, sourceUrl: article.url, sourceHost: host, reason, details: trusted.details });
        continue;
      }
      if (trusted.tier === "social_signal") {
        rejections.push({ sectorId, sourceUrl: article.url, sourceHost: trusted.host, reason: "untrusted_domain", details: "Sosyal sinyal, otomatik doğrulanmış haber özeti için kaynak olmaz." });
        continue;
      }
      try {
        const extracted = await extractPublicExcerpt(article.url, article.title);
        const seenAt = gdeltSeenAt(article.seendate);
        const publishedAt = extracted.publishedAt ?? seenAt;
        if (!publishedAt) continue;
        const body = await conciseResearchNote({ sectorId, title: extracted.title, excerpt: extracted.excerpt, sourceUrl: article.url });
        llmCalls += 1;
        entries.push({ sectorId, sourceTier: trusted.tier, sourceUrl: article.url, sourceTitle: extracted.title, publishedAt: publishedAt.toISOString(), body });
      } catch (error) {
        rejections.push({ sectorId, sourceUrl: article.url, sourceHost: trusted.host, reason: "fetch_failed", details: error instanceof Error ? error.message.slice(0, 512) : "Kaynak metni işlenemedi." });
      }
    }
  }
  return { entries, rejections, candidateCount: entries.length + rejections.length, searchCalls, llmCalls };
}
