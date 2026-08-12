import { revalueAllParcelsFromCurrentUsd } from "../server/parcels/parcelService.ts";

const result = await revalueAllParcelsFromCurrentUsd();
console.log(JSON.stringify({ precisionModel: "100L-plus-current-USD", ...result }, null, 2));
