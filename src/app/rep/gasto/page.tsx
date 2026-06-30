"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { calcularKmCobertos, formatarReais, formatarKm } from "@/lib/utils";
import { useTarifa } from "@/lib/tarifa-context";
import { usePerfil } from "@/lib/use-perfil";
import { fetchMeuRep, fetchReembolsos, salvarInvestimentoGasolina } from "@/lib/dados";

const MES_ATUAL = "2026-06";

export default function RegistrarGasto() {
  const router = useRouter();
  const { perfil } = usePerfil();
  const { tarifaAtual: tarifa } = useTarifa();
  const [repId, setRepId] = useState<string | null>(null);
  const [valor, setValor] = useState("");
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [salvo, setSalvo] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  // Identifica o rep logado e pré-preenche com o valor já investido no mês
  useEffect(() => {
    if (perfil?.papel !== "rep") return;
    let ativo = true;
    (async () => {
      const [meuRep, reembolsos] = await Promise.all([fetchMeuRep(perfil.email), fetchReembolsos()]);
      if (!ativo) return;
      setRepId(meuRep?.id ?? null);
      const atual = reembolsos.find((r) => r.repId === meuRep?.id && r.mes === MES_ATUAL);
      if (atual && atual.investimentoGasolina > 0) {
        setValor(String(atual.investimentoGasolina).replace(".", ","));
      }
      setCarregando(false);
    })();
    return () => { ativo = false; };
  }, [perfil]);

  const valorNum = parseFloat(valor.replace(",", ".")) || 0;
  const kmCobertos = valorNum > 0 ? calcularKmCobertos(valorNum, tarifa) : 0;
  const podeEnviar = valorNum > 0 && repId !== null && !salvando;

  async function salvar() {
    if (!repId) return;
    setSalvando(true);
    setErro(null);
    try {
      await salvarInvestimentoGasolina(repId, MES_ATUAL, valorNum);
      setSalvo(true);
      setTimeout(() => router.push("/rep"), 1200);
    } catch {
      setErro("Não foi possível salvar. Tente novamente.");
      setSalvando(false);
    }
  }

  if (salvo) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div className="w-16 h-16 rounded-full bg-lz-green flex items-center justify-center text-2xl">✓</div>
        <p className="font-bold text-lz-black text-lg">Valor salvo!</p>
      </div>
    );
  }

  if (carregando) {
    return (
      <div className="flex items-center justify-center py-20">
        <span className="w-8 h-8 border-2 border-gray-300 border-t-lz-black rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-black text-lz-black">Gasolina do mês</h1>
        <p className="text-gray-500 text-sm">Informe quanto você investiu em combustível em junho</p>
      </div>

      <div>
        <label className="text-sm font-semibold text-lz-black block mb-1">Valor investido em gasolina (R$)</label>
        <div className="relative">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-semibold">R$</span>
          <input
            type="number"
            inputMode="decimal"
            value={valor}
            onChange={(e) => setValor(e.target.value)}
            placeholder="0,00"
            className="w-full border-2 border-gray-200 rounded-xl pl-10 pr-4 py-3 text-lg font-bold focus:border-lz-green outline-none bg-white"
          />
        </div>
        <p className="text-xs text-gray-400 mt-1">É o total do mês — ao gastar mais, atualize este valor.</p>
      </div>

      {valorNum > 0 && (
        <div className="bg-lz-green rounded-2xl p-4">
          <p className="text-xs text-black/60 uppercase tracking-wider mb-1">Equivale a</p>
          <p className="text-2xl font-black text-lz-black">{formatarKm(kmCobertos)}</p>
          <p className="text-xs text-black/60 mt-1">pela tarifa de {formatarReais(tarifa)}/km</p>
        </div>
      )}

      <button
        onClick={salvar}
        disabled={!podeEnviar}
        className="bg-lz-black text-lz-green font-bold py-4 rounded-full text-lg disabled:opacity-40"
      >
        {salvando ? "Salvando..." : "Salvar"}
      </button>

      {erro && <p className="text-center text-xs text-lz-red">{erro}</p>}
    </div>
  );
}
