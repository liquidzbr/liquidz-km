export const TARIFA_DEFAULT = 0.90;

export function calcularKmCobertos(investimentoGasolina: number, tarifa: number): number {
  return investimentoGasolina / tarifa;
}

export function calcularSaldo(investimentoGasolina: number, kmRealizados: number, tarifa: number) {
  const kmCobertos = calcularKmCobertos(investimentoGasolina, tarifa);
  const saldoKm = kmCobertos - kmRealizados;
  const saldoReais = saldoKm * tarifa;
  return { kmCobertos, saldoKm, saldoReais };
}

export function formatarReais(valor: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(valor);
}

export function formatarKm(km: number): string {
  return `${km.toFixed(1)} km`;
}

export function formatarData(iso: string): string {
  return new Date(iso).toLocaleDateString("pt-BR");
}

// ---------------------------------------------------------------------------
// Data — sempre no fuso de São Paulo.
//
// Não usar `new Date().toISOString()` para "hoje" ou "mês atual": o ISO é UTC,
// então das 21h às 23h59 em SP o app já está no dia (e às vezes no mês) seguinte.
// No último dia do mês isso jogaria o lançamento para o mês errado.
// "en-CA" é usado porque formata como YYYY-MM-DD, que é o formato das colunas.
const FUSO = "America/Sao_Paulo";

/** Hoje em SP, como "YYYY-MM-DD". */
export function hojeISO(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: FUSO,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

/** Mês corrente em SP, como "YYYY-MM". É a chave usada em reembolsos.mes. */
export function mesAtual(): string {
  return hojeISO().slice(0, 7);
}

/** "2026-08" → "Agosto de 2026". Para títulos. */
export function formatarMesExtenso(mes: string): string {
  const [ano, m] = mes.split("-");
  const nome = new Intl.DateTimeFormat("pt-BR", { month: "long", timeZone: "UTC" })
    .format(new Date(`${ano}-${m}-01T12:00:00Z`));
  return `${nome.charAt(0).toUpperCase()}${nome.slice(1)} de ${ano}`;
}

/** "2026-08" → "agosto". Para frases no meio do texto. */
export function nomeDoMes(mes: string): string {
  return formatarMesExtenso(mes).split(" de ")[0].toLowerCase();
}
