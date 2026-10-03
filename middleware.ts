
import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

const isInvestorPortal = createRouteMatcher(["/investor-portal(.*)"]);
const isIssuerPortal = createRouteMatcher(["/issuer-portal(.*)"]);
const isAuditorPortal = createRouteMatcher(["/auditor-portal(.*)"]);

export default clerkMiddleware(async (auth, req) => {
  const { userId, sessionClaims } = await auth();

  // Redirect to sign in if trying to access protected routes without being logged in
  if (!userId && isInvestorPortal(req)) {
    const signInUrl = new URL("/investor/sign-in", req.url);
    return NextResponse.redirect(signInUrl);
  }

  if (!userId && isIssuerPortal(req)) {
    const signInUrl = new URL("/issuer/sign-in", req.url);
    return NextResponse.redirect(signInUrl);
  }

  if (!userId && isAuditorPortal(req)) {
    const signInUrl = new URL("/auditor/sign-in", req.url);
    return NextResponse.redirect(signInUrl);
  }

  // Handle role boundaries using layouts instead (JWT does not contain publicMetadata by default)

  return NextResponse.next();
});

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for Clerk's auto-proxy path
    "/__clerk/:path*",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
};
