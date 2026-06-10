"use client";

import { createContext, useContext, useState, useEffect } from "react";
import { TARIFA_DEFAULT } from "./utils";

export type TarifaVigencia = {
  valor: number;
  inicio: string; // formato "YYYY-MM" — mês a partir do qual essa tarifa vale
};

type TarifaContextType = {
  historico: TarifaVigencia[];
  tarifaAtual: number;
  getTarifaParaMes: (mes: string) => number;
  adicionarTarifa: (valor: number, inicioMes: string) => void;
};

const TarifaContext = createContext<TarifaContextType>({
  historico: [{ valor: TARIFA_DEFAULT, inicio: "2020-01" }],
  tarifaAtual: TARIFA_DEFAULT,
  getTarifaParaMes: () => TARIFA_DEFAULT,
  adicionarTarifa: () => {},
});

const HISTORICO_INICIAL: TarifaVigencia[] = [
  { valor: TARIFA_DEFAULT, inicio: "2020-01" },
];

export function TarifaProvider({ children }: { children: React.ReactNode }) {
  const [historico, setHistorico] = useState<TarifaVigencia[]>(HISTORICO_INICIAL);

  useEffect(() => {
    const salvo = localStorage.getItem("liquidz_tarifa_historico");
    if (salvo) {
      try {
        const parsed = JSON.parse(salvo);
        if (Array.isArray(parsed) && parsed.length > 0) setHistorico(parsed);
      } catch {}
    }
  }, []);

  function getTarifaParaMes(mes: string): number {
    // ordena do mais recente para o mais antigo e pega a primeira vigência que começa <= ao mês pedido
    const ordenado = [...historico].sort((a, b) => b.inicio.localeCompare(a.inicio));
    const vigencia = ordenado.find((v) => v.inicio <= mes);
    return vigencia?.valor ?? TARIFA_DEFAULT;
  }

  function adicionarTarifa(valor: number, inicioMes: string) {
    // remove qualquer entrada com o mesmo mês de início antes de adicionar
    const novoHistorico = [
      ...historico.filter((v) => v.inicio !== inicioMes),
      { valor, inicio: inicioMes },
    ].sort((a, b) => a.inicio.localeCompare(b.inicio));

    setHistorico(novoHistorico);
    localStorage.setItem("liquidz_tarifa_historico", JSON.stringify(novoHistorico));
  }

  const tarifaAtual = getTarifaParaMes(
    new Date().toISOString().slice(0, 7) // "YYYY-MM" do mês atual
  );

  return (
    <TarifaContext.Provider value={{ historico, tarifaAtual, getTarifaParaMes, adicionarTarifa }}>
      {children}
    </TarifaContext.Provider>
  );
}

export function useTarifa() {
  return useContext(TarifaContext);
}
