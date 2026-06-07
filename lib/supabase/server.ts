import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";

// Supabase client สำหรับ Server Components / Server Actions / Route Handlers
export async function createClient() {
  const cookieStore = await cookies(); // Next 15: cookies() เป็น async

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(
          cookiesToSet: { name: string; value: string; options: CookieOptions }[],
        ) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // ถูกเรียกจาก Server Component — ปล่อยผ่านได้ เพราะ middleware รีเฟรช session ให้แล้ว
          }
        },
      },
    },
  );
}
