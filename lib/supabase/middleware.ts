import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "@/lib/db/types";
import { getRequiredEnv } from "@/lib/env";

const PROTECTED_PREFIXES = [
  "/dashboard",
  "/cases",
  "/settings",
  "/branding",
  "/billing",
];

const ACTIVE_SUBSCRIPTION_STATUSES = new Set(["trialing", "active"]);

function isProtectedPath(pathname: string) {
  return PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

function isBillingPath(pathname: string) {
  return pathname === "/billing" || pathname.startsWith("/billing/");
}

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({
    request,
  });

  const supabase = createServerClient<Database>(
    getRequiredEnv("NEXT_PUBLIC_SUPABASE_URL"),
    getRequiredEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => {
            request.cookies.set(name, value);
          });

          response = NextResponse.next({
            request,
          });

          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user && isProtectedPath(request.nextUrl.pathname)) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.searchParams.set("next", request.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (user && request.nextUrl.pathname === "/login") {
    const dashboardUrl = request.nextUrl.clone();
    dashboardUrl.pathname = "/dashboard";
    dashboardUrl.search = "";
    return NextResponse.redirect(dashboardUrl);
  }

  if (
    user &&
    isProtectedPath(request.nextUrl.pathname) &&
    !isBillingPath(request.nextUrl.pathname)
  ) {
    const { data: profile } = await supabase
      .from("director_profiles")
      .select("role, subscription_status")
      .eq("director_id", user.id)
      .maybeSingle();

    const isAdmin = profile?.role === "admin";
    const status = profile?.subscription_status ?? null;
    const isActive = status !== null && ACTIVE_SUBSCRIPTION_STATUSES.has(status);

    if (!isAdmin && !isActive) {
      const billingUrl = request.nextUrl.clone();
      billingUrl.pathname = "/billing";
      billingUrl.search = "";
      return NextResponse.redirect(billingUrl);
    }
  }

  return response;
}
