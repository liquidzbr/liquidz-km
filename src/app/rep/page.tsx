"use client";

import Link from "next/link";
import { getReembolsoAtual, getViagensPorRep } from "@/lib/mock-data";
import { calcularSaldo, formatarReais, formatarKm, formatarData } from "@/lib/utils";
import { useTarifa } from "@/lib/tarifa-context";

const REP_ID = "rep1";

export default function RepDashboard() {
  const { tarifa } = useTarifa();
  const reembolso = getReembolsoAtual(REP_ID);
  const viagens = getViagensPorRep(REP_ID);

  const saldo = reembolso
    ? calcularSaldo(reembolso.investimentoGasolina, reembolso.kmRealizados, tarifa)
    : null;
  const positivo = saldo ? saldo.saldoReais >= 0 : true;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-black text-lz-black">Olá, Ana!</h1>
        <p className="text-gray-500 text-sm">Junho de 2026 · tarifa: {formatarReais(tarifa)}/km</p>
      </div>

      {saldo && (
        <div className={`rounded-2xl p-5 ${positivo ? "bg-lz-green" : "bg-lz-red"}`}>
          <p className="text-sm font-semibold text-black/70 mb-1">Saldo do mês</p>
          <p className="text-4xl font-black text-lz-black">
            {formatarReais(saldo.saldoReais)}
          </p>
          <p className="text-sm text-black/60 mt-1">
            {formatarKm(saldo.saldoKm)} de saldo em KM
          </p>
          <div className="flex gap-4 mt-4 text-xs text-black/70">
            <span>KM rodados: <strong>{formatarKm(reembolso!.kmRealizados)}</strong></span>
            <span>KM cobertos: <strong>{formatarKm(saldo.kmCobertos)}</strong></span>
          </div>
        </div>
      )}

      <div className="flex gap-3">
        <Link href="/rep/nova-visita" className="flex-1 bg-lz-black text-lz-green font-bold py-4 rounded-2xl text-center text-sm">
          + Nova visita
        </Link>
        <Link href="/rep/gasto" className="flex-1 bg-white border-2 border-lz-black text-lz-black font-bold py-4 rounded-2xl text-center text-sm">
          Registrar gasolina
        </Link>
      </div>

      <div>
        <h2 className="text-base font-bold text-lz-black mb-3">Viagens recentes</h2>
        <div className="flex flex-col gap-2">
          {viagens.length === 0 && (
            <p className="text-gray-400 text-sm">Nenhuma viagem registrada ainda.</p>
          )}
          {viagens.map((v) => (
            <div key={v.id} className="bg-white rounded-xl p-4 flex items-center justify-between">
              <div>
                <p className="font-semibold text-sm text-lz-black">{v.cliente}</p>
                <p className="text-xs text-gray-400">{formatarData(v.data)}</p>
              </div>
              <div className="text-right">
                <p className="font-bold text-sm text-lz-black">{formatarKm(v.kmRodados)}</p>
                <p className="text-xs text-lz-green font-semibold">{formatarReais(v.kmRodados * tarifa)}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
