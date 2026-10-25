import { currentUser } from "@/server/auth";
import { backendStatus } from "@/server/db";
import { exportAccountData } from "@/server/account";

// Data export (GDPR Art. 20): the signed-in customer's data as a JSON download. Never cached.
export async function GET() {
  if (backendStatus()) return new Response("Not available", { status: 503 });
  const user = await currentUser();
  if (!user) return new Response("Not signed in", { status: 401 });
  const data = await exportAccountData(user.id);
  return new Response(JSON.stringify(data, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="gethsemane-account-${new Date().toISOString().slice(0, 10)}.json"`,
      "Cache-Control": "no-store",
    },
  });
}
