export type Viagem = {
  id: string;
  repId: string;
  data: string;
  cliente: string;
  kmRodados: number;
  valorKm: number;
  enderecoSaida?: string;
  enderecoChegada?: string;
};

export type Reembolso = {
  id: string;
  repId: string;
  mes: string;
  investimentoGasolina: number;
  kmRealizados: number;
};

export type Representante = {
  id: string;
  nome: string;
  email: string;
  setor: string;
};

export type Gestor = {
  id: string;
  nome: string;
  email: string;
  setor: string;
};

export type Estacionamento = {
  id: string;
  repId: string;
  data: string;
  local: string;
  valor: number;
  fotoUrl: string;
};

export const gestores: Gestor[] = [
  { id: "gest1", nome: "Carlos Ferreira", email: "carlos@liquidz.com.br", setor: "Sul" },
  { id: "gest2", nome: "Diana Costa", email: "diana@liquidz.com.br", setor: "Sudeste" },
];

export const representantes: Representante[] = [
  { id: "rep1", nome: "Ana Lima", email: "ana@liquidz.com.br", setor: "Sul" },
  { id: "rep2", nome: "Bruno Rocha", email: "bruno@liquidz.com.br", setor: "Sudeste" },
  { id: "rep3", nome: "Carla Mendes", email: "carla@liquidz.com.br", setor: "Centro-Oeste" },
];

export const estacionamentos: Estacionamento[] = [];

export const viagens: Viagem[] = [
  // Junho
  { id: "v1", repId: "rep1", data: "2026-06-02", cliente: "Mercado São Paulo", kmRodados: 34, valorKm: 30.60, enderecoSaida: "Rua das Flores, 100 — Curitiba", enderecoChegada: "Av. Sete de Setembro, 2775 — Curitiba" },
  { id: "v2", repId: "rep1", data: "2026-06-03", cliente: "Farmácia Vida", kmRodados: 18, valorKm: 16.20, enderecoSaida: "Av. Sete de Setembro, 2775 — Curitiba", enderecoChegada: "Rua XV de Novembro, 450 — Curitiba" },
  { id: "v3", repId: "rep1", data: "2026-06-05", cliente: "Supermercado Bom", kmRodados: 52, valorKm: 46.80, enderecoSaida: "Rua XV de Novembro, 450 — Curitiba", enderecoChegada: "Rod. BR-116, km 98 — Colombo" },
  { id: "v4", repId: "rep2", data: "2026-06-01", cliente: "Padaria Central", kmRodados: 12, valorKm: 10.80, enderecoSaida: "Av. Paulista, 1000 — São Paulo", enderecoChegada: "Rua Augusta, 500 — São Paulo" },
  { id: "v5", repId: "rep2", data: "2026-06-04", cliente: "Academia Fit", kmRodados: 67, valorKm: 60.30, enderecoSaida: "Rua Augusta, 500 — São Paulo", enderecoChegada: "Av. Brasil, 2040 — Santo André" },
  { id: "v6", repId: "rep2", data: "2026-06-06", cliente: "Mercadão Norte", kmRodados: 89, valorKm: 80.10, enderecoSaida: "Av. Paulista, 1000 — São Paulo", enderecoChegada: "Av. Zaki Narchi, 700 — Guarulhos" },
  { id: "v7", repId: "rep3", data: "2026-06-03", cliente: "Loja Esporte+", kmRodados: 28, valorKm: 25.20, enderecoSaida: "Setor Bueno, Q. 15 — Goiânia", enderecoChegada: "Av. T-63, 1234 — Goiânia" },
  { id: "v8", repId: "rep3", data: "2026-06-07", cliente: "Empório Saudável", kmRodados: 41, valorKm: 36.90, enderecoSaida: "Av. T-63, 1234 — Goiânia", enderecoChegada: "Rua 85, 320 — Goiânia" },
  // Maio
  { id: "v9",  repId: "rep1", data: "2026-05-05", cliente: "Mercado São Paulo", kmRodados: 34, valorKm: 30.60, enderecoSaida: "Rua das Flores, 100 — Curitiba", enderecoChegada: "Av. Sete de Setembro, 2775 — Curitiba" },
  { id: "v10", repId: "rep1", data: "2026-05-12", cliente: "Farmácia Vida", kmRodados: 22, valorKm: 19.80, enderecoSaida: "Av. Sete de Setembro, 2775 — Curitiba", enderecoChegada: "Rua XV de Novembro, 450 — Curitiba" },
  { id: "v11", repId: "rep2", data: "2026-05-08", cliente: "Academia Fit", kmRodados: 55, valorKm: 49.50, enderecoSaida: "Av. Paulista, 1000 — São Paulo", enderecoChegada: "Av. Brasil, 2040 — Santo André" },
  { id: "v12", repId: "rep2", data: "2026-05-20", cliente: "Padaria Central", kmRodados: 40, valorKm: 36.00, enderecoSaida: "Rua Augusta, 500 — São Paulo", enderecoChegada: "Av. Paulista, 1000 — São Paulo" },
  { id: "v13", repId: "rep3", data: "2026-05-14", cliente: "Empório Saudável", kmRodados: 29, valorKm: 26.10 },
  // Abril
  { id: "v14", repId: "rep1", data: "2026-04-10", cliente: "Supermercado Bom", kmRodados: 48, valorKm: 43.20 },
  { id: "v15", repId: "rep2", data: "2026-04-07", cliente: "Mercadão Norte", kmRodados: 73, valorKm: 65.70 },
  { id: "v16", repId: "rep2", data: "2026-04-18", cliente: "Academia Fit", kmRodados: 55, valorKm: 49.50 },
  { id: "v17", repId: "rep3", data: "2026-04-22", cliente: "Loja Esporte+", kmRodados: 31, valorKm: 27.90 },
];

export const reembolsos: Reembolso[] = [
  // Junho
  { id: "r1", repId: "rep1", mes: "2026-06", investimentoGasolina: 120, kmRealizados: 104 },
  { id: "r2", repId: "rep2", mes: "2026-06", investimentoGasolina: 250, kmRealizados: 168 },
  { id: "r3", repId: "rep3", mes: "2026-06", investimentoGasolina: 90,  kmRealizados: 69 },
  // Maio
  { id: "r4", repId: "rep1", mes: "2026-05", investimentoGasolina: 105, kmRealizados: 98 },
  { id: "r5", repId: "rep2", mes: "2026-05", investimentoGasolina: 190, kmRealizados: 145 },
  { id: "r6", repId: "rep3", mes: "2026-05", investimentoGasolina: 72,  kmRealizados: 55 },
  // Abril
  { id: "r7", repId: "rep1", mes: "2026-04", investimentoGasolina: 98,  kmRealizados: 88 },
  { id: "r8", repId: "rep2", mes: "2026-04", investimentoGasolina: 210, kmRealizados: 178 },
  { id: "r9", repId: "rep3", mes: "2026-04", investimentoGasolina: 65,  kmRealizados: 72 },
];

export function getReembolsoAtual(repId: string): Reembolso | undefined {
  return reembolsos.find((r) => r.repId === repId && r.mes === "2026-06");
}

export function getViagensPorRep(repId: string, mes?: string): Viagem[] {
  return viagens.filter((v) => {
    const mesViagem = v.data.slice(0, 7);
    return v.repId === repId && (mes ? mesViagem === mes : true);
  });
}

export function getMesesDisponiveis(): string[] {
  return [...new Set(reembolsos.map((r) => r.mes))].sort();
}
