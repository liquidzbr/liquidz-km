"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { formatarKm, formatarReais } from "@/lib/utils";
import { useTarifa } from "@/lib/tarifa-context";

type Coordenada = { lat: number; lon: number };
type Etapa = "idle" | "solicitando-gps" | "em-andamento" | "calculando" | "confirmar";
type Modo = "gps" | "manual";

async function geocodificar(lat: number, lon: number): Promise<string | null> {
  try {
    const res = await fetch(`/api/geocodificar?lat=${lat}&lon=${lon}`);
    if (!res.ok) return null;
    const data = await res.json();
    return data.endereco ?? null;
  } catch {
    return null;
  }
}

export default function NovaVisita() {
  const router = useRouter();
  const { tarifa } = useTarifa();
  const [modo, setModo] = useState<Modo>("gps");
  const [etapa, setEtapa] = useState<Etapa>("idle");
  const [inicio, setInicio] = useState<Coordenada | null>(null);
  const [cliente, setCliente] = useState("");
  const [kmCalculado, setKmCalculado] = useState<number | null>(null);
  const [kmManual, setKmManual] = useState("");
  const [enderecoSaida, setEnderecoSaida] = useState("");
  const [enderecoChegada, setEnderecoChegada] = useState("");
  const [buscandoEndereco, setBuscandoEndereco] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  function obterGPS(): Promise<Coordenada> {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error("GPS não disponível neste dispositivo."));
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
        (err) => {
          if (err.code === err.PERMISSION_DENIED) {
            reject(new Error("Permissão negada. Use o modo manual abaixo."));
          } else if (err.code === err.TIMEOUT) {
            reject(new Error("GPS demorou demais. Tente novamente ou use o modo manual."));
          } else {
            reject(new Error("Não foi possível obter o GPS. Use o modo manual abaixo."));
          }
        },
        { timeout: 20000, maximumAge: 0, enableHighAccuracy: true }
      );
    });
  }

  async function iniciarVisita() {
    setErro(null);
    setEtapa("solicitando-gps");
    try {
      const coords = await obterGPS();
      setInicio(coords);
      setEtapa("em-andamento");

      // busca endereço em paralelo, sem bloquear o fluxo
      setBuscandoEndereco(true);
      const endereco = await geocodificar(coords.lat, coords.lon);
      setEnderecoSaida(endereco ?? `${coords.lat.toFixed(5)}, ${coords.lon.toFixed(5)}`);
      setBuscandoEndereco(false);
    } catch (e: unknown) {
      setErro(e instanceof Error ? e.message : "Erro ao obter GPS.");
      setEtapa("idle");
    }
  }

  async function finalizarVisita() {
    setErro(null);
    setEtapa("calculando");
    try {
      const coords = await obterGPS();

      // cálculo de rota e geocodificação em paralelo
      const [rotaRes, enderecoFim] = await Promise.all([
        fetch("/api/calcular-rota", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            latInicio: inicio!.lat,
            lonInicio: inicio!.lon,
            latFim: coords.lat,
            lonFim: coords.lon,
          }),
        }),
        geocodificar(coords.lat, coords.lon),
      ]);

      if (!rotaRes.ok) throw new Error("Erro ao calcular rota. Use o modo manual.");
      const data = await rotaRes.json();
      setKmCalculado(data.kmRodados);
      setEnderecoChegada(enderecoFim ?? `${coords.lat.toFixed(5)}, ${coords.lon.toFixed(5)}`);
      setEtapa("confirmar");
    } catch (e: unknown) {
      setErro(e instanceof Error ? e.message : "Erro desconhecido.");
      setEtapa("em-andamento");
    }
  }

  function confirmarManual() {
    const km = parseFloat(kmManual.replace(",", "."));
    if (isNaN(km) || km <= 0) return;
    setKmCalculado(km);
    setEtapa("confirmar");
  }

  function confirmarVisita() {
    router.push("/rep");
  }

  const isHTTP = typeof window !== "undefined" && window.location.protocol === "http:" && window.location.hostname !== "localhost";

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-black text-lz-black">Nova visita</h1>
        <p className="text-gray-500 text-sm">
          {modo === "gps" ? "GPS calcula a distância automaticamente" : "Informe os dados manualmente"}
        </p>
      </div>

      {isHTTP && modo === "gps" && (
        <div className="bg-amber-50 border border-amber-300 rounded-xl p-4 text-sm text-amber-800">
          <strong>GPS limitado:</strong> Para usar o GPS no celular via rede local, o app precisa de HTTPS.
          Use o modo manual ou acesse pelo próprio dispositivo que roda o servidor.
        </div>
      )}

      {erro && (
        <div className="bg-red-50 border border-lz-red rounded-xl p-4 text-sm text-lz-red">{erro}</div>
      )}

      {etapa === "idle" && (
        <div className="flex bg-white rounded-full p-1 border-2 border-gray-100">
          <button
            onClick={() => { setModo("gps"); setErro(null); }}
            className={`flex-1 py-2 rounded-full text-sm font-bold transition-colors ${modo === "gps" ? "bg-lz-black text-lz-green" : "text-gray-400"}`}
          >
            📍 Com GPS
          </button>
          <button
            onClick={() => { setModo("manual"); setErro(null); }}
            className={`flex-1 py-2 rounded-full text-sm font-bold transition-colors ${modo === "manual" ? "bg-lz-black text-lz-green" : "text-gray-400"}`}
          >
            ✏️ Manual
          </button>
        </div>
      )}

      {/* Modo GPS */}
      {modo === "gps" && (
        <>
          {etapa === "idle" && (
            <div className="flex flex-col gap-4">
              <div className="bg-white rounded-2xl p-5 text-center">
                <p className="text-4xl mb-3">📍</p>
                <p className="font-semibold text-lz-black">Clique em Iniciar quando sair para a visita</p>
                <p className="text-xs text-gray-400 mt-1">O app captura seu ponto de partida e busca o endereço</p>
              </div>
              <button onClick={iniciarVisita} className="bg-lz-green text-lz-black font-bold py-4 rounded-full text-lg">
                Iniciar visita
              </button>
            </div>
          )}

          {etapa === "solicitando-gps" && (
            <div className="bg-white rounded-2xl p-8 text-center">
              <div className="w-8 h-8 border-4 border-lz-green border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="font-semibold text-lz-black">Aguardando permissão de GPS...</p>
              <p className="text-xs text-gray-400 mt-2">Aceite o pedido de localização no navegador</p>
            </div>
          )}

          {etapa === "em-andamento" && (
            <div className="flex flex-col gap-4">
              <div className="bg-lz-green rounded-2xl p-5">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-lz-black animate-pulse" />
                  <p className="font-bold text-lz-black text-sm">Visita em andamento</p>
                </div>
                {buscandoEndereco ? (
                  <p className="text-xs text-black/50">Buscando endereço de saída...</p>
                ) : enderecoSaida ? (
                  <p className="text-xs text-black/70">
                    <span className="font-semibold">Saída:</span> {enderecoSaida}
                  </p>
                ) : null}
              </div>
              <div>
                <label className="text-sm font-semibold text-lz-black block mb-1">Nome do cliente</label>
                <input
                  type="text"
                  value={cliente}
                  onChange={(e) => setCliente(e.target.value)}
                  placeholder="Ex: Mercado Central"
                  className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-sm focus:border-lz-green outline-none bg-white"
                />
              </div>
              <button
                onClick={finalizarVisita}
                disabled={!cliente.trim()}
                className="bg-lz-black text-lz-green font-bold py-4 rounded-full text-lg disabled:opacity-40"
              >
                Finalizar visita
              </button>
            </div>
          )}

          {etapa === "calculando" && (
            <div className="bg-white rounded-2xl p-8 text-center">
              <div className="w-8 h-8 border-4 border-lz-green border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="font-semibold text-lz-black">Calculando rota e endereço de chegada...</p>
            </div>
          )}
        </>
      )}

      {/* Modo Manual */}
      {modo === "manual" && etapa !== "confirmar" && (
        <div className="flex flex-col gap-4">
          <div className="bg-white rounded-2xl p-5 flex flex-col gap-4">
            <div>
              <label className="text-sm font-semibold text-lz-black block mb-1">Endereço de saída</label>
              <input
                type="text"
                value={enderecoSaida}
                onChange={(e) => setEnderecoSaida(e.target.value)}
                placeholder="Ex: Rua das Flores, 100 — São Paulo"
                className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-sm focus:border-lz-green outline-none"
              />
            </div>
            <div>
              <label className="text-sm font-semibold text-lz-black block mb-1">Endereço de chegada</label>
              <input
                type="text"
                value={enderecoChegada}
                onChange={(e) => setEnderecoChegada(e.target.value)}
                placeholder="Ex: Av. Paulista, 1500 — São Paulo"
                className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-sm focus:border-lz-green outline-none"
              />
            </div>
            <div>
              <label className="text-sm font-semibold text-lz-black block mb-1">KM rodados</label>
              <input
                type="number"
                inputMode="decimal"
                value={kmManual}
                onChange={(e) => setKmManual(e.target.value)}
                placeholder="Ex: 42"
                className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-sm focus:border-lz-green outline-none"
              />
            </div>
            <div>
              <label className="text-sm font-semibold text-lz-black block mb-1">Nome do cliente</label>
              <input
                type="text"
                value={cliente}
                onChange={(e) => setCliente(e.target.value)}
                placeholder="Ex: Mercado Central"
                className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-sm focus:border-lz-green outline-none"
              />
            </div>
            {parseFloat(kmManual.replace(",", ".")) > 0 && (
              <div className="bg-lz-bg rounded-xl p-3 flex justify-between items-center">
                <span className="text-sm text-gray-500">Valor KM</span>
                <span className="font-bold text-lz-green">
                  {formatarReais(parseFloat(kmManual.replace(",", ".")) * tarifa)}
                </span>
              </div>
            )}
          </div>
          <button
            onClick={confirmarManual}
            disabled={
              !enderecoSaida.trim() || !enderecoChegada.trim() ||
              !cliente.trim() || !kmManual ||
              parseFloat(kmManual.replace(",", ".")) <= 0
            }
            className="bg-lz-green text-lz-black font-bold py-4 rounded-full text-lg disabled:opacity-40"
          >
            Continuar
          </button>
        </div>
      )}

      {/* Confirmação final */}
      {etapa === "confirmar" && kmCalculado !== null && (
        <div className="flex flex-col gap-4">
          <div className="bg-white rounded-2xl p-5">
            <p className="text-xs text-gray-400 mb-3 uppercase tracking-wider">Resumo da visita</p>
            <div className="flex flex-col gap-3">
              <div className="flex justify-between">
                <span className="text-sm text-gray-500">Cliente</span>
                <span className="font-semibold text-sm">{cliente}</span>
              </div>
              {enderecoSaida && (
                <div className="flex justify-between gap-4">
                  <span className="text-sm text-gray-500 shrink-0">Saída</span>
                  <span className="text-sm text-right text-lz-black">{enderecoSaida}</span>
                </div>
              )}
              {enderecoChegada && (
                <div className="flex justify-between gap-4">
                  <span className="text-sm text-gray-500 shrink-0">Chegada</span>
                  <span className="text-sm text-right text-lz-black">{enderecoChegada}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-sm text-gray-500">KM rodados</span>
                <span className="font-bold text-lz-black">{formatarKm(kmCalculado)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-500">Valor KM</span>
                <span className="font-bold text-lz-green">{formatarReais(kmCalculado * tarifa)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-500">Modo</span>
                <span className="text-xs text-gray-400">{modo === "gps" ? "GPS automático" : "Manual"}</span>
              </div>
            </div>
          </div>
          <button onClick={confirmarVisita} className="bg-lz-green text-lz-black font-bold py-4 rounded-full text-lg">
            Confirmar e salvar
          </button>
        </div>
      )}
    </div>
  );
}
