"use client";

import Link from "next/link";
import { useState } from "react";
import { representantes, reembolsos, gestores, getMesesDisponiveis } from "@/lib/mock-data";
import { calcularSaldo, formatarReais, formatarKm, TARIFA_DEFAULT } from "@/lib/utils";
import { useTarifa } from "@/lib/tarifa-context";

function mesAtual() {
  return new Date().toISOString().slice(0, 7);
}

function formatarMes(mesISO: string): string {
  const [ano, mes] = mesISO.split("-");
  const nomes = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
  return `${nomes[parseInt(mes) - 1]} ${ano}`;
}

export default function RhDashboard() {
  const { historico, tarifaAtual, getTarifaParaMes, adicionarTarifa, tarifasPorRep, getTarifaRep, setTarifaRep } = useTarifa();

  const meses = getMesesDisponiveis();
  const [mesSelecionado, setMesSelecionado] = useState(meses[meses.length - 1] ?? mesAtual());
  const [editandoTarifa, setEditandoTarifa] = useState(false);
  const [inputValor, setInputValor] = useState("");
  const [inputMes, setInputMes] = useState(mesAtual());
  const [expandedRepId, setExpandedRepId] = useState<string | null>(null);
  const [inputTarifaRep, setInputTarifaRep] = useState("");
  const [papel, setPapel] = useState<"rh" | string>("rh");

  const gestorAtual = papel !== "rh" ? gestores.find(g => g.id === papel) : null;

  const repsFiltrados = gestorAtual
    ? representantes.filter(r => r.setor === gestorAtual.setor)
    : representantes;

  const saldos = reembolsos
    .filter(r => r.mes === mesSelecionado)
    .map((r) => {
      const tarifa = getTarifaRep(r.repId, r.mes);
      return { ...r, ...calcularSaldo(r.investimentoGasolina, r.kmRealizados, tarifa), tarifa };
    })
    .filter(r => repsFiltrados.some(rep => rep.id === r.repId));

  const totalKmRodados = saldos.reduce((acc, r) => acc + r.kmRealizados, 0);
  const totalInvestido = saldos.reduce((acc, r) => acc + r.investimentoGasolina, 0);
  const repsComAlerta = saldos.filter((r) => r.saldoReais < 0);

  const titulo = gestorAtual ? `Painel — ${gestorAtual.setor}` : "Painel Geral";

  function salvarTarifa() {
    const valor = parseFloat(inputValor.replace(",", "."));
    if (!isNaN(valor) && valor > 0 && inputMes) {
      adicionarTarifa(valor, inputMes);
      setEditandoTarifa(false);
      setInputValor("");
    }
  }

  function salvarTarifaRep(repId: string) {
    const valor = parseFloat(inputTarifaRep.replace(",", "."));
    if (!isNaN(valor) && valor > 0) {
      setTarifaRep(repId, valor);
      setExpandedRepId(null);
      setInputTarifaRep("");
    }
  }

  const historicoOrdenado = [...historico].sort((a, b) => b.inicio.localeCompare(a.inicio));

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-black text-lz-black">{titulo}</h1>
        <p className="text-gray-500 text-sm">{formatarMes(mesSelecionado)} · {repsFiltrados.length} representantes</p>
      </div>

      {/* Seletor de papel (demo) */}
      <div className="flex flex-col gap-1">
        <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider">Visualizando como</p>
        <div className="flex gap-2 overflow-x-auto pb-1">
          <button
            onClick={() => setPapel("rh")}
            className={`shrink-0 px-4 py-2 rounded-full text-xs font-bold transition-colors ${papel === "rh" ? "bg-lz-black text-lz-green" : "bg-white text-gray-400 border border-gray-200"}`}
          >
            RH — Todos
          </button>
          {gestores.map(g => (
            <button
              key={g.id}
              onClick={() => setPapel(g.id)}
              className={`shrink-0 px-4 py-2 rounded-full text-xs font-bold transition-colors ${papel === g.id ? "bg-lz-black text-lz-green" : "bg-white text-gray-400 border border-gray-200"}`}
            >
              Gestor: {g.setor}
            </button>
          ))}
        </div>
      </div>

      {/* Filtro de mês */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {meses.map((mes) => (
          <button
            key={mes}
            onClick={() => setMesSelecionado(mes)}
            className={`shrink-0 px-4 py-2 rounded-full text-sm font-bold transition-colors ${mes === mesSelecionado ? "bg-lz-green text-lz-black" : "bg-white text-gray-400 border border-gray-200"}`}
          >
            {formatarMes(mes)}
          </button>
        ))}
      </div>

      {repsComAlerta.length > 0 && (
        <div className="bg-lz-red rounded-2xl p-4">
          <p className="font-bold text-white text-sm mb-2">
            ⚠️ {repsComAlerta.length} representante(s) com saldo negativo
          </p>
          {repsComAlerta.map((r) => {
            const rep = representantes.find((rp) => rp.id === r.repId);
            return (
              <p key={r.id} className="text-white/80 text-xs">
                {rep?.nome} — saldo {formatarReais(r.saldoReais)}
              </p>
            );
          })}
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white rounded-2xl p-4">
          <p className="text-xs text-gray-400 mb-1">Total KM rodados</p>
          <p className="text-xl font-black text-lz-black">{formatarKm(totalKmRodados)}</p>
        </div>
        <div className="bg-white rounded-2xl p-4">
          <p className="text-xs text-gray-400 mb-1">Total investido</p>
          <p className="text-xl font-black text-lz-black">{formatarReais(totalInvestido)}</p>
        </div>
      </div>

      {/* Configuração de tarifa global */}
      <div className="bg-white rounded-2xl p-5 flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-bold text-sm text-lz-black">Tarifa padrão por KM</p>
            <p className="text-xs text-gray-400">Válida para todos sem tarifa personalizada</p>
          </div>
          {!editandoTarifa && (
            <button
              onClick={() => { setInputValor(""); setInputMes(mesAtual()); setEditandoTarifa(true); }}
              className="text-xs font-bold text-lz-black border-2 border-lz-black px-3 py-1.5 rounded-full hover:bg-lz-black hover:text-lz-green transition-colors"
            >
              Nova vigência
            </button>
          )}
        </div>

        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-black text-lz-black">{formatarReais(tarifaAtual)}</span>
          <span className="text-gray-400 text-sm">/km</span>
          <span className="text-xs bg-lz-green text-lz-black px-2 py-0.5 rounded-full font-semibold ml-1">vigente</span>
        </div>

        {editandoTarifa && (
          <div className="flex flex-col gap-3 border-t border-gray-100 pt-4">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Nova vigência global</p>
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="text-xs text-gray-400 block mb-1">Novo valor (R$/km)</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">R$</span>
                  <input
                    type="number"
                    inputMode="decimal"
                    step="0.01"
                    value={inputValor}
                    onChange={(e) => setInputValor(e.target.value)}
                    placeholder="0,00"
                    className="w-full border-2 border-gray-200 rounded-xl pl-9 pr-3 py-2.5 text-sm font-bold focus:border-lz-green outline-none"
                    autoFocus
                  />
                </div>
              </div>
              <div className="flex-1">
                <label className="text-xs text-gray-400 block mb-1">A partir de</label>
                <input
                  type="month"
                  value={inputMes}
                  onChange={(e) => setInputMes(e.target.value)}
                  className="w-full border-2 border-gray-200 rounded-xl px-3 py-2.5 text-sm font-bold focus:border-lz-green outline-none"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={salvarTarifa}
                disabled={!inputValor || parseFloat(inputValor.replace(",", ".")) <= 0}
                className="flex-1 bg-lz-green text-lz-black font-bold py-3 rounded-full text-sm disabled:opacity-40"
              >
                Salvar
              </button>
              <button
                onClick={() => setEditandoTarifa(false)}
                className="flex-1 bg-gray-100 text-gray-600 font-bold py-3 rounded-full text-sm"
              >
                Cancelar
              </button>
            </div>
          </div>
        )}

        {historicoOrdenado.length > 1 && (
          <div className="border-t border-gray-100 pt-4">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Histórico</p>
            <div className="flex flex-col gap-1.5">
              {historicoOrdenado.map((v, i) => (
                <div key={v.inicio} className="flex justify-between items-center">
                  <span className="text-sm text-gray-500">
                    A partir de <strong className="text-lz-black">{formatarMes(v.inicio)}</strong>
                  </span>
                  <span className={`font-bold text-sm ${i === 0 ? "text-lz-black" : "text-gray-400"}`}>
                    {formatarReais(v.valor)}/km
                    {v.valor === TARIFA_DEFAULT && i !== 0 && (
                      <span className="text-xs text-gray-300 ml-1">(padrão)</span>
                    )}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <Link
        href="/rh/analises"
        className="bg-lz-green text-lz-black font-bold py-4 rounded-2xl text-center text-sm flex items-center justify-center gap-2"
      >
        Ver análises detalhadas →
      </Link>

      {/* Lista de representantes */}
      <div>
        <h2 className="text-base font-bold text-lz-black mb-3">Representantes</h2>
        <div className="flex flex-col gap-3">
          {repsFiltrados.map((rep) => {
            const saldo = saldos.find((s) => s.repId === rep.id);
            const sobrou = saldo ? saldo.saldoReais >= 0 : true;
            const tarifaCustom = tarifasPorRep[rep.id];
            const isExpanded = expandedRepId === rep.id;

            return (
              <div key={rep.id} className="bg-white rounded-2xl overflow-hidden">
                <Link
                  href={`/rh/${rep.id}`}
                  className="p-4 flex items-center justify-between hover:bg-gray-50 transition-colors block"
                >
                  <div>
                    <p className="font-bold text-sm text-lz-black">{rep.nome}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <p className="text-xs text-gray-400">{rep.setor}</p>
                      {tarifaCustom !== undefined && (
                        <span className="text-xs bg-lz-green text-lz-black px-2 py-0.5 rounded-full font-semibold">
                          {formatarReais(tarifaCustom)}/km
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    {saldo ? (
                      <>
                        <p className={`font-bold text-sm ${sobrou ? "text-lz-green" : "text-lz-red"}`}>
                          {formatarReais(saldo.saldoReais)}
                        </p>
                        <p className="text-xs text-gray-400">{formatarKm(saldo.kmRealizados)} rodados</p>
                      </>
                    ) : (
                      <p className="text-xs text-gray-400">Sem dados</p>
                    )}
                  </div>
                </Link>

                {/* Botão tarifa personalizada */}
                <div className="border-t border-gray-100 px-4 py-2">
                  {isExpanded ? (
                    <div className="flex gap-2 py-1">
                      <div className="relative flex-1">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs">R$</span>
                        <input
                          type="number"
                          inputMode="decimal"
                          step="0.01"
                          value={inputTarifaRep}
                          onChange={(e) => setInputTarifaRep(e.target.value)}
                          placeholder={tarifaCustom ? String(tarifaCustom) : "tarifa personalizada"}
                          autoFocus
                          className="w-full border-2 border-gray-200 rounded-xl pl-8 pr-3 py-2 text-sm font-bold focus:border-lz-green outline-none"
                        />
                      </div>
                      <button
                        onClick={() => salvarTarifaRep(rep.id)}
                        disabled={!inputTarifaRep || parseFloat(inputTarifaRep.replace(",", ".")) <= 0}
                        className="bg-lz-green text-lz-black font-bold px-4 py-2 rounded-full text-xs disabled:opacity-40"
                      >
                        Salvar
                      </button>
                      <button
                        onClick={() => { setExpandedRepId(null); setInputTarifaRep(""); }}
                        className="text-gray-400 text-xs px-2"
                      >
                        ✕
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => { setExpandedRepId(rep.id); setInputTarifaRep(""); }}
                      className="text-xs text-gray-400 hover:text-lz-black transition-colors py-1"
                    >
                      {tarifaCustom ? `✏️ Tarifa: ${formatarReais(tarifaCustom)}/km` : "＋ Definir tarifa personalizada"}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
