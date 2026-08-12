import { resetParcelsToBalancedEconomy } from "../server/parcels/parcelService.ts";

const result = await resetParcelsToBalancedEconomy();
console.log(JSON.stringify({ model: "1000L-plus-daily-price-difference-capped-10L", ...result }, null, 2));
