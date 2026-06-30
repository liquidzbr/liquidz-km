"use client";

import { createClient } from "@/lib/supabase/client";

export type Representante = {
  id: string;
  nome: string;
  email: string;
  setor: string;
};

export type Reembolso = {
  id: string;
  repId: string;
  mes: string;
  investimentoGasolina: number;
  kmRealizados: number;
};

export type Viagem = {
  id: string;
  repId: string;
  data: string;
  cliente: string;
  kmRodados: number;
  valorKm: number;
  enderecoSaida?: string;
  enderecoChegada?: string;
};

// Todas as queries dependem da RLS: o banco já devolve só o que o usuário pode ver.

export async function fetchRepresentantes(): Promise<Representante[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("representantes")
    .select("id, nome, email, area_id, areas(nome)");
  if (error) throw error;
  return (data ?? []).map((r) => {
    const area = Array.isArray(r.areas) ? r.areas[0] : r.areas;
    return {
      id: r.id as string,
      nome: r.nome as string,
      email: r.email as string,
      setor: (area?.nome as string) ?? "",
    };
  });
}

export async function fetchReembolsos(): Promise<Reembolso[]> {
  const supabase = createClient();
  const { data, error } = await supabase.from("reembolsos").select("*");
  if (error) throw error;
  return (data ?? []).map((r) => ({
    id: r.id,
    repId: r.rep_id,
    mes: r.mes,
    investimentoGasolina: Number(r.investimento_gasolina),
    kmRealizados: Number(r.km_realizados),
  }));
}

export async function fetchViagens(repId?: string): Promise<Viagem[]> {
  const supabase = createClient();
  let query = supabase.from("viagens").select("*").order("data", { ascending: false });
  if (repId) query = query.eq("rep_id", repId);
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []).map((v) => ({
    id: v.id,
    repId: v.rep_id,
    data: v.data,
    cliente: v.cliente,
    kmRodados: Number(v.km_rodados),
    valorKm: Number(v.valor_km),
    enderecoSaida: v.endereco_saida ?? undefined,
    enderecoChegada: v.endereco_chegada ?? undefined,
  }));
}

// Acha o representante correspondente ao email logado (RLS já restringe ao próprio).
export async function fetchMeuRep(email: string | null | undefined): Promise<Representante | null> {
  const reps = await fetchRepresentantes();
  if (!email) return reps[0] ?? null;
  return reps.find((r) => r.email.toLowerCase() === email.toLowerCase()) ?? reps[0] ?? null;
}

export async function criarViagem(
  repId: string,
  dados: {
    cliente: string;
    kmRodados: number;
    valorKm: number;
    enderecoSaida?: string;
    enderecoChegada?: string;
  },
): Promise<void> {
  const supabase = createClient();
  // A tabela viagens foi criada sem defaults: `id` e `data` são NOT NULL e o banco
  // não os gera sozinho — então preenchemos os dois aqui (era a causa do
  // "não foi possível salvar a viagem"). id: UUID v4; data: dia de hoje (YYYY-MM-DD),
  // formato válido tanto para coluna date quanto timestamptz.
  const hoje = new Date().toISOString().slice(0, 10);
  const { error } = await supabase.from("viagens").insert({
    id: crypto.randomUUID(),
    rep_id: repId,
    data: hoje,
    cliente: dados.cliente,
    km_rodados: dados.kmRodados,
    valor_km: dados.valorKm,
    endereco_saida: dados.enderecoSaida ?? null,
    endereco_chegada: dados.enderecoChegada ?? null,
  });
  if (error) throw error;
}

// Apaga uma viagem. Depende da policy de DELETE no banco (RLS) — sem ela o
// banco recusa silenciosamente. A RLS restringe a quem o usuário pode ver.
export async function deletarViagem(id: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("viagens").delete().eq("id", id);
  if (error) throw error;
}

// Define quanto o rep investiu em gasolina no mês. Esse valor alimenta o
// cálculo de saldo (calcularSaldo) no painel do rep e na visão do RH.
// Há no máximo uma linha de reembolso por rep+mês: atualiza se existir, cria se não.
// Depende das policies de INSERT/UPDATE em reembolsos (RLS) — sem elas o banco
// recusa silenciosamente, igual ao caso do delete de viagens.
export async function salvarInvestimentoGasolina(repId: string, mes: string, valor: number): Promise<void> {
  const supabase = createClient();
  const { data: existente, error: errBusca } = await supabase
    .from("reembolsos")
    .select("id")
    .eq("rep_id", repId)
    .eq("mes", mes)
    .maybeSingle();
  if (errBusca) throw errBusca;

  if (existente) {
    const { error } = await supabase
      .from("reembolsos")
      .update({ investimento_gasolina: valor })
      .eq("id", existente.id);
    if (error) throw error;
  } else {
    // id gerado aqui pelo mesmo motivo da viagem: a tabela pode não ter default.
    const { error } = await supabase.from("reembolsos").insert({
      id: crypto.randomUUID(),
      rep_id: repId,
      mes,
      investimento_gasolina: valor,
      km_realizados: 0,
    });
    if (error) throw error;
  }
}
