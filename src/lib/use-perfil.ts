"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { infoAcesso, type AcessoInfo } from "@/lib/acesso";

export type Perfil = AcessoInfo & { email: string };

// Devolve o perfil (papel + área + email) do usuário logado, derivado da allowlist.
// `carregando` é true até a sessão ser resolvida.
export function usePerfil() {
  const [perfil, setPerfil] = useState<Perfil | null>(null);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      const info = infoAcesso(user?.email);
      setPerfil(info && user?.email ? { ...info, email: user.email } : null);
      setCarregando(false);
    });
  }, []);

  return { perfil, carregando };
}
