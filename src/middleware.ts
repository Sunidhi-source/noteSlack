import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

const isProtectedRoute = createRouteMatcher([
  "/workspace(.*)",
  "/api/workspace(.*)",
  "/api/channels(.*)",
  "/api/documents(.*)",
  "/api/dm(.*)",
  "/api/search(.*)",
  "/api/notification(.*)",
  "/api/ai(.*)",
]);

export default clerkMiddleware(async (auth, req) => {
  if (isProtectedRoute(req)) {
    await auth.protect();
  }

  const session = await auth();
  if (session.userId && req.nextUrl.pathname === "/") {
    return NextResponse.redirect(new URL("/workspace", req.url));
  }
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
