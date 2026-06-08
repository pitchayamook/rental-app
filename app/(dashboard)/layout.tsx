import { Nav } from "@/components/nav";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-dvh">
      <Nav />
      <main className="pb-20 md:pb-0 md:pl-56">
        <div className="mx-auto max-w-5xl px-4 py-6">{children}</div>
      </main>
    </div>
  );
}
