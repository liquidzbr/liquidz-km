"use client";

import Link from "next/link";
import { useState } from "react";
import { representantes, reembolsos, viagens, getMesesDisponiveis } from "@/lib/mock-data";
import { calcularSaldo, formatarReais, formatarKm } from "@/lib/utils";
import { useTarifa } from "@/lib/tarifa-context";

function formatarMes(mesISO: string): string {
  const [ano, mes] = mesISO.split("-");
  const nomes = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
  return `${nomes[parseInt(mes) - 1]}/${ano.slice(2)}`;
}

function BarraHorizontal({ valor, max, cor }: { valor: number; max: number; cor: string }) {
  const pct = max > 0 ? Math.min((valor / max) * 100, 100) : 0;
  return (
    <div className="h-2 bg-gray-100 rounded-full overflow-hidden flex-1">
      <div className={`h-full rounded-full ${cor}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

export default function Analises() {
  const { getTarifaParaMes } = useTarifa();
  const meses = getMesesDisponiveis();
  const [mesSelecionado, setMesSelecionado] = useState(meses[meses.length - 1]);

  const reembolsosComSaldo = reembolsos.map((r) => {
    const tarifa = getTarifaParaMes(r.mes);
    const saldo = calcularSaldo(r.investimentoGasolina, r.kmRealizados, tarifa);
    return { ...r, ...saldo, tarifa };
  });

  // ── Filtro por mês ─────────────────────────────────────────────────────────
  const reembolsosFiltrados = reembolsosComSaldo.filter((r) => r.mes === mesSelecionado);

  // ── ANÁLISE 1: Custo total de reembolso ────────────────────────────────────
  const custoTotalReembolso = reembolsosFiltrados.reduce(
    (acc, r) => acc + r.kmRealizados * r.tarifa, 0
  );
  const totalInvestido = reembolsosFiltrados.reduce((acc, r) => acc + r.investimentoGasolina, 0);
  const diferenca = totalInvestido - custoTotalReembolso;

  // ── ANÁLISE 2: Ranking de eficiência ───────────────────────────────────────
  const ranking = reembolsosFiltrados
    .map((r) => {
      const rep = representantes.find((rp) => rp.id === r.repId)!;
      const eficiencia = r.kmCobertos > 0 ? (r.kmRealizados / r.kmCobertos) * 100 : 0;
      return { rep, eficiencia, kmRealizados: r.kmRealizados, kmCobertos: r.kmCobertos };
    })
    .sort((a, b) => b.eficiencia - a.eficiencia);

  // ── ANÁLISE 3: Evolução mensal (sempre todos os meses, sem filtro) ─────────
  const evolucao = meses.map((mes) => {
    const grupo = reembolsosComSaldo.filter((r) => r.mes === mes);
    const investido = grupo.reduce((acc, r) => acc + r.investimentoGasolina, 0);
    const reembolso = grupo.reduce((acc, r) => acc + r.kmRealizados * r.tarifa, 0);
    return { mes, investido, reembolso };
  });
  const maxEvolucao = Math.max(...evolucao.map((e) => Math.max(e.investido, e.reembolso)));

  // ── ANÁLISE 4: Visitas e média de KM ──────────────────────────────────────
  const estatisticasVisitas = representantes.map((rep) => {
    const viagensRep = viagens.filter(
      (v) => v.repId === rep.id && v.data.startsWith(mesSelecionado)
    );
    const totalKm = viagensRep.reduce((acc, v) => acc + v.kmRodados, 0);
    const mediaKm = viagensRep.length > 0 ? totalKm / viagensRep.length : 0;
    return { rep, totalVisitas: viagensRep.length, totalKm, mediaKm };
  }).sort((a, b) => b.totalVisitas - a.totalVisitas);
  const maxVisitas = Math.max(...estatisticasVisitas.map((e) => e.totalVisitas), 1);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <Link href="/rh" className="text-gray-400 hover:text-lz-black text-sm">← Voltar</Link>
      </div>

      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-black text-lz-black">Análises</h1>
          <p className="text-gray-500 text-sm">{formatarMes(mesSelecionado)}</p>
        </div>
      </div>

      {/* ── Filtro de mês ── */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {meses.map((mes) => (
          <button
            key={mes}
            onClick={() => setMesSelecionado(mes)}
            className={`shrink-0 px-4 py-2 rounded-full text-sm font-bold transition-colors ${
              mes === mesSelecionado
                ? "bg-lz-black text-lz-green"
                : "bg-white text-gray-400 border border-gray-200"
            }`}
          >
            {formatarMes(mes)}
          </button>
        ))}
      </div>

      {reembolsosFiltrados.length === 0 ? (
        <div className="bg-white rounded-2xl p-8 text-center">
          <p className="text-gray-400 text-sm">Sem dados para {formatarMes(mesSelecionado)}.</p>
        </div>
      ) : (
        <>
          {/* ── 1. Custo de reembolso ── */}
          <section className="flex flex-col gap-3">
            <h2 className="text-base font-bold text-lz-black">1. Custo de reembolso</h2>
            <div className="bg-lz-black rounded-2xl p-5 text-white">
              <p className="text-xs text-white/50 uppercase tracking-wider mb-1">Total a desembolsar</p>
              <p className="text-4xl font-black text-lz-green">{formatarReais(custoTotalReembolso)}</p>
              <p className="text-xs text-white/50 mt-2">= km rodados × tarifa vigente</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white rounded-2xl p-4">
                <p className="text-xs text-gray-400 mb-1">Investido em gasolina</p>
                <p className="text-lg font-black text-lz-black">{formatarReais(totalInvestido)}</p>
                <p className="text-xs text-gray-400 mt-1">declarado pelos reps</p>
              </div>
              <div className={`rounded-2xl p-4 ${diferenca >= 0 ? "bg-lz-green" : "bg-lz-red"}`}>
                <p className="text-xs text-black/60 mb-1">Diferença</p>
                <p className="text-lg font-black text-lz-black">{formatarReais(Math.abs(diferenca))}</p>
                <p className="text-xs text-black/60 mt-1">
                  {diferenca >= 0 ? "investido > reembolso" : "reembolso > investido"}
                </p>
              </div>
            </div>
            <div className="bg-white rounded-2xl p-4 flex flex-col gap-2">
              {reembolsosFiltrados.map((r) => {
                const rep = representantes.find((rp) => rp.id === r.repId)!;
                const custo = r.kmRealizados * r.tarifa;
                return (
                  <div key={r.id} className="flex justify-between items-center py-1 border-b border-gray-50 last:border-0">
                    <span className="text-sm text-lz-black">{rep.nome}</span>
                    <div className="text-right">
                      <span className="font-bold text-sm text-lz-black">{formatarReais(custo)}</span>
                      <span className="text-xs text-gray-400 ml-2">{formatarKm(r.kmRealizados)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* ── 2. Ranking de eficiência ── */}
          <section className="flex flex-col gap-3">
            <h2 className="text-base font-bold text-lz-black">2. Ranking de eficiência</h2>
            <p className="text-xs text-gray-400 -mt-1">% do orçamento coberto que foi percorrido</p>
            <div className="bg-white rounded-2xl p-4 flex flex-col gap-4">
              {ranking.map(({ rep, eficiencia, kmRealizados, kmCobertos }, i) => {
                const cor = eficiencia >= 90 ? "bg-lz-green" : eficiencia >= 70 ? "bg-lz-yellow" : "bg-lz-red";
                const label = eficiencia >= 90 ? "Dentro do orçamento" : eficiencia >= 70 ? "Atenção" : "Muito abaixo";
                return (
                  <div key={rep.id} className="flex flex-col gap-1.5">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-gray-100 text-xs font-bold flex items-center justify-center text-gray-500">{i + 1}</span>
                        <span className="font-semibold text-sm text-lz-black">{rep.nome}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-400">{label}</span>
                        <span className="font-black text-sm text-lz-black">{eficiencia.toFixed(0)}%</span>
                      </div>
                    </div>
                    <BarraHorizontal valor={eficiencia} max={100} cor={cor} />
                    <p className="text-xs text-gray-400">
                      {formatarKm(kmRealizados)} rodados de {formatarKm(kmCobertos)} cobertos
                    </p>
                  </div>
                );
              })}
            </div>
            <div className="bg-lz-bg border border-gray-200 rounded-xl p-3">
              <p className="text-xs text-gray-400">
                <span className="font-semibold text-lz-black">100%</span> = usou exatamente o orçamento coberto.{" "}
                <span className="font-semibold">Acima</span> = saldo negativo.{" "}
                <span className="font-semibold">Abaixo</span> = saldo positivo.
              </p>
            </div>
          </section>

          {/* ── 4. Visitas e média de KM ── */}
          <section className="flex flex-col gap-3">
            <h2 className="text-base font-bold text-lz-black">4. Visitas e média de KM</h2>
            <div className="bg-white rounded-2xl p-4 flex flex-col gap-4">
              {estatisticasVisitas.map(({ rep, totalVisitas, totalKm, mediaKm }) => (
                <div key={rep.id} className="flex flex-col gap-1.5">
                  <div className="flex justify-between items-center">
                    <span className="font-semibold text-sm text-lz-black">{rep.nome}</span>
                    <span className="text-xs text-gray-400">{rep.regiao}</span>
                  </div>
                  <BarraHorizontal valor={totalVisitas} max={maxVisitas} cor="bg-lz-green" />
                  <div className="flex gap-4 text-xs text-gray-500">
                    <span><strong className="text-lz-black">{totalVisitas}</strong> visitas</span>
                    <span><strong className="text-lz-black">{formatarKm(totalKm)}</strong> total</span>
                    <span><strong className="text-lz-black">{formatarKm(mediaKm)}</strong> por visita</span>
                  </div>
                </div>
              ))}
            </div>
            <p className="text-xs text-gray-400 px-1">
              Média alta pode indicar oportunidade de otimizar rotas.
            </p>
          </section>
        </>
      )}

      {/* ── 3. Evolução mensal (sempre sem filtro) ── */}
      <section className="flex flex-col gap-3">
        <h2 className="text-base font-bold text-lz-black">3. Evolução mensal</h2>
        <p className="text-xs text-gray-400 -mt-1">Visão geral de todos os meses</p>
        <div className="bg-white rounded-2xl p-4 flex flex-col gap-4">
          <div className="flex gap-4 text-xs text-gray-400">
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-lz-black inline-block" /> Investido</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-lz-green inline-block" /> Reembolso</span>
          </div>
          {evolucao.map(({ mes, investido, reembolso }) => (
            <div
              key={mes}
              className={`flex flex-col gap-1 p-2 rounded-xl transition-colors ${mes === mesSelecionado ? "bg-lz-bg" : ""}`}
            >
              <p className="text-xs font-semibold text-gray-500 flex items-center gap-2">
                {formatarMes(mes)}
                {mes === mesSelecionado && (
                  <span className="text-xs bg-lz-black text-lz-green px-2 py-0.5 rounded-full">selecionado</span>
                )}
              </p>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-400 w-16 text-right">{formatarReais(investido)}</span>
                <BarraHorizontal valor={investido} max={maxEvolucao} cor="bg-lz-black" />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-400 w-16 text-right">{formatarReais(reembolso)}</span>
                <BarraHorizontal valor={reembolso} max={maxEvolucao} cor="bg-lz-green" />
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
