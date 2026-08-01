import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { allowedInternalRoles, isInternalRole } from "@/lib/auth/roles";
import type { Database } from "@/types/database";
import { getPublicSupabaseConfig } from "./config";

function redirectToLogin(request: NextRequest) {
  const url = request.nextUrl.clone();
  url.pathname = "/login";
  url.search = "";
  url.searchParams.set("next", `${request.nextUrl.pathname}${request.nextUrl.search}`);
  return NextResponse.redirect(url);
}

export async function updateSession(request: NextRequest) {
  const roles = allowedInternalRoles(request.nextUrl.pathname);
  if (!roles) return NextResponse.next({ request });

  const config = getPublicSupabaseConfig();
  if (!config) return redirectToLogin(request);

  let response = NextResponse.next({ request });
  const supabase = createServerClient<Database>(config.url, config.publishableKey, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(cookiesToSet) {
        for (const { name, value } of cookiesToSet) request.cookies.set(name, value);
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
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

  if (!profile?.is_active || !isInternalRole(profile.role) || !roles.includes(profile.role)) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    url.searchParams.set("error", profile?.is_active === false ? "inactive" : "forbidden");
    return NextResponse.redirect(url);
  }

  return response;
}
