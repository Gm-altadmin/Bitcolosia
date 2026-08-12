/**
 * DNS'te eşdeğer olan ancak OAuth izin listelerinde ayrı görülebilen sona eklenmiş
 * alan adı noktasını kaldırır. Şema, port ve köken değiştirilemez.
 */
export function normalizeOAuthOrigin(origin: string): string {
  const url = new URL(origin);
  url.hostname = url.hostname.replace(/\.+$/, "");
  return url.origin;
}

export function normalizeOAuthNavigationUrl(href: string): string {
  const url = new URL(href);
  url.hostname = url.hostname.replace(/\.+$/, "");
  return url.toString();
}
