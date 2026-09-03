import { useSyncExternalStore, type ReactNode } from "react";
import type { RealtimeChannel, Session } from "@supabase/supabase-js";

import {
  configuracoesSistemaIniciais,
  gerarTarefasDeModelo,
  SEM_FUNCAO_ID,
  type Ausencia,
  type Cliente,
  type Colaborador,
  type ConfiguracoesSistema,
  type EtapaModelo,
  type Fase,
  type FuncaoDef,
  type Papel,
  type Prazo,
  type ModeloServico,
  type Tarefa,
  type Tema,
  type Usuario,
} from "./gantt-data";
import { supabase } from "./supabase-client";
import { atualizarUsuarioSv, criarUsuarioSv, removerUsuarioSv } from "./usuarios.server";

// =============================================================================
// Estado — agora é um cache local dos dados que vivem no Supabase. É povoado por
// fetch inicial + assinatura em tempo real (Postgres Changes), não mais localStorage.
// =============================================================================

type State = {
  colaboradores: Colaborador[];
  tarefas: Tarefa[];
  funcoes: FuncaoDef[];
  ausencias: Ausencia[];
  prazos: Prazo[];
  modelos: ModeloServico[];
  clientes: Cliente[];
  usuarios: Usuario[];
  sessao: Session | null;
  usuarioLogadoId: string | null;
  /** true assim que a sessão inicial (login restaurado ou não) já foi checada. */
  sessaoCarregada: boolean;
  /** true enquanto os dados protegidos (tarefas, colaboradores, etc.) ainda estão sendo buscados. */
  carregandoDados: boolean;
  tema: Tema;
  configuracoesSistema: ConfiguracoesSistema;
};

export type NovoUsuarioParams = {
  id?: string | undefined;
  nome: string;
  email?: string | undefined;
  senha?: string | undefined;
  papel: Papel;
  colaboradorId?: string | undefined;
  verTodosNaAgenda?: boolean | undefined;
};

type Store = State & {
  salvarColaborador: (c: Omit<Colaborador, "id"> & { id?: string | undefined }) => Promise<void>;
  removerColaborador: (id: string) => Promise<void>;
  salvarTarefa: (t: Omit<Tarefa, "id"> & { id?: string | undefined }) => Promise<void>;
  removerTarefa: (id: string) => Promise<void>;
  salvarFuncao: (f: Omit<FuncaoDef, "id"> & { id?: string | undefined }) => Promise<string>;
  removerFuncao: (id: string) => Promise<void>;
  salvarAusencia: (a: Omit<Ausencia, "id"> & { id?: string | undefined }) => Promise<void>;
  removerAusencia: (id: string) => Promise<void>;
  salvarPrazo: (m: Omit<Prazo, "id"> & { id?: string | undefined }) => Promise<void>;
  removerPrazo: (id: string) => Promise<void>;
  salvarModelo: (m: Omit<ModeloServico, "id"> & { id?: string | undefined }) => Promise<string>;
  removerModelo: (id: string) => Promise<void>;
  salvarCliente: (c: Omit<Cliente, "id"> & { id?: string | undefined }) => Promise<string>;
  removerCliente: (id: string) => Promise<void>;
  criarServicoDeModelo: (params: {
    modeloId: string;
    obra: string;
    cliente: string;
    colaboradorId: string;
    inicio: number;
  }) => Promise<number>;
  usuarioLogado: Usuario | null;
  login: (email: string, senha: string) => Promise<string | null>;
  logout: () => Promise<void>;
  salvarUsuario: (u: NovoUsuarioParams) => Promise<void>;
  removerUsuario: (id: string) => Promise<void>;
  atualizarNomeProprio: (nome: string) => Promise<void>;
  atualizarSenhaPropria: (novaSenha: string) => Promise<void>;
  definirTema: (tema: Tema) => void;
  atualizarConfiguracoesSistema: (c: Partial<ConfiguracoesSistema>) => Promise<void>;
  exportarBackup: () => string;
};

const CHAVE_TEMA = "marcenaria:tema";

function lerTemaSalvo(): Tema {
  try {
    const bruto = localStorage.getItem(CHAVE_TEMA);
    return bruto === "claro" || bruto === "escuro" || bruto === "sistema" ? bruto : "sistema";
  } catch {
    return "sistema";
  }
}

function salvarTema(tema: Tema) {
  try {
    localStorage.setItem(CHAVE_TEMA, tema);
  } catch {
    // localStorage indisponível — o tema segue só em memória nesta sessão
  }
}

/** Aplica claro/escuro no <html>. O flash inicial é evitado pelo script inline em __root.tsx. */
function aplicarTema(tema: Tema) {
  try {
    const escuro =
      tema === "escuro" ||
      (tema === "sistema" && window.matchMedia("(prefers-color-scheme: dark)").matches);
    document.documentElement.classList.toggle("dark", escuro);
  } catch {
    // sem DOM (SSR) — nada a fazer aqui
  }
}

let state: State = {
  colaboradores: [],
  tarefas: [],
  funcoes: [],
  ausencias: [],
  prazos: [],
  modelos: [],
  clientes: [],
  usuarios: [],
  sessao: null,
  usuarioLogadoId: null,
  sessaoCarregada: false,
  carregandoDados: false,
  tema: typeof window === "undefined" ? "sistema" : lerTemaSalvo(),
  configuracoesSistema: configuracoesSistemaIniciais,
};
if (typeof window !== "undefined") aplicarTema(state.tema);

const listeners = new Set<() => void>();
let snapshot: State = state;

const setState = (parcial: Partial<State>) => {
  state = { ...state, ...parcial };
  snapshot = state;
  listeners.forEach((l) => l());
};

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

const getSnapshot = () => snapshot;

// =============================================================================
// Conversão entre as colunas do Supabase (snake_case) e os tipos do app (camelCase)
// =============================================================================

type ColaboradorRow = { id: string; nome: string; funcao_id: string | null };
const paraColaborador = (r: ColaboradorRow): Colaborador => ({
  id: r.id,
  nome: r.nome,
  funcaoId: r.funcao_id ?? SEM_FUNCAO_ID,
});

type FuncaoRow = { id: string; nome: string };
const paraFuncao = (r: FuncaoRow): FuncaoDef => ({ id: r.id, nome: r.nome });

type ClienteRow = {
  id: string;
  nome: string;
  telefone: string | null;
  endereco: string | null;
  observacoes: string | null;
};
const paraCliente = (r: ClienteRow): Cliente => ({
  id: r.id,
  nome: r.nome,
  ...(r.telefone ? { telefone: r.telefone } : {}),
  ...(r.endereco ? { endereco: r.endereco } : {}),
  ...(r.observacoes ? { observacoes: r.observacoes } : {}),
});

type TarefaRow = {
  id: string;
  colaborador_id: string;
  obra: string;
  cliente: string;
  fase: Fase;
  inicio: number;
  dias: number;
  cor: string | null;
};
const paraTarefa = (r: TarefaRow): Tarefa => ({
  id: r.id,
  colaboradorId: r.colaborador_id,
  obra: r.obra,
  cliente: r.cliente,
  fase: r.fase,
  inicio: r.inicio,
  dias: r.dias,
  cor: r.cor ?? undefined,
});

type AusenciaRow = {
  id: string;
  colaborador_id: string;
  inicio: number;
  dias: number;
  motivo: string;
};
const paraAusencia = (r: AusenciaRow): Ausencia => ({
  id: r.id,
  colaboradorId: r.colaborador_id,
  inicio: r.inicio,
  dias: r.dias,
  motivo: r.motivo,
});

type PrazoRow = { id: string; dia: number; descricao: string; cliente: string | null };
const paraPrazo = (r: PrazoRow): Prazo => ({
  id: r.id,
  dia: r.dia,
  descricao: r.descricao,
  ...(r.cliente ? { cliente: r.cliente } : {}),
});

type ModeloRow = { id: string; nome: string; etapas: EtapaModelo[] };
const paraModelo = (r: ModeloRow): ModeloServico => ({ id: r.id, nome: r.nome, etapas: r.etapas });

type ProfileRow = {
  id: string;
  nome: string;
  email: string;
  papel: Papel;
  colaborador_id: string | null;
  ver_todos_na_agenda: boolean;
};
const paraUsuario = (r: ProfileRow): Usuario => ({
  id: r.id,
  nome: r.nome,
  email: r.email,
  papel: r.papel,
  ...(r.colaborador_id ? { colaboradorId: r.colaborador_id } : {}),
  verTodosNaAgenda: r.ver_todos_na_agenda,
});

type ConfigRow = { id: number; nome_empresa: string };
const paraConfig = (r: ConfigRow): ConfiguracoesSistema => ({ nomeEmpresa: r.nome_empresa });

// =============================================================================
// Carregamento inicial + tempo real
// =============================================================================

let canalDados: RealtimeChannel | null = null;

function aplicarEventoTabela<TRow extends { id: string }, TItem extends { id: string }>(
  chave: keyof State,
  mapear: (r: TRow) => TItem,
  payload: { eventType: string; new: unknown; old: unknown },
) {
  const listaAtual = state[chave] as unknown as TItem[];
  if (payload.eventType === "DELETE") {
    const antigo = payload.old as { id: string };
    setState({ [chave]: listaAtual.filter((x) => x.id !== antigo.id) } as Partial<State>);
    return;
  }
  const item = mapear(payload.new as TRow);
  const existe = listaAtual.some((x) => x.id === item.id);
  setState({
    [chave]: existe ? listaAtual.map((x) => (x.id === item.id ? item : x)) : [...listaAtual, item],
  } as Partial<State>);
}

async function carregarConfiguracoes() {
  const { data, error } = await supabase
    .from("configuracoes_sistema")
    .select("*")
    .eq("id", 1)
    .single();
  if (!error && data) setState({ configuracoesSistema: paraConfig(data as ConfigRow) });
}

async function carregarDadosProtegidos() {
  setState({ carregandoDados: true });
  const [colab, tarefas, funcoes, ausencias, prazos, modelos, clientes, usuarios] =
    await Promise.all([
      supabase.from("colaboradores").select("*"),
      supabase.from("tarefas").select("*"),
      supabase.from("funcoes").select("*"),
      supabase.from("ausencias").select("*"),
      supabase.from("prazos").select("*"),
      supabase.from("modelos").select("*"),
      supabase.from("clientes").select("*"),
      supabase.from("profiles").select("*"),
    ]);

  setState({
    colaboradores: (colab.data as ColaboradorRow[] | null)?.map(paraColaborador) ?? [],
    tarefas: (tarefas.data as TarefaRow[] | null)?.map(paraTarefa) ?? [],
    funcoes: (funcoes.data as FuncaoRow[] | null)?.map(paraFuncao) ?? [],
    ausencias: (ausencias.data as AusenciaRow[] | null)?.map(paraAusencia) ?? [],
    prazos: (prazos.data as PrazoRow[] | null)?.map(paraPrazo) ?? [],
    modelos: (modelos.data as ModeloRow[] | null)?.map(paraModelo) ?? [],
    clientes: (clientes.data as ClienteRow[] | null)?.map(paraCliente) ?? [],
    usuarios: (usuarios.data as ProfileRow[] | null)?.map(paraUsuario) ?? [],
    carregandoDados: false,
  });

  if (canalDados) await supabase.removeChannel(canalDados);
  canalDados = supabase
    .channel("marcenaria-dados")
    .on("postgres_changes", { event: "*", schema: "public", table: "colaboradores" }, (p) =>
      aplicarEventoTabela("colaboradores", paraColaborador, p as never),
    )
    .on("postgres_changes", { event: "*", schema: "public", table: "tarefas" }, (p) =>
      aplicarEventoTabela("tarefas", paraTarefa, p as never),
    )
    .on("postgres_changes", { event: "*", schema: "public", table: "funcoes" }, (p) =>
      aplicarEventoTabela("funcoes", paraFuncao, p as never),
    )
    .on("postgres_changes", { event: "*", schema: "public", table: "ausencias" }, (p) =>
      aplicarEventoTabela("ausencias", paraAusencia, p as never),
    )
    .on("postgres_changes", { event: "*", schema: "public", table: "prazos" }, (p) =>
      aplicarEventoTabela("prazos", paraPrazo, p as never),
    )
    .on("postgres_changes", { event: "*", schema: "public", table: "modelos" }, (p) =>
      aplicarEventoTabela("modelos", paraModelo, p as never),
    )
    .on("postgres_changes", { event: "*", schema: "public", table: "clientes" }, (p) =>
      aplicarEventoTabela("clientes", paraCliente, p as never),
    )
    .on("postgres_changes", { event: "*", schema: "public", table: "profiles" }, (p) =>
      aplicarEventoTabela("usuarios", paraUsuario, p as never),
    )
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "configuracoes_sistema" },
      (p) => {
        const linha = (p as unknown as { new?: ConfigRow }).new;
        if (linha) setState({ configuracoesSistema: paraConfig(linha) });
      },
    )
    .subscribe();
}

function limparDadosProtegidos() {
  if (canalDados) {
    void supabase.removeChannel(canalDados);
    canalDados = null;
  }
  setState({
    colaboradores: [],
    tarefas: [],
    funcoes: [],
    ausencias: [],
    prazos: [],
    modelos: [],
    clientes: [],
    usuarios: [],
    carregandoDados: false,
  });
}

let ultimaSessaoId: string | null = null;

function aoMudarSessao(sessao: Session | null) {
  setState({ sessao, usuarioLogadoId: sessao?.user.id ?? null, sessaoCarregada: true });
  const novaId = sessao?.user.id ?? null;
  if (novaId !== ultimaSessaoId) {
    ultimaSessaoId = novaId;
    if (novaId) void carregarDadosProtegidos();
    else limparDadosProtegidos();
  }
}

let iniciado = false;
function iniciar() {
  if (iniciado || typeof window === "undefined") return;
  iniciado = true;
  void carregarConfiguracoes();
  void supabase.auth.getSession().then(({ data }) => aoMudarSessao(data.session));
  supabase.auth.onAuthStateChange((_evento, sessao) => aoMudarSessao(sessao));
}
iniciar();

// =============================================================================
// Ações
// =============================================================================

function lancarSeErro(error: { message: string } | null) {
  if (error) throw new Error(error.message);
}

const acoes = {
  salvarColaborador: async (c: Omit<Colaborador, "id"> & { id?: string | undefined }) => {
    const payload = { nome: c.nome, funcao_id: c.funcaoId || null };
    if (c.id)
      lancarSeErro((await supabase.from("colaboradores").update(payload).eq("id", c.id)).error);
    else lancarSeErro((await supabase.from("colaboradores").insert(payload)).error);
  },
  removerColaborador: async (id: string) => {
    lancarSeErro((await supabase.from("colaboradores").delete().eq("id", id)).error);
  },
  salvarTarefa: async (t: Omit<Tarefa, "id"> & { id?: string | undefined }) => {
    const payload = {
      colaborador_id: t.colaboradorId,
      obra: t.obra,
      cliente: t.cliente,
      fase: t.fase,
      inicio: t.inicio,
      dias: t.dias,
      cor: t.cor ?? null,
    };
    if (t.id) lancarSeErro((await supabase.from("tarefas").update(payload).eq("id", t.id)).error);
    else lancarSeErro((await supabase.from("tarefas").insert(payload)).error);
  },
  removerTarefa: async (id: string) => {
    lancarSeErro((await supabase.from("tarefas").delete().eq("id", id)).error);
  },
  salvarFuncao: async (f: Omit<FuncaoDef, "id"> & { id?: string | undefined }) => {
    if (f.id) {
      lancarSeErro((await supabase.from("funcoes").update({ nome: f.nome }).eq("id", f.id)).error);
      return f.id;
    }
    const resposta = await supabase.from("funcoes").insert({ nome: f.nome }).select("id").single();
    lancarSeErro(resposta.error);
    return (resposta.data as { id: string }).id;
  },
  removerFuncao: async (id: string) => {
    lancarSeErro((await supabase.from("funcoes").delete().eq("id", id)).error);
  },
  salvarAusencia: async (a: Omit<Ausencia, "id"> & { id?: string | undefined }) => {
    const payload = {
      colaborador_id: a.colaboradorId,
      inicio: a.inicio,
      dias: a.dias,
      motivo: a.motivo,
    };
    if (a.id) lancarSeErro((await supabase.from("ausencias").update(payload).eq("id", a.id)).error);
    else lancarSeErro((await supabase.from("ausencias").insert(payload)).error);
  },
  removerAusencia: async (id: string) => {
    lancarSeErro((await supabase.from("ausencias").delete().eq("id", id)).error);
  },
  salvarPrazo: async (m: Omit<Prazo, "id"> & { id?: string | undefined }) => {
    const payload = { dia: m.dia, descricao: m.descricao, cliente: m.cliente ?? null };
    if (m.id) lancarSeErro((await supabase.from("prazos").update(payload).eq("id", m.id)).error);
    else lancarSeErro((await supabase.from("prazos").insert(payload)).error);
  },
  removerPrazo: async (id: string) => {
    lancarSeErro((await supabase.from("prazos").delete().eq("id", id)).error);
  },
  salvarModelo: async (m: Omit<ModeloServico, "id"> & { id?: string | undefined }) => {
    const payload = { nome: m.nome, etapas: m.etapas };
    if (m.id) {
      lancarSeErro((await supabase.from("modelos").update(payload).eq("id", m.id)).error);
      return m.id;
    }
    const resposta = await supabase.from("modelos").insert(payload).select("id").single();
    lancarSeErro(resposta.error);
    return (resposta.data as { id: string }).id;
  },
  removerModelo: async (id: string) => {
    lancarSeErro((await supabase.from("modelos").delete().eq("id", id)).error);
  },
  salvarCliente: async (c: Omit<Cliente, "id"> & { id?: string | undefined }) => {
    const payload = {
      nome: c.nome,
      telefone: c.telefone ?? null,
      endereco: c.endereco ?? null,
      observacoes: c.observacoes ?? null,
    };
    if (c.id) {
      lancarSeErro((await supabase.from("clientes").update(payload).eq("id", c.id)).error);
      return c.id;
    }
    const resposta = await supabase.from("clientes").insert(payload).select("id").single();
    lancarSeErro(resposta.error);
    return (resposta.data as { id: string }).id;
  },
  removerCliente: async (id: string) => {
    lancarSeErro((await supabase.from("clientes").delete().eq("id", id)).error);
  },
  criarServicoDeModelo: async (params: {
    modeloId: string;
    obra: string;
    cliente: string;
    colaboradorId: string;
    inicio: number;
  }) => {
    const modelo = state.modelos.find((m) => m.id === params.modeloId);
    if (!modelo || modelo.etapas.length === 0) return 0;
    const novasTarefas = gerarTarefasDeModelo(modelo, params).map((t) => ({
      colaborador_id: t.colaboradorId,
      obra: t.obra,
      cliente: t.cliente,
      fase: t.fase,
      inicio: t.inicio,
      dias: t.dias,
    }));
    const resposta = await supabase.from("tarefas").insert(novasTarefas);
    lancarSeErro(resposta.error);
    return novasTarefas.length;
  },
  login: async (email: string, senha: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password: senha });
    return error ? error.message : null;
  },
  logout: async () => {
    await supabase.auth.signOut();
  },
  salvarUsuario: async (u: NovoUsuarioParams) => {
    const accessToken = state.sessao?.access_token;
    if (!accessToken) throw new Error("Sessão expirada. Faça login novamente.");
    if (u.id) {
      await atualizarUsuarioSv({
        data: {
          accessToken,
          id: u.id,
          nome: u.nome,
          papel: u.papel,
          ...(u.colaboradorId ? { colaboradorId: u.colaboradorId } : {}),
          verTodosNaAgenda: u.verTodosNaAgenda ?? false,
          ...(u.senha ? { novaSenha: u.senha } : {}),
        },
      });
      return;
    }
    if (!u.email || !u.senha)
      throw new Error("E-mail e senha são obrigatórios para criar um usuário.");
    await criarUsuarioSv({
      data: {
        accessToken,
        nome: u.nome,
        email: u.email,
        senha: u.senha,
        papel: u.papel,
        ...(u.colaboradorId ? { colaboradorId: u.colaboradorId } : {}),
        verTodosNaAgenda: u.verTodosNaAgenda ?? false,
      },
    });
  },
  removerUsuario: async (id: string) => {
    const accessToken = state.sessao?.access_token;
    if (!accessToken) throw new Error("Sessão expirada. Faça login novamente.");
    await removerUsuarioSv({ data: { accessToken, id } });
  },
  atualizarNomeProprio: async (nome: string) => {
    const id = state.sessao?.user.id;
    if (!id) throw new Error("Sessão expirada. Faça login novamente.");
    lancarSeErro((await supabase.from("profiles").update({ nome }).eq("id", id)).error);
  },
  atualizarSenhaPropria: async (novaSenha: string) => {
    const { error } = await supabase.auth.updateUser({ password: novaSenha });
    lancarSeErro(error);
  },
  definirTema: (tema: Tema) => {
    salvarTema(tema);
    aplicarTema(tema);
    setState({ tema });
  },
  atualizarConfiguracoesSistema: async (c: Partial<ConfiguracoesSistema>) => {
    if (c.nomeEmpresa === undefined) return;
    lancarSeErro(
      (
        await supabase
          .from("configuracoes_sistema")
          .update({ nome_empresa: c.nomeEmpresa })
          .eq("id", 1)
      ).error,
    );
  },
  exportarBackup: () => JSON.stringify(state, null, 2),
};

/** Mantido por compatibilidade: o estado agora é global, sem necessidade de contexto. */
export function GanttProvider({ children }: { children: ReactNode }) {
  return <>{children}</>;
}

export function useGantt(): Store {
  const snap = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  const usuarioLogado = snap.usuarios.find((u) => u.id === snap.usuarioLogadoId) ?? null;
  return { ...snap, ...acoes, usuarioLogado };
}
