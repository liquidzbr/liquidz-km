import Link from "next/link";

export default function RhLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-lz-bg flex flex-col">
      <header className="bg-lz-black px-6 py-4 flex items-center justify-between">
        <Link href="/rh" className="flex items-center">
          <img src="/logo-branco.png" alt="LIQUIDZ" className="h-7 w-auto" />
        </Link>
        <span className="text-white text-xs opacity-60">Painel Geral</span>
      </header>
      <main className="flex-1 px-4 py-6 max-w-2xl mx-auto w-full">{children}</main>
    </div>
  );
}
