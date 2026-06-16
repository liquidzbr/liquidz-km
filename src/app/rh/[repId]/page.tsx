"use client";

import Link from "next/link";
import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  fetchRepresentantes, fetchReembolsos, fetchViagens, fetchGastos, fetchEstacionamentos,
  urlComprovante,
  type Representante, type Reembolso, type Viagem, type Gasto, type Estacionamento,
} from "@/lib/dados";
import { calcularSaldo, formatarReais, formatarKm, formatarData } from "@/lib/utils";
import { useTarifa } from "@/lib/tarifa-context";
import { usePerfil } from "@/lib/use-perfil";

// Abre o comprovante (arquivo privado) via URL assinada temporária
function ComprovanteLink({ path }: { path: string | null }) {
  const [abrindo, setAbrindo] = useState(false);
  if (!path) return <span className="text-xs text-gray-300">sem foto</span>;
  async function abrir() {
    setAbrindo(true);
    const url = await urlComprovante(path!);
    setAbrindo(false);
    if (url) window.open(url, "_blank");
  }
  return (
    <button
      onClick={abrir}
      disabled={abrindo}
      className="text-xs font-semibold text-lz-black underline underline-offset-2 disabled:opacity-50"
    >
      {abrindo ? "abrindo…" : "📎 ver"}
    </button>
  );
}

export default function RepDetalhe({ params }: { params: Promise<{ repId: string }> }) {
  const { repId } = use(params);
  const router = useRouter();
  const { perfil, carregando } = usePerfil();
  const { getTarifaRep } = useTarifa();

  const [rep, setRep] = useState<Representante | null>(null);
  const [reembolso, setReembolso] = useState<Reembolso | undefined>(undefined);
  const [viagens, setViagens] = useState<Viagem[]>([]);
  const [gastos, setGastos] = useState<Gasto[]>([]);
  const [estacionamentos, setEstacionamentos] = useState<Estacionamento[]>([]);
  const [carregandoDados, setCarregandoDados] = useState(true);
  const [semAcesso, setSemAcesso] = useState(false);

  // Reps não acessam o detalhe do RH
  useEffect(() => {
    if (!carregando && perfil?.papel === "rep") router.replace("/rep");
  }, [carregando, perfil, router]);

  // Carrega os dados do rep (a RLS impede gestor de ver rep de outra área)
  useEffect(() => {
    if (carregando || !perfil || perfil.papel === "rep") return;
    let ativo = true;
    (async () => {
      const reps = await fetchRepresentantes();
      const alvo = reps.find((r) => r.id === repId) ?? null;
      if (!ativo) return;
      if (!alvo) { setSemAcesso(true); setCarregandoDados(false); return; }
      setRep(alvo);
      const [rmb, vgs, gst, est] = await Promise.all([
        fetchReembolsos(),
        fetchViagens(repId),
        fetchGastos(repId),
        fetchEstacionamentos(repId),
      ]);
      if (!ativo) return;
      setReembolso(rmb.find((r) => r.repId === repId));
      setViagens(vgs);
      setGastos(gst);
      setEstacionamentos(est);
      setCarregandoDados(false);
    })();
    return () => { ativo = false; };
  }, [carregando, perfil, repId]);

  // Gestor de outra área (ou rep inexistente) → volta pro painel
  useEffect(() => {
    if (semAcesso) router.replace("/rh");
  }, [semAcesso, router]);

  const tarifaDoMes = rep && reembolso ? getTarifaRep(repId, reembolso.mes) : 0.90;
  const saldo = reembolso
    ? calcularSaldo(reembolso.investimentoGasolina, reembolso.kmRealizados, tarifaDoMes)
    : null;
  const positivo = saldo ? saldo.saldoReais >= 0 : true;

  if (carregando || carregandoDados || semAcesso || perfil?.papel === "rep" || !rep) {
    return (
      <div className="flex items-center justify-center py-20">
        <span className="w-8 h-8 border-2 border-gray-300 border-t-lz-black rounded-full animate-spin" />
      </div>
    );
  }

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

      {/* Comprovantes de gasolina */}
      <div>
        <h2 className="text-base font-bold text-lz-black mb-3">Gastos de gasolina ({gastos.length})</h2>
        <div className="flex flex-col gap-2">
          {gastos.length === 0 && (
            <p className="text-gray-400 text-sm">Nenhum gasto com comprovante.</p>
          )}
          {gastos.map((g) => (
            <div key={g.id} className="bg-white rounded-xl p-4 flex items-center justify-between">
              <div>
                <p className="font-semibold text-sm text-lz-black">{formatarReais(g.valor)}</p>
                <p className="text-xs text-gray-400">{formatarData(g.data)}</p>
              </div>
              <ComprovanteLink path={g.comprovanteUrl} />
            </div>
          ))}
        </div>
      </div>

      {/* Comprovantes de estacionamento */}
      <div>
        <h2 className="text-base font-bold text-lz-black mb-3">Estacionamento ({estacionamentos.length})</h2>
        <div className="flex flex-col gap-2">
          {estacionamentos.length === 0 && (
            <p className="text-gray-400 text-sm">Nenhum estacionamento registrado.</p>
          )}
          {estacionamentos.map((e) => (
            <div key={e.id} className="bg-white rounded-xl p-4 flex items-center justify-between">
              <div>
                <p className="font-semibold text-sm text-lz-black">{e.local}</p>
                <p className="text-xs text-gray-400">{formatarData(e.data)} · {formatarReais(e.valor)}</p>
              </div>
              <ComprovanteLink path={e.fotoUrl} />
            </div>
          ))}
        </div>
      </div>

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
