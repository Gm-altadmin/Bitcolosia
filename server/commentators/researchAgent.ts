import { collectGdeltResearch } from "./researchAdapters";
import { addScheduledResearch, ensureCommentatorProgram } from "./commentatorService";
import { commentatorProgramSettings, sectorCommentators } from "../../drizzle/schema";
import { eq } from "drizzle-orm";

export async function runAutomatedResearch(input: { triggerTaskUid?: string; adapter?: string } = {}) {
  const db = await ensureCommentatorProgram();
  const settings = await db.select().from(commentatorProgramSettings).where(eq(commentatorProgramSettings.id, 1)).limit(1);
  const config = settings[0];
  const adapter = input.adapter ?? process.env.RESEARCH_ADAPTER ?? config?.researchAdapter ?? "gdelt";
  if (adapter !== "gdelt") throw new Error(`Otomatik araştırma adapteri desteklenmiyor: ${adapter}`);
  const commentators = await db.select().from(sectorCommentators).where(eq(sectorCommentators.isActive, 1));
  const result = await collectGdeltResearch(
    commentators.map(commentator => commentator.sectorId),
    config?.researchDailyLlmBudget ?? 6,
    config?.researchDailySearchBudget ?? 6,
  );
  const persisted = await addScheduledResearch(result.entries, {
    triggerTaskUid: input.triggerTaskUid,
    adapter,
    candidateCount: result.candidateCount,
    adapterRejections: result.rejections,
    searchCalls: result.searchCalls,
    llmCalls: result.llmCalls,
  });
  return { adapter, ...result, ...persisted };
}
