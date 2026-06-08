"use client";

import { useEffect } from "react";

export function PrintTrigger() {
  useEffect(() => {
    // รอฟอนต์/เลย์เอาต์พร้อมก่อนสั่งพิมพ์
    const t = setTimeout(() => window.print(), 500);
    return () => clearTimeout(t);
  }, []);
  return null;
}
