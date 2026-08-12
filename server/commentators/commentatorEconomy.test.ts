import { describe, expect, it } from "vitest";
import { calculateReservoirCredits, forecastSlotCount, scoreSectorAward } from "./commentatorEconomy";

describe("forecast slot allocation", () => {
  it("uses only the sector's available candidates up to the four-rank maximum", () => {
    expect(forecastSlotCount(0)).toBe(0);
    expect(forecastSlotCount(1)).toBe(1);
    expect(forecastSlotCount(3)).toBe(3);
    expect(forecastSlotCount(4)).toBe(4);
    expect(forecastSlotCount(99)).toBe(4);
  });
});

describe("commentator award scoring", () => {
  it("gives the commentator a gold star only when the rank-1 pick is the sector winner", () => {
    const result = scoreSectorAward(
      [{ reportIndex: 1, usdPrice: 10 }, { reportIndex: 2, usdPrice: 5 }, { reportIndex: 3, usdPrice: 2 }],
      [{ reportIndex: 1, usdPrice: 16 }, { reportIndex: 2, usdPrice: 9 }, { reportIndex: 3, usdPrice: 3 }],
      [{ reportIndex: 1, forecastRank: 1, lockedUsdPrice: 10 }, { reportIndex: 2, forecastRank: 2, lockedUsdPrice: 5 }],
    );

    expect(result).toMatchObject({
      actualWinnerReportIndex: 1,
      actualWinnerDeltaLitres: 6,
      winningForecastRank: 1,
      silverMedalAwarded: true,
      goldStarAwarded: true,
      predictionScore: 4,
      status: "awarded",
    });
  });

  it("does not award a medal or star when every sector asset is flat or negative", () => {
    const result = scoreSectorAward(
      [{ reportIndex: 1, usdPrice: 10 }, { reportIndex: 2, usdPrice: 8 }],
      [{ reportIndex: 1, usdPrice: 10 }, { reportIndex: 2, usdPrice: 7 }],
      [{ reportIndex: 1, forecastRank: 1, lockedUsdPrice: 10 }, { reportIndex: 2, forecastRank: 2, lockedUsdPrice: 8 }],
    );

    expect(result).toMatchObject({ actualWinnerReportIndex: null, silverMedalAwarded: false, goldStarAwarded: false, status: "no_positive_result" });
  });
});

describe("water reservoir credits", () => {
  it("credits only verified gains above 10 L and applies asset then sector caps by forecast rank", () => {
    const credits = calculateReservoirCredits(
      [
        { reportIndex: 1, forecastRank: 1, lockedUsdPrice: 0 },
        { reportIndex: 2, forecastRank: 2, lockedUsdPrice: 0 },
        { reportIndex: 3, forecastRank: 3, lockedUsdPrice: 0 },
        { reportIndex: 4, forecastRank: 4, lockedUsdPrice: 0 },
      ],
      [
        { reportIndex: 1, usdPrice: 150 },
        { reportIndex: 2, usdPrice: 150 },
        { reportIndex: 3, usdPrice: 100 },
        { reportIndex: 4, usdPrice: 100 },
      ],
    );

    expect(credits.map(credit => credit.verifiedSurplusLitres)).toEqual([140, 140, 90, 90]);
    expect(credits.map(credit => credit.creditedLitres)).toEqual([100, 100, 50, 0]);
    expect(credits.reduce((sum, credit) => sum + credit.creditedLitres, 0)).toBe(250);
  });
});
