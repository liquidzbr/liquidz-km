"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { getReembolsoAtual, getViagensPorRep, getRepPorEmail } from "@/lib/mock-data";
import { calcularSaldo, formatarReais, formatarKm, formatarData } from "@/lib/utils";
import { useTarifa } from "@/lib/tarifa-context";
import { usePerfil } from "@/lib/use-perfil";

export default function RepDashboard() {
  const router = useRouter();
  const { perfil, carregando } = usePerfil();
  const { getTarifaRep } = useTarifa();

  // Identifica o rep logado pelo email
  const rep = getRepPorEmail(perfil?.email);

  // Gestor/RH não têm visão de rep — vão para o painel
  useEffect(() => {
    if (!carregando && perfil && perfil.papel !== "rep") router.replace("/rh");
  }, [carregando, perfil, router]);

  const reembolso = rep ? getReembolsoAtual(rep.id) : undefined;
  const viagens = rep ? getViagensPorRep(rep.id) : [];
  const tarifa = rep ? getTarifaRep(rep.id, "2026-06") : 0;

  const saldo = reembolso
    ? calcularSaldo(reembolso.investimentoGasolina, reembolso.kmRealizados, tarifa)
    : null;
  const sobrou = saldo ? saldo.saldoReais >= 0 : true;

  // Aguarda resolver o perfil; bloqueia render para não-reps
  if (carregando || !perfil || perfil.papel !== "rep") {
    return (
      <div className="flex items-center justify-center py-20">
        <span className="w-8 h-8 border-2 border-gray-300 border-t-lz-black rounded-full animate-spin" />
      </div>
    );
  }

  const primeiroNome = rep?.nome.split(" ")[0] ?? "";

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-black text-lz-black">Olá, {primeiroNome}!</h1>
        <p className="text-gray-500 text-sm">Junho de 2026 · tarifa: {formatarReais(tarifa)}/km</p>
      </div>

      {saldo && (
        <div className={`rounded-2xl p-5 ${sobrou ? "bg-lz-green" : "bg-lz-red"}`}>
          <p className="text-sm font-semibold text-black/70 mb-1">Saldo do mês</p>
          <p className={`text-4xl font-black ${sobrou ? "text-lz-black" : "text-white"}`}>
            {formatarReais(Math.abs(saldo.saldoReais))}
          </p>
          <p className={`text-sm mt-1 ${sobrou ? "text-black/60" : "text-white/80"}`}>
            {sobrou ? `Sobrou ${formatarKm(saldo.saldoKm)} de saldo` : `Faltam ${formatarKm(Math.abs(saldo.saldoKm))}`}
          </p>
          <div className={`flex gap-4 mt-4 text-xs ${sobrou ? "text-black/70" : "text-white/70"}`}>
            <span>KM rodados: <strong>{formatarKm(reembolso!.kmRealizados)}</strong></span>
            <span>KM cobertos: <strong>{formatarKm(saldo.kmCobertos)}</strong></span>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-2">
        <Link
          href="/rep/nova-visita"
          className="bg-lz-black text-lz-green font-bold py-4 rounded-2xl text-center text-sm"
        >
          + Nova visita
        </Link>
        <div className="flex gap-2">
          <Link
            href="/rep/gasto"
            className="flex-1 bg-white border-2 border-lz-black text-lz-black font-bold py-3 rounded-2xl text-center text-sm"
          >
            ⛽ Gasolina
          </Link>
          <Link
            href="/rep/estacionamento"
            className="flex-1 bg-white border-2 border-lz-black text-lz-black font-bold py-3 rounded-2xl text-center text-sm"
          >
            🅿️ Estacionamento
          </Link>
        </div>
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
