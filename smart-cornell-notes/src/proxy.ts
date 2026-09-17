import { clerkMiddleware } from "@clerk/nextjs/server";

// Pages and route handlers enforce their own resource-specific checks.
// This avoids redirecting a signed-in dashboard's JSON fetches through a browser handshake.
export default clerkMiddleware();

export const config = {
  matcher: [
    "/((?!supercharged_burnout\\.mp3$|_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
    "/__clerk/:path*",
  ],
};
