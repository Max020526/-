import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { allowedInternalRoles, normalizeInternalRole } from "@/lib/auth/roles";
import type { Database } from "@/types/database";
import { getPublicSupabaseConfig } from "./config";

function redirectToLogin(request: NextRequest) {
  const url = request.nextUrl.clone();
  url.pathname = "/login";
  url.search = "";
  url.searchParams.set("next", `${request.nextUrl.pathname}${request.nextUrl.search}`);
  return withPrivateCacheHeaders(NextResponse.redirect(url));
}

function withPrivateCacheHeaders<T extends NextResponse>(response: T) {
  response.headers.set("Cache-Control", "private, no-cache, no-store, must-revalidate, max-age=0");
  response.headers.set("Pragma", "no-cache");
  response.headers.set("Expires", "0");
  return response;
}

export async function updateSession(request: NextRequest) {
  const roles = allowedInternalRoles(request.nextUrl.pathname);
  if (!roles) return NextResponse.next({ request });

  const config = getPublicSupabaseConfig();
  if (!config) return redirectToLogin(request);

  let response = withPrivateCacheHeaders(NextResponse.next({ request }));
  const supabase = createServerClient<Database>(config.url, config.publishableKey, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(cookiesToSet, headersToSet) {
        for (const { name, value } of cookiesToSet) request.cookies.set(name, value);
        response = withPrivateCacheHeaders(NextResponse.next({ request }));
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
        for (const [name, value] of Object.entries(headersToSet)) {
          response.headers.set(name, value);
        }
      },
    },
  });

  const { data: claims, error: claimsError } = await supabase.auth.getClaims();
  const userId = claims?.claims?.sub;
  if (claimsError || !userId) return redirectToLogin(request);

  const { data: profile } = await supabase
    .from("profiles")
    .select("role,is_active")
    .eq("id", userId)
    .maybeSingle();

  const normalizedRole = normalizeInternalRole(profile?.role);
  if (!profile?.is_active || !normalizedRole || !roles.includes(normalizedRole)) {
    const url = request.nextUrl.clone();
    url.pathname = profile?.is_active === false ? "/login" : "/forbidden";
    url.search = "";
    if (profile?.is_active === false) url.searchParams.set("error", "inactive");
    return withPrivateCacheHeaders(NextResponse.redirect(url));
  }

  return response;
}
