"use client";

import { createContext, useContext, useState, useEffect } from "react";
import { TARIFA_DEFAULT, mesAtual } from "./utils";

export type TarifaVigencia = {
  valor: number;
  inicio: string;
};

type TarifaContextType = {
  historico: TarifaVigencia[];
  tarifaAtual: number;
  getTarifaParaMes: (mes: string) => number;
  adicionarTarifa: (valor: number, inicioMes: string) => void;
  tarifasPorRep: { [repId: string]: number };
  getTarifaRep: (repId: string, mes?: string) => number;
  setTarifaRep: (repId: string, valor: number) => void;
};

const TarifaContext = createContext<TarifaContextType>({
  historico: [{ valor: TARIFA_DEFAULT, inicio: "2020-01" }],
  tarifaAtual: TARIFA_DEFAULT,
  getTarifaParaMes: () => TARIFA_DEFAULT,
  adicionarTarifa: () => {},
  tarifasPorRep: {},
  getTarifaRep: () => TARIFA_DEFAULT,
  setTarifaRep: () => {},
});

const HISTORICO_INICIAL: TarifaVigencia[] = [
  { valor: TARIFA_DEFAULT, inicio: "2020-01" },
];

export function TarifaProvider({ children }: { children: React.ReactNode }) {
  const [historico, setHistorico] = useState<TarifaVigencia[]>(HISTORICO_INICIAL);
  const [tarifasPorRep, setTarifasPorRep] = useState<{ [repId: string]: number }>({});

  useEffect(() => {
    const salvo = localStorage.getItem("liquidz_tarifa_historico");
    if (salvo) {
      try {
        const parsed = JSON.parse(salvo);
        if (Array.isArray(parsed) && parsed.length > 0) setHistorico(parsed);
      } catch {}
    }
    const salvoRep = localStorage.getItem("liquidz_tarifa_por_rep");
    if (salvoRep) {
      try { setTarifasPorRep(JSON.parse(salvoRep)); } catch {}
    }
  }, []);

  function getTarifaParaMes(mes: string): number {
    const ordenado = [...historico].sort((a, b) => b.inicio.localeCompare(a.inicio));
    const vigencia = ordenado.find((v) => v.inicio <= mes);
    return vigencia?.valor ?? TARIFA_DEFAULT;
  }

  function adicionarTarifa(valor: number, inicioMes: string) {
    const novoHistorico = [
      ...historico.filter((v) => v.inicio !== inicioMes),
      { valor, inicio: inicioMes },
    ].sort((a, b) => a.inicio.localeCompare(b.inicio));

    setHistorico(novoHistorico);
    localStorage.setItem("liquidz_tarifa_historico", JSON.stringify(novoHistorico));
  }

  function getTarifaRep(repId: string, mes?: string): number {
    if (tarifasPorRep[repId] !== undefined) return tarifasPorRep[repId];
    return mes ? getTarifaParaMes(mes) : getTarifaParaMes(mesAtual());
  }

  function setTarifaRep(repId: string, valor: number) {
    const updated = { ...tarifasPorRep, [repId]: valor };
    setTarifasPorRep(updated);
    localStorage.setItem("liquidz_tarifa_por_rep", JSON.stringify(updated));
  }

  const tarifaAtual = getTarifaParaMes(mesAtual());

  return (
    <TarifaContext.Provider value={{ historico, tarifaAtual, getTarifaParaMes, adicionarTarifa, tarifasPorRep, getTarifaRep, setTarifaRep }}>
      {children}
    </TarifaContext.Provider>
  );
}

export function useTarifa() {
  return useContext(TarifaContext);
}
