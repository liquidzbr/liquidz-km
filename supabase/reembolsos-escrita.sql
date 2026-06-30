-- ===========================================================================
-- Rode este arquivo UMA VEZ no SQL Editor do Supabase.
-- Libera o rep a gravar o "valor investido em gasolina" do mês (tabela
-- reembolsos), que alimenta o cálculo de saldo. Sem estas policies a RLS
-- recusa o save silenciosamente — o app não salva e não dá erro claro.
--
-- Idempotente: pode rodar mais de uma vez sem problema.
-- Restrito: cada rep só grava a própria linha (mesmo modelo das demais tabelas).
-- ===========================================================================

drop policy if exists "inserir reembolsos" on public.reembolsos;
create policy "inserir reembolsos"
  on public.reembolsos
  for insert
  to public
  with check (rep_id in (select representantes.id from representantes));

drop policy if exists "atualizar reembolsos" on public.reembolsos;
create policy "atualizar reembolsos"
  on public.reembolsos
  for update
  to public
  using (rep_id in (select representantes.id from representantes))
  with check (rep_id in (select representantes.id from representantes));
