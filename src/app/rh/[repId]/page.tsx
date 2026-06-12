"use client";

import Link from "next/link";
import { use } from "react";
import { representantes, reembolsos, getViagensPorRep } from "@/lib/mock-data";
import { calcularSaldo, formatarReais, formatarKm, formatarData } from "@/lib/utils";
import { useTarifa } from "@/lib/tarifa-context";
import { notFound } from "next/navigation";

export default function RepDetalhe({ params }: { params: Promise<{ repId: string }> }) {
  const { repId } = use(params);
  const { getTarifaRep } = useTarifa();

  const rep = representantes.find((r) => r.id === repId);
  if (!rep) notFound();

  const reembolso = reembolsos.find((r) => r.repId === repId);
  const viagens = getViagensPorRep(repId);

  const tarifaDoMes = reembolso ? getTarifaRep(repId, reembolso.mes) : 0.90;
  const saldo = reembolso
    ? calcularSaldo(reembolso.investimentoGasolina, reembolso.kmRealizados, tarifaDoMes)
    : null;
  const positivo = saldo ? saldo.saldoReais >= 0 : true;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <Link href="/rh" className="text-gray-400 hover:text-lz-black text-sm">← Voltar</Link>
      </div>

      <div>
        <h1 className="text-2xl font-black text-lz-black">{rep.nome}</h1>
        <p className="text-gray-400 text-sm">{rep.setor} · {rep.email}</p>
      </div>

      {saldo && reembolso && (
        <div className={`rounded-2xl p-5 ${positivo ? "bg-lz-green" : "bg-lz-red"}`}>
          <p className="text-xs font-semibold text-black/60 uppercase tracking-wider mb-1">Saldo — Junho 2026</p>
          <p className={`text-4xl font-black ${positivo ? "text-lz-black" : "text-white"}`}>
            {formatarReais(saldo.saldoReais)}
          </p>
          {!positivo && (
            <p className="text-white text-xs mt-2 font-semibold">⚠️ Gasto acima da tarifa coberta</p>
          )}
          <div className="grid grid-cols-3 gap-2 mt-4">
            {[
              { label: "Invest. gasolina", valor: formatarReais(reembolso.investimentoGasolina) },
              { label: "KM cobertos", valor: formatarKm(saldo.kmCobertos) },
              { label: "KM realizados", valor: formatarKm(reembolso.kmRealizados) },
            ].map((item) => (
              <div key={item.label} className="bg-black/10 rounded-xl p-2 text-center">
                <p className="text-xs text-black/50">{item.label}</p>
                <p className="font-bold text-xs text-lz-black mt-0.5">{item.valor}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      <div>
        <h2 className="text-base font-bold text-lz-black mb-3">
          Viagens do mês ({viagens.length})
        </h2>
        <div className="flex flex-col gap-2">
          {viagens.length === 0 && (
            <p className="text-gray-400 text-sm">Nenhuma viagem registrada.</p>
          )}
          {viagens.map((v) => (
            <div key={v.id} className="bg-white rounded-xl p-4 flex flex-col gap-3">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-semibold text-sm text-lz-black">{v.cliente}</p>
                  <p className="text-xs text-gray-400">{formatarData(v.data)}</p>
                </div>
                <div className="text-right shrink-0 ml-4">
                  <p className="font-bold text-sm">{formatarKm(v.kmRodados)}</p>
                  <p className="text-xs text-lz-green font-semibold">{formatarReais(v.kmRodados * tarifaDoMes)}</p>
                </div>
              </div>
              {(v.enderecoSaida || v.enderecoChegada) && (
                <div className="flex flex-col gap-1 border-t border-gray-50 pt-2">
                  {v.enderecoSaida && (
                    <div className="flex items-start gap-2">
                      <span className="text-xs text-gray-400 shrink-0 w-12">Saída</span>
                      <span className="text-xs text-lz-black">{v.enderecoSaida}</span>
                    </div>
                  )}
                  {v.enderecoChegada && (
                    <div className="flex items-start gap-2">
                      <span className="text-xs text-gray-400 shrink-0 w-12">Chegada</span>
                      <span className="text-xs text-lz-black">{v.enderecoChegada}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
