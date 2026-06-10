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
