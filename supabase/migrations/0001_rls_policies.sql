-- ===========================================================================
-- RLS — Row Level Security do liquidz-km
-- ===========================================================================
-- Retrato fiel das policies de segurança configuradas no Supabase.
-- Estas regras vivem no banco, não no código — este arquivo existe para
-- versioná-las junto com o repo. Se o banco for recriado do zero, rode este
-- arquivo para restaurar o controle de acesso.
--
-- O arquivo é idempotente: pode ser executado mais de uma vez sem erro.
--
-- Modelo de acesso (definido pelo papel do usuário logado):
--   rh     → vê todos os representantes e todas as áreas
--   gestor → vê apenas representantes da própria área
--   rep    → vê apenas o próprio cadastro e seus lançamentos
-- ===========================================================================


-- ---------------------------------------------------------------------------
-- Funções auxiliares (SECURITY DEFINER — leem o profile do usuário logado
-- sem esbarrar na própria RLS de profiles).
-- ---------------------------------------------------------------------------

create or replace function public.papel_atual()
  returns text
  language sql
  stable security definer
as $function$ select papel from profiles where id = auth.uid() $function$;

create or replace function public.area_atual()
  returns integer
  language sql
  stable security definer
as $function$ select area_id from profiles where id = auth.uid() $function$;

create or replace function public.email_atual()
  returns text
  language sql
  stable security definer
as $function$ select email from profiles where id = auth.uid() $function$;


-- ---------------------------------------------------------------------------
-- Habilita RLS em todas as tabelas com dados de acesso restrito.
-- ---------------------------------------------------------------------------

alter table public.areas            enable row level security;
alter table public.profiles         enable row level security;
alter table public.representantes    enable row level security;
alter table public.reembolsos        enable row level security;
alter table public.viagens           enable row level security;
alter table public.gastos            enable row level security;
alter table public.estacionamentos   enable row level security;


-- ---------------------------------------------------------------------------
-- areas — nome de área não é sensível; legível por qualquer usuário do app.
-- (Sem esta policy, o join areas(nome) volta null e o RH perde os filtros
--  por área — gestor não percebe pois usa a área fixa do allowlist.)
-- ---------------------------------------------------------------------------

drop policy if exists "ver areas" on public.areas;
create policy "ver areas"
  on public.areas
  for select
  to authenticated
  using (papel_atual() = any (array['rh', 'gestor', 'rep']));


-- ---------------------------------------------------------------------------
-- profiles — cada um vê o próprio perfil; RH vê todos.
-- ---------------------------------------------------------------------------

drop policy if exists "inserir proprio perfil" on public.profiles;
create policy "inserir proprio perfil"
  on public.profiles
  for insert
  to public
  with check (id = auth.uid());

drop policy if exists "perfil proprio" on public.profiles;
create policy "perfil proprio"
  on public.profiles
  for select
  to public
  using ((id = auth.uid()) or (papel_atual() = 'rh'));


-- ---------------------------------------------------------------------------
-- representantes — RH vê todos; gestor vê a própria área; rep vê o próprio.
-- ---------------------------------------------------------------------------

drop policy if exists "ver representantes" on public.representantes;
create policy "ver representantes"
  on public.representantes
  for select
  to public
  using (
    (papel_atual() = 'rh')
    or ((papel_atual() = 'gestor') and (area_id = area_atual()))
    or ((papel_atual() = 'rep') and (email = email_atual()))
  );


-- ---------------------------------------------------------------------------
-- Lançamentos (reembolsos, viagens, gastos, estacionamentos):
-- visíveis/inseríveis apenas para representantes que o usuário pode enxergar.
-- A restrição por papel/área é herdada da RLS de representantes via subquery.
-- ---------------------------------------------------------------------------

drop policy if exists "ver reembolsos" on public.reembolsos;
create policy "ver reembolsos"
  on public.reembolsos
  for select
  to public
  using (rep_id in (select representantes.id from representantes));

drop policy if exists "ver viagens" on public.viagens;
create policy "ver viagens"
  on public.viagens
  for select
  to public
  using (rep_id in (select representantes.id from representantes));

drop policy if exists "inserir viagens" on public.viagens;
create policy "inserir viagens"
  on public.viagens
  for insert
  to public
  with check (rep_id in (select representantes.id from representantes));

drop policy if exists "apagar viagens" on public.viagens;
create policy "apagar viagens"
  on public.viagens
  for delete
  to public
  using (rep_id in (select representantes.id from representantes));

drop policy if exists "ver gastos" on public.gastos;
create policy "ver gastos"
  on public.gastos
  for select
  to public
  using (rep_id in (select representantes.id from representantes));

drop policy if exists "inserir gastos" on public.gastos;
create policy "inserir gastos"
  on public.gastos
  for insert
  to public
  with check (rep_id in (select representantes.id from representantes));

drop policy if exists "ver estacionamentos" on public.estacionamentos;
create policy "ver estacionamentos"
  on public.estacionamentos
  for select
  to public
  using (rep_id in (select representantes.id from representantes));

drop policy if exists "inserir estacionamentos" on public.estacionamentos;
create policy "inserir estacionamentos"
  on public.estacionamentos
  for insert
  to public
  with check (rep_id in (select representantes.id from representantes));
