"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { Representante, Reembolso, Viagem } from "@/lib/dados";
import { fetchRepresentantes, fetchReembolsos, fetchViagens, deletarViagem } from "@/lib/dados";
import { calcularSaldo, formatarReais, formatarKm, formatarData } from "@/lib/utils";
import { useTarifa } from "@/lib/tarifa-context";
import { usePerfil } from "@/lib/use-perfil";

const MES_ATUAL = "2026-06";

export default function RepDashboard() {
  const router = useRouter();
  const { perfil, carregando } = usePerfil();
  const { getTarifaRep } = useTarifa();

  const [rep, setRep] = useState<Representante | null>(null);
  const [reembolso, setReembolso] = useState<Reembolso | undefined>(undefined);
  const [viagens, setViagens] = useState<Viagem[]>([]);
  const [carregandoDados, setCarregandoDados] = useState(true);
  const [confirmandoId, setConfirmandoId] = useState<string | null>(null);
  const [apagandoId, setApagandoId] = useState<string | null>(null);
  const [erroApagar, setErroApagar] = useState<string | null>(null);

  async function deletar(id: string) {
    setApagandoId(id);
    setErroApagar(null);
    try {
      await deletarViagem(id);
      setViagens((prev) => prev.filter((x) => x.id !== id));
      setConfirmandoId(null);
    } catch (e) {
      console.error("Falha ao apagar viagem:", e);
      setErroApagar("Não foi possível apagar a viagem. Tente novamente.");
    } finally {
      setApagandoId(null);
    }
  }

  // Gestor/RH não têm visão de rep — vão para o painel
  useEffect(() => {
    if (!carregando && perfil && perfil.papel !== "rep") router.replace("/rh");
  }, [carregando, perfil, router]);

  // Carrega os dados do rep logado (a RLS já devolve só os dele)
  useEffect(() => {
    if (carregando || perfil?.papel !== "rep") return;
    let ativo = true;
    (async () => {
      const [reps, reembolsos] = await Promise.all([fetchRepresentantes(), fetchReembolsos()]);
      const meuRep = reps.find((r) => r.email === perfil.email) ?? reps[0] ?? null;
      if (!ativo) return;
      setRep(meuRep);
      setReembolso(reembolsos.find((r) => r.repId === meuRep?.id && r.mes === MES_ATUAL));
      if (meuRep) setViagens(await fetchViagens(meuRep.id));
      if (ativo) setCarregandoDados(false);
    })();
    return () => { ativo = false; };
  }, [carregando, perfil]);

  const tarifa = rep ? getTarifaRep(rep.id, MES_ATUAL) : 0;

  const saldo = reembolso
    ? calcularSaldo(reembolso.investimentoGasolina, reembolso.kmRealizados, tarifa)
    : null;
  const sobrou = saldo ? saldo.saldoReais >= 0 : true;

  // Aguarda resolver o perfil e os dados; bloqueia render para não-reps
  if (carregando || carregandoDados || !perfil || perfil.papel !== "rep") {
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
        <Link
          href="/rep/gasto"
          className="bg-white border-2 border-lz-black text-lz-black font-bold py-3 rounded-2xl text-center text-sm"
        >
          ⛽ Valor investido em gasolina
        </Link>
      </div>

      <div>
        <h2 className="text-base font-bold text-lz-black mb-3">Viagens recentes</h2>
        {erroApagar && (
          <div className="bg-red-50 border border-lz-red rounded-xl p-3 text-sm text-lz-red mb-2">{erroApagar}</div>
        )}
        <div className="flex flex-col gap-2">
          {viagens.length === 0 && (
            <p className="text-gray-400 text-sm">Nenhuma viagem registrada ainda.</p>
          )}
          {viagens.map((v) => (
            <div key={v.id} className="bg-white rounded-xl p-4 flex flex-col gap-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-sm text-lz-black">{v.cliente}</p>
                  <p className="text-xs text-gray-400">{formatarData(v.data)}</p>
                </div>
                <div className="flex items-start gap-3 shrink-0">
                  <div className="text-right">
                    <p className="font-bold text-sm text-lz-black">{formatarKm(v.kmRodados)}</p>
                    <p className="text-xs text-lz-green font-semibold">{formatarReais(v.kmRodados * tarifa)}</p>
                  </div>
                  <button
                    onClick={() => setConfirmandoId(confirmandoId === v.id ? null : v.id)}
                    aria-label="Apagar viagem"
                    className="text-gray-300 hover:text-lz-red text-lg leading-none -mt-0.5"
                  >
                    ✕
                  </button>
                </div>
              </div>
              {confirmandoId === v.id && (
                <div className="flex items-center justify-between gap-2 border-t border-gray-50 pt-3">
                  <span className="text-xs text-gray-500">Apagar esta viagem?</span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setConfirmandoId(null)}
                      className="text-xs font-semibold px-3 py-1.5 rounded-full border border-gray-200 text-gray-500"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={() => deletar(v.id)}
                      disabled={apagandoId === v.id}
                      className="text-xs font-bold px-3 py-1.5 rounded-full bg-lz-red text-white disabled:opacity-50"
                    >
                      {apagandoId === v.id ? "Apagando..." : "Apagar"}
                    </button>
                  </div>
                </div>
              )}
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
