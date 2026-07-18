// src/app/api/keep-alive/route.ts
//
// Pings the database with one lightweight real query so Supabase's
// free-tier "pause after 7 days of inactivity" timer never fires.
// This route must NOT require Clerk auth, since the caller is a
// scheduled GitHub Action, not a logged-in user. It works out of the
// box: /api/keep-alive is not listed in proxy.ts's isProtectedRoute
// matcher, so Clerk's middleware never blocks it. No proxy.ts edit
// needed — just don't add "/api/keep-alive" to that list later.

import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = createServerSupabaseClient();

    // A real query against a real table — dashboard visits or plain
    // HTTP pings to a static route do NOT count as "activity" to
    // Supabase; it specifically watches for database queries.
    const { error } = await supabase
      .from("workspaces")
      .select("id", { count: "exact", head: true })
      .limit(1);

    if (error) {
      console.error("[keep-alive] query failed:", error.message);
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: 500 },
      );
    }

    return NextResponse.json({ ok: true, ts: new Date().toISOString() });
  } catch (err) {
    console.error("[keep-alive] unexpected error:", err);
    return NextResponse.json(
      { ok: false, error: "unexpected error" },
      { status: 500 },
    );
  }
}
