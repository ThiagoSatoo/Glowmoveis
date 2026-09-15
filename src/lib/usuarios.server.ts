import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { podeGerenciarPapel, type Papel } from "./gantt-data";
import { criarClienteAdmin, criarClienteComToken } from "./supabase-admin.server";

/**
 * Ações de gestão de usuários (criar/editar/remover contas) — sempre rodam no servidor,
 * usando a service role do Supabase. O "accessToken" enviado pelo cliente é o token da
 * sessão de quem está chamando; verificamos aqui quem é essa pessoa e qual o cargo dela
 * antes de autorizar qualquer coisa (nunca confiamos só na UI, que só esconde botões).
 */

const papelSchema = z.enum(["admin", "gerente", "usuario"]);

async function autenticarEAutorizar(accessToken: string, papelAlvo: Papel) {
  const clienteToken = criarClienteComToken(accessToken);
  const { data: userData, error: userError } = await clienteToken.auth.getUser();
  if (userError || !userData.user) throw new Error("Sessão inválida. Faça login novamente.");

  const { data: perfil, error: perfilError } = await clienteToken
    .from("profiles")
    .select("papel")
    .eq("id", userData.user.id)
    .single();
  if (perfilError || !perfil) throw new Error("Não foi possível confirmar seu cargo.");

  const meuPapel = perfil.papel as Papel;
  if (!podeGerenciarPapel(meuPapel, papelAlvo)) {
    throw new Error("Você não tem permissão para atribuir ou gerenciar esse cargo.");
  }
  return { atorId: userData.user.id, meuPapel };
}

const criarUsuarioSchema = z.object({
  accessToken: z.string().min(1),
  nome: z.string().min(1),
  email: z.string().email(),
  senha: z.string().min(6),
  papel: papelSchema,
  colaboradorId: z.string().uuid().optional(),
  verTodosNaAgenda: z.boolean().optional(),
});

export const criarUsuarioSv = createServerFn({ method: "POST" })
  .validator((data: unknown) => criarUsuarioSchema.parse(data))
  .handler(async ({ data }) => {
    await autenticarEAutorizar(data.accessToken, data.papel);
    const admin = criarClienteAdmin();
    const { data: criado, error } = await admin.auth.admin.createUser({
      email: data.email,
      password: data.senha,
      email_confirm: true,
      user_metadata: {
        nome: data.nome,
        papel: data.papel,
        colaborador_id: data.colaboradorId ?? "",
        ver_todos_na_agenda: data.verTodosNaAgenda ?? false,
      },
    });
    if (error) throw new Error(error.message);
    return { id: criado.user.id };
  });

const atualizarUsuarioSchema = z.object({
  accessToken: z.string().min(1),
  id: z.string().uuid(),
  nome: z.string().min(1),
  papel: papelSchema,
  colaboradorId: z.string().uuid().optional(),
  verTodosNaAgenda: z.boolean().optional(),
  novaSenha: z.string().min(6).optional(),
  /** Quando informado, troca o e-mail/login da conta (usado para manter o login em dia
   * quando o CPF de um colaborador vinculado é editado). */
  novoEmail: z.string().email().optional(),
});

export const atualizarUsuarioSv = createServerFn({ method: "POST" })
  .validator((data: unknown) => atualizarUsuarioSchema.parse(data))
  .handler(async ({ data }) => {
    const admin = criarClienteAdmin();
    const { data: alvoAtual, error: alvoError } = await admin
      .from("profiles")
      .select("papel")
      .eq("id", data.id)
      .single();
    if (alvoError || !alvoAtual) throw new Error("Usuário não encontrado.");

    const { meuPapel } = await autenticarEAutorizar(data.accessToken, data.papel);
    if (!podeGerenciarPapel(meuPapel, alvoAtual.papel as Papel)) {
      throw new Error("Você não tem permissão para editar esse usuário.");
    }
    if (alvoAtual.papel === "admin" && data.papel !== "admin") {
      const { count } = await admin
        .from("profiles")
        .select("id", { count: "exact", head: true })
        .eq("papel", "admin");
      if ((count ?? 0) <= 1) {
        throw new Error("Precisa sobrar pelo menos um administrador no sistema.");
      }
    }

    if (data.novoEmail) {
      const { error: emailError } = await admin.auth.admin.updateUserById(data.id, {
        email: data.novoEmail,
        email_confirm: true,
      });
      if (emailError) throw new Error(emailError.message);
    }

    const { error: updateError } = await admin
      .from("profiles")
      .update({
        nome: data.nome,
        papel: data.papel,
        colaborador_id: data.colaboradorId ?? null,
        ver_todos_na_agenda: data.verTodosNaAgenda ?? false,
        ...(data.novoEmail ? { email: data.novoEmail } : {}),
      })
      .eq("id", data.id);
    if (updateError) throw new Error(updateError.message);

    if (data.novaSenha) {
      const { error: senhaError } = await admin.auth.admin.updateUserById(data.id, {
        password: data.novaSenha,
      });
      if (senhaError) throw new Error(senhaError.message);
    }
    return { ok: true };
  });

/**
 * Duração de "banimento" usada para desativar uma conta no Supabase Auth: bloqueia novos
 * logins/renovações de token quase permanentemente (~100 anos). Um token já emitido continua
 * válido até expirar sozinho (normalmente ~1h) — por isso a política de RLS `esta_ativo()`
 * também trava o acesso aos dados de imediato, sem depender só disso.
 */
const BANIMENTO_DESATIVADO = "876000h";

const alternarStatusUsuarioSchema = z.object({
  accessToken: z.string().min(1),
  id: z.string().uuid(),
  ativo: z.boolean(),
});

export const alternarStatusUsuarioSv = createServerFn({ method: "POST" })
  .validator((data: unknown) => alternarStatusUsuarioSchema.parse(data))
  .handler(async ({ data }) => {
    const admin = criarClienteAdmin();
    const { data: alvoAtual, error: alvoError } = await admin
      .from("profiles")
      .select("papel")
      .eq("id", data.id)
      .single();
    if (alvoError || !alvoAtual) throw new Error("Usuário não encontrado.");

    const { atorId } = await autenticarEAutorizar(data.accessToken, alvoAtual.papel as Papel);

    if (!data.ativo) {
      if (atorId === data.id) {
        throw new Error("Você não pode desativar sua própria conta.");
      }
      if (alvoAtual.papel === "admin") {
        const { count } = await admin
          .from("profiles")
          .select("id", { count: "exact", head: true })
          .eq("papel", "admin")
          .eq("ativo", true);
        if ((count ?? 0) <= 1) {
          throw new Error("Precisa sobrar pelo menos um administrador ativo no sistema.");
        }
      }
    }

    const { error: updateError } = await admin
      .from("profiles")
      .update({ ativo: data.ativo })
      .eq("id", data.id);
    if (updateError) throw new Error(updateError.message);

    const { error: banError } = await admin.auth.admin.updateUserById(data.id, {
      ban_duration: data.ativo ? "none" : BANIMENTO_DESATIVADO,
    });
    if (banError) throw new Error(banError.message);

    return { ok: true };
  });

const removerUsuarioSchema = z.object({
  accessToken: z.string().min(1),
  id: z.string().uuid(),
});

export const removerUsuarioSv = createServerFn({ method: "POST" })
  .validator((data: unknown) => removerUsuarioSchema.parse(data))
  .handler(async ({ data }) => {
    const admin = criarClienteAdmin();
    const { data: alvoAtual, error: alvoError } = await admin
      .from("profiles")
      .select("papel")
      .eq("id", data.id)
      .single();
    if (alvoError || !alvoAtual) throw new Error("Usuário não encontrado.");

    await autenticarEAutorizar(data.accessToken, alvoAtual.papel as Papel);

    const { count: totalUsuarios } = await admin
      .from("profiles")
      .select("id", { count: "exact", head: true });
    if ((totalUsuarios ?? 0) <= 1) {
      throw new Error("Precisa sobrar pelo menos um usuário no sistema.");
    }
    if (alvoAtual.papel === "admin") {
      const { count: totalAdmins } = await admin
        .from("profiles")
        .select("id", { count: "exact", head: true })
        .eq("papel", "admin");
      if ((totalAdmins ?? 0) <= 1) {
        throw new Error("Precisa sobrar pelo menos um administrador no sistema.");
      }
    }

    const { error } = await admin.auth.admin.deleteUser(data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
