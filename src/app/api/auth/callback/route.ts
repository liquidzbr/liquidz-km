import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { infoAcesso } from "@/lib/acesso";

const DOMINIO_PERMITIDO = "@liquidz.com.br";

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

  // Email @liquidz.com.br mas fora da lista de autorizados — bloqueia
  const dados = infoAcesso(user.email);
  if (!dados) {
    await supabase.auth.signOut();
    return NextResponse.redirect(`${origin}/?erro=nao_cadastrado`);
  }

  // Busca perfil existente no banco
  const { data: profile } = await supabase
    .from("profiles")
    .select("papel")
    .eq("id", user.id)
    .single();

  let papel: string = profile?.papel ?? dados.papel;

  // Se não tem perfil ainda, cria com base nos dados de acesso
  if (!profile) {
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

    papel = dados.papel;
  }

  // Todo rep precisa de uma linha em `representantes` — é ela que vincula
  // viagens e gasolina à pessoa. Antes isso era criado à mão no Supabase e
  // era esquecido: a pessoa entrava no app, fazia a visita e só descobria no
  // "salvar" que não dava. Roda em TODO login (não só no primeiro) para
  // consertar também quem já tinha entrado antes disto existir.
  if (papel === "rep") {
    const { error: erroRep } = await supabase.rpc("garantir_representante");
    // Não bloqueia o login: se a função ainda não existe no banco ou falha, a
    // pessoa entra e a própria tela de nova visita explica o que fazer.
    if (erroRep) console.error("Falha ao garantir cadastro de representante:", erroRep);
  }

  return NextResponse.redirect(`${origin}/${papel === "rep" ? "rep" : "rh"}`);
}
