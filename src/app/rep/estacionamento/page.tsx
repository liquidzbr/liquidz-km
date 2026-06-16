"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { formatarReais } from "@/lib/utils";
import { usePerfil } from "@/lib/use-perfil";
import { fetchMeuRep, criarEstacionamento } from "@/lib/dados";

export default function RegistrarEstacionamento() {
  const router = useRouter();
  const { perfil } = usePerfil();
  const [repId, setRepId] = useState<string | null>(null);
  const [local, setLocal] = useState("");
  const [valor, setValor] = useState("");
  const [foto, setFoto] = useState<File | null>(null);
  const [fotoPreview, setFotoPreview] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [salvo, setSalvo] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  // Identifica o rep logado
  useEffect(() => {
    if (perfil?.papel === "rep") fetchMeuRep(perfil.email).then((r) => setRepId(r?.id ?? null));
  }, [perfil]);

  const valorNum = parseFloat(valor.replace(",", ".")) || 0;
  const podeEnviar = local.trim().length > 0 && valorNum > 0 && foto !== null && repId !== null && !salvando;

  function onFotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFoto(file);
    const reader = new FileReader();
    reader.onload = (ev) => setFotoPreview(ev.target?.result as string);
    reader.readAsDataURL(file);
  }

  async function salvar() {
    if (!repId || !foto) return;
    setSalvando(true);
    setErro(null);
    try {
      await criarEstacionamento(repId, local.trim(), valorNum, foto, Date.now());
      setSalvo(true);
      setTimeout(() => router.push("/rep"), 1500);
    } catch {
      setErro("Não foi possível salvar. Tente novamente.");
      setSalvando(false);
    }
  }

  if (salvo) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div className="w-16 h-16 rounded-full bg-lz-green flex items-center justify-center text-2xl">✓</div>
        <p className="font-bold text-lz-black text-lg">Estacionamento registrado!</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-black text-lz-black">Registrar estacionamento</h1>
        <p className="text-gray-500 text-sm">Informe os dados e anexe o comprovante</p>
      </div>

      <div className="flex flex-col gap-4">
        <div>
          <label className="text-sm font-semibold text-lz-black block mb-1">Local</label>
          <input
            type="text"
            value={local}
            onChange={(e) => setLocal(e.target.value)}
            placeholder="Ex: Estacionamento Shopping Central"
            className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-sm focus:border-lz-green outline-none bg-white"
          />
        </div>

        <div>
          <label className="text-sm font-semibold text-lz-black block mb-1">Valor pago (R$)</label>
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
          <label className="text-sm font-semibold text-lz-black block mb-2">
            Comprovante <span className="text-lz-red text-xs font-normal">* obrigatório</span>
          </label>
          {fotoPreview ? (
            <div className="relative">
              <img src={fotoPreview} alt="Comprovante" className="w-full rounded-xl object-cover max-h-52" />
              <button
                onClick={() => { setFoto(null); setFotoPreview(null); }}
                className="absolute top-2 right-2 bg-black/60 text-white text-xs px-3 py-1 rounded-full"
              >
                Trocar foto
              </button>
            </div>
          ) : (
            <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-xl cursor-pointer bg-white hover:border-lz-green transition-colors">
              <span className="text-3xl mb-2">📷</span>
              <span className="text-sm text-gray-400">Toque para tirar foto ou escolher arquivo</span>
              <input
                type="file"
                accept="image/*"
                onChange={onFotoChange}
                className="hidden"
              />
            </label>
          )}
        </div>
      </div>

      {valorNum > 0 && (
        <div className="bg-lz-green rounded-2xl p-4">
          <p className="text-xs text-black/60 uppercase tracking-wider mb-1">Total do estacionamento</p>
          <p className="text-2xl font-black text-lz-black">{formatarReais(valorNum)}</p>
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

      {!podeEnviar && !salvando && (local || valorNum > 0) && (
        <p className="text-center text-xs text-gray-400">
          {!foto ? "Adicione o comprovante para salvar" : "Preencha todos os campos"}
        </p>
      )}
    </div>
  );
}
