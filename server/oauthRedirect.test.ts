import { describe, expect, it } from "vitest";
import { normalizeOAuthNavigationUrl, normalizeOAuthOrigin } from "@shared/oauthRedirect";

describe("normalizeOAuthOrigin", () => {
  it("önizleme hostu sonundaki DNS noktasını OAuth izin listesi biçimine çevirir", () => {
    expect(normalizeOAuthOrigin("https://3000-ihand7zkasd8fm5q2qojx-455df3b5.sg1.manus.computer.")).toBe(
      "https://3000-ihand7zkasd8fm5q2qojx-455df3b5.sg1.manus.computer",
    );
  });

  it("normal kökenin şemasını, hostunu ve portunu korur", () => {
    expect(normalizeOAuthOrigin("https://bitcolosia-hnvk4zxa.manus.space")).toBe("https://bitcolosia-hnvk4zxa.manus.space");
    expect(normalizeOAuthOrigin("http://localhost:3000")).toBe("http://localhost:3000");
  });

  it("girişten önce tam sayfa adresindeki son noktayı kaldırır ve yol ile sorguyu korur", () => {
    expect(normalizeOAuthNavigationUrl("https://preview.manus.computer./haber-odalari/reserve?from=login")).toBe(
      "https://preview.manus.computer/haber-odalari/reserve?from=login",
    );
  });
});
