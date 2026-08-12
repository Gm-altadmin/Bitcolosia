import { appRouter } from "../server/routers.ts";

const now = new Date();
const caller = appRouter.createCaller({
  user: {
    id: 1,
    openId: "parcel-admin-verification",
    name: "Parcel Admin Verification",
    email: null,
    loginMethod: null,
    role: "admin",
    createdAt: now,
    updatedAt: now,
    lastSignedIn: now,
  },
  req: { headers: {} },
  res: {},
});

const result = await caller.parcels.updateTimezone({ timezone: "Europe/Istanbul" });
console.log(JSON.stringify(result, null, 2));
