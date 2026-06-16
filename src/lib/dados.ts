"use client";

import { createClient } from "@/lib/supabase/client";
import type { Representante, Reembolso, Viagem } from "@/lib/mock-data";

// Tipos das tabelas de comprovantes
export type Gasto = {
  id: string;
  repId: string;
  data: string;
  valor: number;
  comprovanteUrl: string | null;
};

export type Estacionamento = {
  id: string;
  repId: string;
  data: string;
  local: string;
  valor: number;
  fotoUrl: string | null;
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

export async function fetchGastos(repId?: string): Promise<Gasto[]> {
  const supabase = createClient();
  let query = supabase.from("gastos").select("*").order("data", { ascending: false });
  if (repId) query = query.eq("rep_id", repId);
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []).map((g) => ({
    id: g.id,
    repId: g.rep_id,
    data: g.data,
    valor: Number(g.valor),
    comprovanteUrl: g.comprovante_url ?? null,
  }));
}

export async function fetchEstacionamentos(repId?: string): Promise<Estacionamento[]> {
  const supabase = createClient();
  let query = supabase.from("estacionamentos").select("*").order("data", { ascending: false });
  if (repId) query = query.eq("rep_id", repId);
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []).map((e) => ({
    id: e.id,
    repId: e.rep_id,
    data: e.data,
    local: e.local,
    valor: Number(e.valor),
    fotoUrl: e.foto_url ?? null,
  }));
}

// Gera uma URL temporária e assinada para abrir um comprovante do bucket privado.
export async function urlComprovante(path: string): Promise<string | null> {
  const supabase = createClient();
  const { data } = await supabase.storage
    .from("comprovantes")
    .createSignedUrl(path, 60 * 10); // 10 minutos
  return data?.signedUrl ?? null;
}
