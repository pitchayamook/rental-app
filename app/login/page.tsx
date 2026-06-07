"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    const { error } =
      mode === "signin"
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({ email, password });
    setBusy(false);
    if (error) {
      setMsg(error.message);
      return;
    }
    router.push("/");
    router.refresh();
  }

  return (
    <main className="flex min-h-dvh items-center justify-center p-5">
      <form
        onSubmit={submit}
        className="w-full max-w-sm rounded-3xl bg-white p-8 shadow-xl"
      >
        <h1 className="text-center text-2xl font-bold tracking-tight">MyRoom</h1>
        <p className="mb-6 text-center text-sm text-neutral-500">
          {mode === "signin" ? "เข้าสู่ระบบ" : "สร้างบัญชีใหม่"}
        </p>

        {msg && (
          <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
            {msg}
          </p>
        )}

        <input
          type="email"
          required
          placeholder="you@example.com"
          autoComplete="username"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="mb-3 w-full rounded-xl bg-neutral-100 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-500"
        />
        <input
          type="password"
          required
          minLength={6}
          placeholder="รหัสผ่าน (≥ 6 ตัว)"
          autoComplete={mode === "signin" ? "current-password" : "new-password"}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="mb-4 w-full rounded-xl bg-neutral-100 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-xl bg-blue-600 py-3 text-sm font-semibold text-white disabled:opacity-50"
        >
          {busy
            ? "กำลังดำเนินการ…"
            : mode === "signin"
              ? "เข้าสู่ระบบ"
              : "สร้างบัญชี"}
        </button>

        <p className="mt-4 text-center text-sm text-neutral-500">
          {mode === "signin" ? "ยังไม่มีบัญชี? " : "มีบัญชีแล้ว? "}
          <button
            type="button"
            onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
            className="font-semibold text-blue-600"
          >
            {mode === "signin" ? "สร้างบัญชีใหม่" : "เข้าสู่ระบบ"}
          </button>
        </p>
      </form>
    </main>
  );
}
