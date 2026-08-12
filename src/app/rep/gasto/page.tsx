"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { calcularKmCobertos, formatarReais, formatarKm, formatarData, hojeISO, mesAtual, nomeDoMes } from "@/lib/utils";
import { useTarifa } from "@/lib/tarifa-context";
import { usePerfil } from "@/lib/use-perfil";
import { fetchMeuRep, fetchGastos, adicionarGastoGasolina, type Gasto } from "@/lib/dados";

export default function GasolinaDoMes() {
  const { perfil, carregando: carregandoPerfil } = usePerfil();
  const { tarifaAtual: tarifa } = useTarifa();
  const [repId, setRepId] = useState<string | null>(null);
  const [gastos, setGastos] = useState<Gasto[]>([]);
  const [valor, setValor] = useState("");
  const [data, setData] = useState(hojeISO());
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  // Identifica o rep e carrega os lançamentos do mês
  useEffect(() => {
    if (carregandoPerfil) return;
    if (perfil?.papel !== "rep") {
      // Sem isso o spinner ficava girando pra sempre para RH/gestor.
      setCarregando(false);
      return;
    }
    let ativo = true;
    (async () => {
      try {
        const meuRep = await fetchMeuRep(perfil.email);
        if (!ativo) return;
        setRepId(meuRep?.id ?? null);
        if (meuRep) setGastos(await fetchGastos(meuRep.id, mesAtual()));
      } catch (e: unknown) {
        // Antes o erro virava uma promise rejeitada sem dono: o spinner
        // girava pra sempre e ninguém sabia o motivo.
        console.error("Falha ao carregar gasolina do mês:", e);
      } finally {
        if (ativo) setCarregando(false);
      }
    })();
    return () => { ativo = false; };
  }, [perfil, carregandoPerfil]);

  const valorNum = parseFloat(valor.replace(",", ".")) || 0;
  const total = gastos.reduce((acc, g) => acc + g.valor, 0);
  const kmCobertos = total > 0 ? calcularKmCobertos(total, tarifa) : 0;
  const podeAdicionar = valorNum > 0 && data !== "" && repId !== null && !salvando;

  async function adicionar() {
    if (!repId || valorNum <= 0) return;
    setSalvando(true);
    setErro(null);
    try {
      await adicionarGastoGasolina(repId, valorNum, data);
      setGastos(await fetchGastos(repId, mesAtual()));
      setValor("");
      setData(hojeISO());
    } catch {
      setErro("Não foi possível adicionar. Tente novamente.");
    } finally {
      setSalvando(false);
    }
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
      <div className="flex items-center gap-3">
        <Link href="/rep" className="text-gray-400 hover:text-lz-black text-sm">← Voltar</Link>
      </div>

      <div>
        <h1 className="text-2xl font-black text-lz-black">Gasolina do mês</h1>
        <p className="text-gray-500 text-sm">Adicione cada abastecimento — o app soma o total de {nomeDoMes(mesAtual())}</p>
      </div>

      {/* Total acumulado do mês */}
      <div className="bg-lz-green rounded-2xl p-5">
        <p className="text-xs text-black/60 uppercase tracking-wider mb-1">Total investido no mês</p>
        <p className="text-4xl font-black text-lz-black">{formatarReais(total)}</p>
        {total > 0 && (
          <p className="text-xs text-black/60 mt-1">
            equivale a {formatarKm(kmCobertos)} · tarifa {formatarReais(tarifa)}/km
          </p>
        )}
      </div>

      {/* Sem cadastro de rep não há como vincular o lançamento — explica em vez
          de deixar o botão desabilitado sem motivo aparente. */}
      {repId === null && (
        <div className="bg-yellow-50 border border-yellow-400 rounded-2xl p-5">
          <p className="font-bold text-yellow-900 text-sm mb-1">Não foi possível carregar seu cadastro</p>
          <p className="text-sm text-yellow-800">
            {perfil?.papel === "rep"
              ? "Seu cadastro de representante pode não existir ainda, ou houve falha de conexão. Avise o RH e recarregue a página — sem ele não é possível lançar abastecimentos."
              : "Esta tela é exclusiva de representantes."}
          </p>
        </div>
      )}

      {/* Formulário de novo lançamento */}
      <div className="flex flex-col gap-4 bg-white rounded-2xl p-4">
        <p className="text-sm font-bold text-lz-black">Novo abastecimento</p>
        <div>
          <label className="text-xs font-semibold text-gray-500 block mb-1">Valor (R$)</label>
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
        </div>
        <div>
          <label className="text-xs font-semibold text-gray-500 block mb-1">Data</label>
          <input
            type="date"
            value={data}
            max={hojeISO()}
            onChange={(e) => setData(e.target.value)}
            className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-sm focus:border-lz-green outline-none bg-white"
          />
        </div>
        <button
          onClick={adicionar}
          disabled={!podeAdicionar}
          className="bg-lz-black text-lz-green font-bold py-3 rounded-full text-sm disabled:opacity-40"
        >
          {salvando ? "Adicionando..." : "+ Adicionar"}
        </button>
        {erro && <p className="text-center text-xs text-lz-red">{erro}</p>}
      </div>

      {/* Lançamentos do mês */}
      <div>
        <h2 className="text-base font-bold text-lz-black mb-3">Lançamentos de {nomeDoMes(mesAtual())} ({gastos.length})</h2>
        <div className="flex flex-col gap-2">
          {gastos.length === 0 && (
            <p className="text-gray-400 text-sm">Nenhum abastecimento lançado ainda.</p>
          )}
          {gastos.map((g) => (
            <div key={g.id} className="bg-white rounded-xl p-4 flex items-center justify-between">
              <p className="text-xs text-gray-400">{formatarData(g.data)}</p>
              <p className="font-bold text-sm text-lz-black">{formatarReais(g.valor)}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
