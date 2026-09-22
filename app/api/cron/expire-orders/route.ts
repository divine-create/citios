import { NextResponse } from "next/server";
import { expirePendingOrders } from "@/lib/actions/expirePendingOrders";

export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get("authorization");
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    await expirePendingOrders();
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Cron failed:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
