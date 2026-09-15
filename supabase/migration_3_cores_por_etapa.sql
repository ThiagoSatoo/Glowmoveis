-- Terceira migração: cores por etapa configuráveis.
-- Rode isto DEPOIS de migration.sql e migration_2_login_por_cpf.sql.
--
-- Contexto: cada etapa (Corte, Montagem, Acabamento, Entrega) passa a ter uma cor padrão
-- definida em Configurações → Sistema (só admin altera, vale para todo mundo que não
-- personalizou). Além disso, cada pessoa pode personalizar essas cores só para si em
-- Configurações → Perfil — essa personalização sobrepõe o padrão do sistema, mas só na
-- tela dela. Isso é além (não substitui) da cor personalizada que já existia por serviço
-- individual (campo "cor" em tarefas), que continua tendo prioridade máxima quando definida.

alter table public.configuracoes_sistema
  add column if not exists cores_fases jsonb not null default
    '{"corte":"#2f6f8f","montagem":"#c98a2c","acabamento":"#3f8f5f","entrega":"#6b3f7a"}'::jsonb;

alter table public.profiles
  add column if not exists cores_fases jsonb;

-- profiles já tinha update restrito por coluna (só "nome"); adiciona "cores_fases" à lista
-- de colunas que o próprio usuário pode alterar (a policy "profiles update proprio nome"
-- já garante que só dá para mexer na própria linha).
grant update (cores_fases) on public.profiles to authenticated;
