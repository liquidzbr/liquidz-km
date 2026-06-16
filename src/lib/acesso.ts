// Fonte única de verdade para quem pode acessar o app.
// Usado tanto no middleware (gate de toda requisição) quanto no callback (primeiro login).

export type Papel = "rh" | "gestor" | "rep";

export type AcessoInfo = {
  nome: string;
  papel: Papel;
  area: string | null;
};

export const EMAILS_AUTORIZADOS: Record<string, AcessoInfo> = {
  "rh@liquidz.com.br":             { nome: "RH",               papel: "rh",     area: null },
  "denis.pauli@liquidz.com.br":    { nome: "Denis Hesz Pauli", papel: "gestor", area: "Comercial" },
  "gabriela.cunha@liquidz.com.br": { nome: "Gabriela Cunha",   papel: "gestor", area: "Saúde" },
  "felippe.vidal@liquidz.com.br":  { nome: "Felippe Vidal",    papel: "rep",    area: "Comercial" },
  "julia.arantes@liquidz.com.br":  { nome: "Julia Arantes",    papel: "rep",    area: "Comercial" },
  "julia.urban@liquidz.com.br":    { nome: "Julia Urban",      papel: "rep",    area: "Comercial" },
  "maycon.brito@liquidz.com.br":   { nome: "Maycon Brito",     papel: "rep",    area: "Comercial" },
  "renata.mayer@liquidz.com.br":   { nome: "Renata Mayer",     papel: "rep",    area: "Saúde" },
};

export function emailAutorizado(email: string | null | undefined): boolean {
  if (!email) return false;
  return Object.prototype.hasOwnProperty.call(EMAILS_AUTORIZADOS, email.toLowerCase());
}

export function infoAcesso(email: string | null | undefined): AcessoInfo | null {
  if (!email) return null;
  return EMAILS_AUTORIZADOS[email.toLowerCase()] ?? null;
}
