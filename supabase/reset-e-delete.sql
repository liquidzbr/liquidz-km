-- ===========================================================================
-- Rode este arquivo UMA VEZ no SQL Editor do Supabase.
-- Faz duas coisas:
--   1) Cria a policy de DELETE de viagens (necessária pro botão "apagar" no app)
--   2) Zera TODOS os lançamentos pra começar o app limpo
--
-- ⚠️  A PARTE 2 É IRREVERSÍVEL. Apaga viagens, gastos, estacionamentos e
--     reembolsos de TODO MUNDO. Os cadastros (representantes, áreas, perfis,
--     acessos) NÃO são tocados.
-- ===========================================================================


-- ---------------------------------------------------------------------------
-- PARTE 1 — Policy de DELETE de viagens
-- (rep apaga as próprias; gestor as da área; rh todas — mesmo modelo das demais)
-- ---------------------------------------------------------------------------

drop policy if exists "apagar viagens" on public.viagens;
create policy "apagar viagens"
  on public.viagens
  for delete
  to public
  using (rep_id in (select representantes.id from representantes));


-- ---------------------------------------------------------------------------
-- PARTE 2 — Zerar todos os lançamentos (IRREVERSÍVEL)
-- ---------------------------------------------------------------------------

delete from public.viagens;
delete from public.gastos;
delete from public.estacionamentos;
delete from public.reembolsos;


-- ---------------------------------------------------------------------------
-- OPCIONAL (recomendado) — corrige os defaults que faltavam na tabela viagens.
-- Hoje o app preenche id/data na mão por causa disso; com os defaults abaixo,
-- o banco passa a gerar sozinho e evita esse tipo de bug por outros caminhos.
-- ---------------------------------------------------------------------------

-- alter table public.viagens alter column id   set default gen_random_uuid();
-- alter table public.viagens alter column data set default now();
