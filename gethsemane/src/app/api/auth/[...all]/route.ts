import { toNextJsHandler } from "better-auth/next-js";
import { backendStatus } from "@/server/db";
import { getAuth } from "@/server/auth";

// Better Auth's endpoints (email verification and password reset links land here). The forms on the site use
// server actions (src/app/[locale]/(account)/actions.ts) instead of calling these from the browser.
async function handle(request: Request, method: "GET" | "POST") {
  if (backendStatus()) return new Response("Not available", { status: 503 });
  const handler = toNextJsHandler(await getAuth());
  return handler[method](request);
}

export const GET = (request: Request) => handle(request, "GET");
export const POST = (request: Request) => handle(request, "POST");
