"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { calcularKmCobertos, formatarReais, formatarKm } from "@/lib/utils";
import { useTarifa } from "@/lib/tarifa-context";

export default function RegistrarGasto() {
  const router = useRouter();
  const { tarifa } = useTarifa();
  const [valor, setValor] = useState("");
  const [salvo, setSalvo] = useState(false);

  const valorNum = parseFloat(valor.replace(",", ".")) || 0;
  const kmCobertos = valorNum > 0 ? calcularKmCobertos(valorNum, tarifa) : 0;

  function salvar() {
    setSalvo(true);
    setTimeout(() => router.push("/rep"), 1500);
  }

  if (salvo) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div className="w-16 h-16 rounded-full bg-lz-green flex items-center justify-center text-2xl">✓</div>
        <p className="font-bold text-lz-black text-lg">Gasto registrado!</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-black text-lz-black">Registrar gasolina</h1>
        <p className="text-gray-500 text-sm">Informe quanto você investiu em combustível</p>
      </div>

      <div>
        <label className="text-sm font-semibold text-lz-black block mb-1">Valor gasto (R$)</label>
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

      {valorNum > 0 && (
        <div className="bg-lz-green rounded-2xl p-4">
          <p className="text-xs text-black/60 uppercase tracking-wider mb-1">Equivale a</p>
          <p className="text-2xl font-black text-lz-black">{formatarKm(kmCobertos)}</p>
          <p className="text-xs text-black/60 mt-1">pela tarifa de {formatarReais(tarifa)}/km</p>
        </div>
      )}

      <button
        onClick={salvar}
        disabled={valorNum <= 0}
        className="bg-lz-black text-lz-green font-bold py-4 rounded-full text-lg disabled:opacity-40"
      >
        Salvar
      </button>
    </div>
  );
}
