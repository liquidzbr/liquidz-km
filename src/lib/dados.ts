"use client";

import { createClient } from "@/lib/supabase/client";
import { hojeISO } from "@/lib/utils";

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

// Cada lançamento de gasolina do mês (valor + data). A soma dos lançamentos do
// mês forma o investimento que alimenta o saldo (reembolsos.investimento_gasolina).
export type Gasto = {
  id: string;
  repId: string;
  data: string;
  valor: number;
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
// Devolve null quando não há cadastro para o email — nunca cair no primeiro da
// lista: gravaria a viagem em nome de outra pessoa se o cadastro não existisse.
export async function fetchMeuRep(email: string | null | undefined): Promise<Representante | null> {
  if (!email) return null;
  const reps = await fetchRepresentantes();
  return reps.find((r) => r.email.toLowerCase() === email.toLowerCase()) ?? null;
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
  const hoje = hojeISO();
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

// Lista os lançamentos de gasolina do rep. Se `mesPrefix` (ex: "2026-06") for
// passado, devolve só os daquele mês. Mais recentes primeiro.
export async function fetchGastos(repId: string, mesPrefix?: string): Promise<Gasto[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("gastos")
    .select("id, rep_id, data, valor")
    .eq("rep_id", repId)
    .order("data", { ascending: false });
  if (error) throw error;
  let rows = (data ?? []).map((g) => ({
    id: g.id as string,
    repId: g.rep_id as string,
    data: g.data as string,
    valor: Number(g.valor),
  }));
  if (mesPrefix) rows = rows.filter((g) => String(g.data).startsWith(mesPrefix));
  return rows;
}

// Adiciona um lançamento de gasolina (valor + data) e ressincroniza o total do
// mês em reembolsos.investimento_gasolina — a soma dos lançamentos é a base do saldo.
//
// O mês é derivado da DATA do abastecimento, não do mês corrente: o rep pode
// lançar no dia 02/09 um abastecimento do dia 30/08, e esse valor tem que somar
// em agosto. Antes o mês vinha de fora e o total ia parar no mês errado.
export async function adicionarGastoGasolina(repId: string, valor: number, data: string): Promise<void> {
  const supabase = createClient();
  const mes = data.slice(0, 7);
  // comprovante_url fica null: o comprovante deixou de ser exigido.
  const { error } = await supabase.from("gastos").insert({
    id: crypto.randomUUID(),
    rep_id: repId,
    data,
    valor,
    comprovante_url: null,
  });
  if (error) throw error;
  const gastosDoMes = await fetchGastos(repId, mes);
  const total = gastosDoMes.reduce((acc, g) => acc + g.valor, 0);
  await salvarInvestimentoGasolina(repId, mes, total);
}
