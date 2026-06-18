"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { formatarKm, formatarReais } from "@/lib/utils";
import { useTarifa } from "@/lib/tarifa-context";
import { usePerfil } from "@/lib/use-perfil";
import { fetchMeuRep, criarViagem } from "@/lib/dados";
import { createClient } from "@/lib/supabase/client";

type Coordenada = { lat: number; lon: number };
type Etapa = "idle" | "solicitando-gps" | "em-andamento" | "calculando" | "confirmar" | "manual";

// Abaixo disso a viagem provavelmente terminou perto da partida (ida e volta
// ou ficou parado) — o cálculo direto saída→chegada não soma a volta.
const KM_SUSPEITO = 0.5;

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
  const { perfil } = usePerfil();
  const { tarifaAtual: tarifa } = useTarifa();
  const [repId, setRepId] = useState<string | null>(null);
  const [etapa, setEtapa] = useState<Etapa>("idle");
  const [inicio, setInicio] = useState<Coordenada | null>(null);
  const [cliente, setCliente] = useState("");
  const [kmCalculado, setKmCalculado] = useState<number | null>(null);
  const [enderecoSaida, setEnderecoSaida] = useState("");
  const [enderecoChegada, setEnderecoChegada] = useState("");
  const [buscandoEndereco, setBuscandoEndereco] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  // Só liberamos a entrada manual quando o GPS falha — fica escondida no fluxo normal.
  const [gpsFalhou, setGpsFalhou] = useState(false);
  const [kmManual, setKmManual] = useState("");

  // Identifica o rep logado para gravar a viagem em nome dele
  useEffect(() => {
    if (perfil?.papel === "rep") fetchMeuRep(perfil.email).then((r) => setRepId(r?.id ?? null));
  }, [perfil]);

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
            reject(new Error("Permissão de GPS negada. Verifique as configurações do seu navegador."));
          } else if (err.code === err.TIMEOUT) {
            reject(new Error("GPS demorou demais. Tente novamente."));
          } else {
            reject(new Error("Não foi possível obter o GPS. Tente novamente."));
          }
        },
        { timeout: 20000, maximumAge: 0, enableHighAccuracy: true }
      );
    });
  }

  async function iniciarVisita() {
    setErro(null);
    setGpsFalhou(false);
    setEtapa("solicitando-gps");
    try {
      const coords = await obterGPS();
      setInicio(coords);
      setEtapa("em-andamento");

      setBuscandoEndereco(true);
      const endereco = await geocodificar(coords.lat, coords.lon);
      setEnderecoSaida(endereco ?? `${coords.lat.toFixed(5)}, ${coords.lon.toFixed(5)}`);
      setBuscandoEndereco(false);
    } catch (e: unknown) {
      setErro(e instanceof Error ? e.message : "Erro ao obter GPS.");
      setGpsFalhou(true);
      setEtapa("idle");
    }
  }

  async function finalizarVisita() {
    setErro(null);
    setGpsFalhou(false);
    setEtapa("calculando");
    try {
      const coords = await obterGPS();

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

      if (!rotaRes.ok) throw new Error("Erro ao calcular rota. Tente novamente.");
      const data = await rotaRes.json();
      setKmCalculado(data.kmRodados);
      setEnderecoChegada(enderecoFim ?? `${coords.lat.toFixed(5)}, ${coords.lon.toFixed(5)}`);
      setEtapa("confirmar");
    } catch (e: unknown) {
      setErro(e instanceof Error ? e.message : "Erro desconhecido.");
      setGpsFalhou(true);
      setEtapa("em-andamento");
    }
  }

  // Salva a viagem. Centraliza a checagem de sessão e o tratamento de erro real,
  // usado tanto pelo fluxo por GPS quanto pela entrada manual.
  async function salvar(km: number) {
    if (!repId) {
      setErro("Não foi possível identificar seu cadastro. Recarregue e tente de novo.");
      return;
    }
    setSalvando(true);
    setErro(null);
    try {
      // A sessão pode ter expirado durante a viagem (token JWT ~1h). Sem isso,
      // o insert sai sem autenticação e a RLS rejeita — sem dar pista do motivo.
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setErro("Sua sessão expirou durante a viagem. Faça login de novo — os dados aqui continuam salvos, é só confirmar de novo.");
        setSalvando(false);
        return;
      }

      await criarViagem(repId, {
        cliente: cliente.trim(),
        kmRodados: km,
        valorKm: tarifa,
        enderecoSaida: enderecoSaida || undefined,
        enderecoChegada: enderecoChegada || undefined,
      });
      router.push("/rep");
    } catch (e: unknown) {
      // Não engolir o erro: logar o real e traduzir pra uma mensagem útil.
      // O Supabase lança um objeto { code, message, details, hint }, não um Error —
      // por isso extraímos os campos em vez de fazer String(e) ([object Object]).
      console.error("Falha ao salvar viagem:", e);
      const err = (e ?? {}) as { message?: string; code?: string; details?: string; hint?: string };
      const msg = err.message || (e instanceof Error ? e.message : String(e));
      const code = err.code || "";
      const alvo = `${code} ${msg}`;
      if (typeof navigator !== "undefined" && !navigator.onLine) {
        setErro("Sem conexão agora. A viagem continua aqui — reconecte e toque em salvar de novo.");
      } else if (/jwt|sess|expired|not authenticated/i.test(alvo)) {
        setErro("Sua sessão expirou. Faça login de novo — os dados aqui continuam, é só confirmar de novo.");
      } else if (/42501|row-level security/i.test(alvo)) {
        setErro("O banco recusou a gravação (permissão/cadastro). Avise o suporte com este código: 42501.");
      } else {
        setErro(`Não foi possível salvar a viagem. [${code || "erro"}] ${msg}`);
      }
      setSalvando(false);
    }
  }

  function confirmarVisita() {
    if (kmCalculado === null) return;
    salvar(kmCalculado);
  }

  // Liberada só quando o GPS falha: registra a viagem com os km digitados à mão.
  function entrarModoManual() {
    setErro(null);
    setEtapa("manual");
  }

  function confirmarManual() {
    const km = parseFloat(kmManual.replace(",", "."));
    if (!cliente.trim()) {
      setErro("Informe o nome do cliente.");
      return;
    }
    if (!Number.isFinite(km) || km <= 0) {
      setErro("Informe os km rodados (um número maior que zero).");
      return;
    }
    salvar(km);
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-black text-lz-black">Nova visita</h1>
        <p className="text-gray-500 text-sm">GPS calcula a distância automaticamente</p>
      </div>

      {erro && (
        <div className="bg-red-50 border border-lz-red rounded-xl p-4 text-sm text-lz-red">{erro}</div>
      )}

      {gpsFalhou && etapa !== "manual" && etapa !== "confirmar" && (
        <button
          onClick={entrarModoManual}
          className="border-2 border-lz-black text-lz-black font-bold py-3 rounded-full text-sm"
        >
          Registrar viagem manualmente
        </button>
      )}

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
            </div>
          </div>
          {kmCalculado < KM_SUSPEITO && (
            <div className="bg-yellow-50 border border-yellow-400 rounded-xl p-4 text-sm text-yellow-800">
              A distância deu <span className="font-bold">{formatarKm(kmCalculado)}</span> — bem baixa. Se você
              voltou ao ponto de partida, o cálculo direto (saída → chegada) não soma a ida e a volta. Confira
              antes de salvar.
            </div>
          )}
          <button
            onClick={confirmarVisita}
            disabled={salvando}
            className="bg-lz-green text-lz-black font-bold py-4 rounded-full text-lg disabled:opacity-40"
          >
            {salvando ? "Salvando..." : "Confirmar e salvar"}
          </button>
        </div>
      )}

      {etapa === "manual" && (() => {
        const kmNum = parseFloat(kmManual.replace(",", "."));
        const kmValido = Number.isFinite(kmNum) && kmNum > 0;
        return (
          <div className="flex flex-col gap-4">
            <div className="bg-white rounded-2xl p-5">
              <p className="font-bold text-lz-black text-sm mb-1">Registro manual</p>
              <p className="text-xs text-gray-400">
                O GPS falhou. Preencha os dados da viagem à mão — o valor é calculado pela tarifa por km.
              </p>
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
            <div>
              <label className="text-sm font-semibold text-lz-black block mb-1">Endereço de saída (opcional)</label>
              <input
                type="text"
                value={enderecoSaida}
                onChange={(e) => setEnderecoSaida(e.target.value)}
                placeholder="De onde você saiu"
                className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-sm focus:border-lz-green outline-none bg-white"
              />
            </div>
            <div>
              <label className="text-sm font-semibold text-lz-black block mb-1">Endereço de chegada (opcional)</label>
              <input
                type="text"
                value={enderecoChegada}
                onChange={(e) => setEnderecoChegada(e.target.value)}
                placeholder="Onde você chegou"
                className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-sm focus:border-lz-green outline-none bg-white"
              />
            </div>
            <div>
              <label className="text-sm font-semibold text-lz-black block mb-1">KM rodados</label>
              <input
                type="number"
                inputMode="decimal"
                value={kmManual}
                onChange={(e) => setKmManual(e.target.value)}
                placeholder="Ex: 42.5"
                className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-sm focus:border-lz-green outline-none bg-white"
              />
            </div>
            {kmValido && (
              <div className="bg-white rounded-2xl p-5 flex justify-between">
                <span className="text-sm text-gray-500">Valor estimado</span>
                <span className="font-bold text-lz-green">{formatarReais(kmNum * tarifa)}</span>
              </div>
            )}
            <button
              onClick={confirmarManual}
              disabled={salvando}
              className="bg-lz-green text-lz-black font-bold py-4 rounded-full text-lg disabled:opacity-40"
            >
              {salvando ? "Salvando..." : "Confirmar e salvar"}
            </button>
          </div>
        );
      })()}
    </div>
  );
}
