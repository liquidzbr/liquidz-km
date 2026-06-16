import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

const DOMINIO_PERMITIDO = "@liquidz.com.br";

// Mapa de emails conhecidos → papel e área (usado no primeiro login)
const EMAILS_CONHECIDOS: Record<string, { nome: string; papel: "rh" | "gestor" | "rep"; area: string | null }> = {
  "rh@liquidz.com.br":               { nome: "RH",              papel: "rh",     area: null },
  "denis.pauli@liquidz.com.br":       { nome: "Denis Hesz Pauli",papel: "gestor", area: "Comercial" },
  "gabriela.cunha@liquidz.com.br":    { nome: "Gabriela Cunha",  papel: "gestor", area: "Saúde" },
  "felippe.vidal@liquidz.com.br":     { nome: "Felippe Vidal",   papel: "rep",    area: "Comercial" },
  "julia.arantes@liquidz.com.br":     { nome: "Julia Arantes",   papel: "rep",    area: "Comercial" },
  "julia.urban@liquidz.com.br":       { nome: "Julia Urban",     papel: "rep",    area: "Comercial" },
  "maycon.brito@liquidz.com.br":      { nome: "Maycon Brito",    papel: "rep",    area: "Comercial" },
  "renata.mayer@liquidz.com.br":      { nome: "Renata Mayer",    papel: "rep",    area: "Saúde" },
};

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  if (!code) {
    return NextResponse.redirect(`${origin}/?erro=sem_codigo`);
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(`${origin}/?erro=auth`);
  }

  const { data: { user } } = await supabase.auth.getUser();

  if (!user?.email?.endsWith(DOMINIO_PERMITIDO)) {
    await supabase.auth.signOut();
    return NextResponse.redirect(`${origin}/?erro=dominio`);
  }

  // Busca perfil existente no banco
  const { data: profile } = await supabase
    .from("profiles")
    .select("papel")
    .eq("id", user.id)
    .single();

  // Se não tem perfil ainda, cria com base no email conhecido
  if (!profile) {
    const dados = EMAILS_CONHECIDOS[user.email!];

    if (!dados) {
      // Email @liquidz.com.br mas não cadastrado — bloqueia
      await supabase.auth.signOut();
      return NextResponse.redirect(`${origin}/?erro=nao_cadastrado`);
    }

    let areaId: number | null = null;
    if (dados.area) {
      const { data: area } = await supabase
        .from("areas")
        .select("id")
        .eq("nome", dados.area)
        .single();
      areaId = area?.id ?? null;
    }

    await supabase.from("profiles").insert({
      id: user.id,
      nome: dados.nome,
      email: user.email,
      papel: dados.papel,
      area_id: areaId,
    });

    return NextResponse.redirect(`${origin}/${dados.papel === "rep" ? "rep" : "rh"}`);
  }

  return NextResponse.redirect(`${origin}/${profile.papel === "rep" ? "rep" : "rh"}`);
}
