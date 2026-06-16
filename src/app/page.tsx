"use client";

import Link from "next/link";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function Home() {
  const [mostraDemo, setMostraDemo] = useState(false);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function entrarComGoogle() {
    setCarregando(true);
    setErro(null);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/api/auth/callback`,
        queryParams: {
          hd: "liquidz.com.br", // dica para o Google pré-selecionar o domínio
        },
      },
    });
    if (error) {
      setErro("Erro ao conectar com o Google. Tente novamente.");
      setCarregando(false);
    }
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6 bg-lz-bg">
      <div className="mb-10 text-center">
        <span className="inline-block bg-lz-black text-lz-green font-black text-2xl tracking-widest px-4 py-1 rounded-sm mb-4">
          LIQUIDZ
        </span>
        <h1 className="text-3xl font-black text-lz-black">Controle de KM</h1>
        <p className="text-gray-500 mt-2 text-sm">Acesse com sua conta corporativa</p>
      </div>

      <div className="flex flex-col gap-4 w-full max-w-xs">
        <button
          onClick={entrarComGoogle}
          disabled={carregando}
          className="bg-white border-2 border-gray-200 text-lz-black font-bold py-4 rounded-full text-base flex items-center justify-center gap-3 hover:border-gray-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {carregando ? (
            <span className="w-5 h-5 border-2 border-gray-300 border-t-lz-black rounded-full animate-spin" />
          ) : (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
          )}
          {carregando ? "Conectando..." : "Entrar com Google"}
        </button>

        {erro && (
          <p className="text-center text-xs text-red-500">{erro}</p>
        )}

        <p className="text-center text-xs text-gray-400">
          Apenas emails <strong>@liquidz.com.br</strong>
        </p>

        <div className="flex items-center gap-3 my-2">
          <div className="flex-1 h-px bg-gray-200" />
          <span className="text-xs text-gray-400">desenvolvimento</span>
          <div className="flex-1 h-px bg-gray-200" />
        </div>

        {!mostraDemo ? (
          <button
            onClick={() => setMostraDemo(true)}
            className="text-center text-xs text-gray-400 underline underline-offset-2"
          >
            Acessar em modo demonstração
          </button>
        ) : (
          <div className="flex flex-col gap-3">
            <p className="text-xs text-center text-gray-400">Escolha o perfil para testar:</p>
            <Link
              href="/rep"
              className="bg-lz-green text-lz-black font-bold text-center py-3 rounded-full text-sm hover:opacity-90 transition-opacity"
            >
              Entrar como Representante
            </Link>
            <Link
              href="/rh"
              className="bg-lz-black text-lz-green font-bold text-center py-3 rounded-full text-sm hover:opacity-90 transition-opacity"
            >
              Entrar como RH
            </Link>
          </div>
        )}
      </div>

      <p className="mt-10 text-xs text-gray-400">Every drop counts.</p>
    </main>
  );
}
