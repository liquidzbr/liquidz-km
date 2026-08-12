-- ===========================================================================
-- Cadastro automático de representante no login
-- ===========================================================================
-- Rode este arquivo UMA VEZ no SQL Editor do Supabase. É idempotente: pode
-- ser executado de novo sem erro.
--
-- PROBLEMA QUE ISTO RESOLVE
-- Liberar alguém no app eram dois passos manuais:
--   1) adicionar o email em src/lib/acesso.ts  (libera o login)
--   2) criar a linha na tabela representantes  (permite lançar viagem/gasolina)
-- O passo 2 era fácil de esquecer — e quando esquecido a pessoa entrava no app
-- normalmente, fazia a visita inteira e só descobria no "salvar" que não dava.
-- Aconteceu com mariana.brito e lucio.dias.
--
-- COMO RESOLVE
-- A função garantir_representante() cria a linha faltante a partir do profile
-- do próprio usuário logado. O callback de login (src/app/api/auth/callback)
-- a chama em TODO login — não só no primeiro — para também consertar quem já
-- tinha entrado antes desta migração existir.
--
-- POR QUE SECURITY DEFINER, e não uma policy de INSERT em representantes:
-- assim o app nunca escreve direto na tabela. Não existe policy de INSERT em
-- representantes, então nem o cliente nem um request forjado com a anon key
-- conseguem inserir nome/área arbitrários — os valores vêm sempre do profile.
-- ===========================================================================


-- ---------------------------------------------------------------------------
-- 1) A função
-- ---------------------------------------------------------------------------

create or replace function public.garantir_representante()
  returns void
  language plpgsql
  volatile -- precisa ser volatile: função stable/immutable não pode fazer INSERT
  security definer
  set search_path = public
as $function$
declare
  meu_perfil record;
begin
  select nome, email, papel, area_id
    into meu_perfil
    from profiles
   where id = auth.uid();

  -- Sem profile (usuário fora da allowlist) ou não é rep: nada a fazer.
  -- Gestor e RH não têm cadastro em representantes — eles só leem.
  if not found or meu_perfil.papel <> 'rep' or meu_perfil.email is null then
    return;
  end if;

  -- Já tem cadastro: sai. Comparação em lower() porque a policy de SELECT de
  -- representantes usa `email = email_atual()`, que é case-sensitive no SQL —
  -- uma linha gravada com casing diferente do profile fica invisível pro dono.
  if exists (
    select 1 from representantes
     where lower(email) = lower(meu_perfil.email)
  ) then
    return;
  end if;

  -- id explícito: a tabela foi criada sem default em id (mesmo caso de viagens).
  insert into representantes (id, nome, email, area_id)
  values (
    gen_random_uuid(),
    meu_perfil.nome,
    lower(meu_perfil.email),
    meu_perfil.area_id
  );
end;
$function$;

-- Só usuário autenticado pode chamar (e a função só age sobre o próprio auth.uid()).
revoke all on function public.garantir_representante() from public;
grant execute on function public.garantir_representante() to authenticated;


-- ---------------------------------------------------------------------------
-- 2) Backfill — quem já tem profile de rep mas não tem cadastro
-- (a função só roda no próximo login da pessoa; isto resolve todos de uma vez)
-- ---------------------------------------------------------------------------

insert into representantes (id, nome, email, area_id)
select gen_random_uuid(), p.nome, lower(p.email), p.area_id
  from profiles p
 where p.papel = 'rep'
   and p.email is not null
   and not exists (
     select 1 from representantes r where lower(r.email) = lower(p.email)
   );


-- ---------------------------------------------------------------------------
-- 3) Trava contra cadastro duplicado
-- ---------------------------------------------------------------------------
-- Duas linhas com o mesmo email fariam fetchMeuRep escolher uma "por sorte", e
-- os lançamentos se espalhariam entre as duas sem ninguém perceber.
--
-- ⚠️  Se este CREATE INDEX falhar, é porque já existem duplicados. Ache-os com:
--
--     select lower(email), count(*)
--       from representantes
--      group by lower(email)
--     having count(*) > 1;
--
--     Aí decida qual linha fica (a que tiver lançamentos em viagens/gastos)
--     antes de apagar a outra e rodar o índice de novo.
-- ---------------------------------------------------------------------------

create unique index if not exists representantes_email_unico
  on public.representantes (lower(email));
