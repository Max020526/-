import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/proxy";

export async function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    "/admin/:path*",
    "/dashboard/:path*",
    "/warehouse/:path*",
    "/inbound/:path*",
    "/products/:path*",
    "/inventory/:path*",
    "/catalog/:path*",
    "/me/:path*",
    "/settings/:path*",
  ],
};
