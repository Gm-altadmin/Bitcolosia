import { runDailyParcelValuation } from "../server/parcels/parcelService.ts";

const result = await runDailyParcelValuation();
console.log(JSON.stringify({ manual: true, ...result }, null, 2));
