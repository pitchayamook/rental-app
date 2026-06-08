import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  runtime: "nodejs",
  matcher: [
    // กั้นทุกหน้า ยกเว้น static, รูป, แอปเดิม (/legacy) และ manifest
    "/((?!_next/static|_next/image|favicon.ico|legacy|manifest.webmanifest|icons|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
