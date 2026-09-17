import { clerkMiddleware } from "@clerk/nextjs/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import type { NextFetchEvent, NextRequest } from "next/server";

const clerk = clerkMiddleware();
let reportedRuntime = false;

function reportAuthRuntime() {
  if (reportedRuntime) return;
  reportedRuntime = true;

  let cloudflareContextAvailable = false;
  let bindingSecretPresent = false;
  let bindingSecretIsString = false;
  try {
    const { env } = getCloudflareContext();
    const bindings = env as unknown as Record<string, unknown>;
    cloudflareContextAvailable = true;
    bindingSecretPresent = Boolean(bindings.CLERK_SECRET_KEY);
    bindingSecretIsString = typeof bindings.CLERK_SECRET_KEY === "string";
  } catch {
    // A Cloudflare request context is not available under ordinary next dev.
  }

  // Temporary diagnostic: never log values, lengths, headers, or cookies.
  console.info("[auth-runtime-v1]", {
    cloudflareContextAvailable,
    bindingSecretPresent,
    bindingSecretIsString,
    processSecretPresent: Boolean(process.env.CLERK_SECRET_KEY),
  });
}

// Pages and route handlers enforce their own resource-specific checks.
// This avoids redirecting a signed-in dashboard's JSON fetches through a browser handshake.
export default async function proxy(request: NextRequest, event: NextFetchEvent) {
  reportAuthRuntime();
  return clerk(request, event);
}

export const config = {
  matcher: [
    "/((?!supercharged_burnout\\.mp3$|_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
    "/__clerk/:path*",
  ],
};
