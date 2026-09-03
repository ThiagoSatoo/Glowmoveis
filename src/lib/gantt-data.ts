export type Fase = "corte" | "montagem" | "acabamento" | "entrega";

/** Cargo/função gerenciável (ex.: Montador, Acabamento). */
export type FuncaoDef = {
  id: string;
  nome: string;
};

/** Sentinela usada quando o colaborador não tem função cadastrada (ex.: função removida). */
export const SEM_FUNCAO_ID = "";

export type Colaborador = {
  id: string;
  nome: string;
  funcaoId: string;
};

/** Cadastro de cliente — hoje serve para nome/contato consistentes; os serviços guardam só o nome. */
export type Cliente = {
  id: string;
  nome: string;
  telefone?: string;
  endereco?: string;
  observacoes?: string;
};

export type Tarefa = {
  id: string;
  colaboradorId: string;
  obra: string;
  /** nome do cliente */
  cliente: string;
  fase: Fase;
  /** índice do dia inicial na linha do tempo (0-based) */
  inicio: number;
  /** duração em dias */
  dias: number;
  /** cor customizada da barra (hex); quando ausente, usa a cor padrão da etapa */
  cor?: string | undefined;
};

/** Ausência/folga de um colaborador (férias, atestado, etc.). */
export type Ausencia = {
  id: string;
  colaboradorId: string;
  inicio: number;
  dias: number;
  motivo: string;
};

/** Prazo importante (ex.: entrega prometida ao cliente) numa data da linha do tempo. */
export type Prazo = {
  id: string;
  dia: number;
  descricao: string;
  cliente?: string;
};

/** Uma etapa dentro de um modelo de serviço (ex.: "Corte" por 3 dias). */
export type EtapaModelo = {
  fase: Fase;
  dias: number;
};

/** Modelo/"quick project" — um serviço-tipo com etapas e durações típicas já prontas. */
export type ModeloServico = {
  id: string;
  nome: string;
  etapas: EtapaModelo[];
};

export const faseLabel: Record<Fase, string> = {
  corte: "Corte / Usinagem",
  montagem: "Montagem",
  acabamento: "Acabamento / Pintura",
  entrega: "Instalação / Entrega",
};

export const faseClass: Record<Fase, string> = {
  corte: "bg-phase-corte",
  montagem: "bg-phase-montagem",
  acabamento: "bg-phase-acabamento",
  entrega: "bg-phase-entrega",
};

/** Paleta de cores sugeridas para customizar a barra de um serviço no cronograma. */
export const paletaCores: { nome: string; valor: string }[] = [
  { nome: "Terracota", valor: "#b5502f" },
  { nome: "Âmbar", valor: "#c98a2c" },
  { nome: "Oliva", valor: "#6b7a3a" },
  { nome: "Verde-azulado", valor: "#2f7a6b" },
  { nome: "Azul petróleo", valor: "#2f5f7a" },
  { nome: "Ameixa", valor: "#6b3f7a" },
  { nome: "Vinho", valor: "#7a2f3f" },
  { nome: "Grafite", valor: "#4a4a4a" },
  { nome: "Rosa queimado", valor: "#a85d5d" },
  { nome: "Azul aço", valor: "#4a6785" },
];

/** Escolhe branco ou quase-preto como cor de texto, conforme o brilho relativo do fundo informado. */
export function corContraste(hex: string): string {
  const limpo = hex.replace("#", "");
  if (limpo.length !== 6) return "#fafafa";
  const r = parseInt(limpo.slice(0, 2), 16) / 255;
  const g = parseInt(limpo.slice(2, 4), 16) / 255;
  const b = parseInt(limpo.slice(4, 6), 16) / 255;
  const luminancia = 0.299 * r + 0.587 * g + 0.114 * b;
  return luminancia > 0.6 ? "#221a12" : "#fafafa";
}

export function nomeFuncao(lista: FuncaoDef[], funcaoId: string): string {
  return lista.find((f) => f.id === funcaoId)?.nome ?? "Sem função";
}

/** Preferência de aparência do sistema. */
export type Tema = "claro" | "escuro" | "sistema";

/** Cargo de acesso ao sistema, em ordem crescente de autoridade. */
export type Papel = "usuario" | "gerente" | "admin";

/** Conta de acesso ao sistema — espelha uma linha da tabela `profiles` no Supabase. */
export type Usuario = {
  id: string;
  nome: string;
  email: string;
  papel: Papel;
  /** Vincula esta conta a um funcionário (Colaborador) — usado para restringir o cargo "Usuário" a só ver a própria linha do tempo. */
  colaboradorId?: string | undefined;
  /**
   * Quando o cargo é "usuario": se true, essa conta vê a agenda de todos os funcionários (como
   * admin/gerente); se false/ausente, vê só a própria linha do tempo (a de `colaboradorId`).
   * Sem efeito para os cargos "gerente"/"admin", que sempre veem tudo.
   */
  verTodosNaAgenda?: boolean | undefined;
};

/** Nível de autoridade de cada cargo — quanto maior, mais permissões. */
export const nivelPapel: Record<Papel, number> = { usuario: 1, gerente: 2, admin: 3 };

export const papelLabel: Record<Papel, string> = {
  admin: "Administrador",
  gerente: "Gerente",
  usuario: "Usuário",
};

/**
 * Um ator só pode criar/editar/remover uma conta do cargo `alvo` se: for admin (admin gerencia
 * qualquer cargo, inclusive outros admins), ou se `alvo` estiver estritamente abaixo do seu
 * próprio cargo (ex.: gerente só gerencia contas "usuario", nunca outro gerente ou um admin).
 */
export function podeGerenciarPapel(ator: Papel, alvo: Papel): boolean {
  if (ator === "admin") return true;
  return nivelPapel[alvo] < nivelPapel[ator];
}

/** Lista de cargos que o ator tem permissão de atribuir ao criar ou editar uma conta. */
export function papeisAtribuiveis(ator: Papel): Papel[] {
  return (Object.keys(nivelPapel) as Papel[]).filter((p) => podeGerenciarPapel(ator, p));
}

/** Ajustes gerais do sistema, editáveis em Configurações → Sistema. */
export type ConfiguracoesSistema = {
  nomeEmpresa: string;
};

/** Valor exibido enquanto os dados reais ainda não chegaram do Supabase. */
export const configuracoesSistemaIniciais: ConfiguracoesSistema = {
  nomeEmpresa: "Carregando…",
};

const semana = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];

export type Dia = {
  index: number;
  label: string;
  diaSemana: string;
  fimDeSemana: boolean;
  hoje: boolean;
};

export type Periodo = "dia" | "semana" | "mes" | "ano";

export const periodoLabel: Record<Periodo, string> = {
  dia: "Dia",
  semana: "Semana",
  mes: "Mês",
  ano: "Ano",
};

export const periodoDias: Record<Periodo, number> = {
  dia: 1,
  semana: 7,
  mes: 30,
  ano: 365,
};

/** Linha do tempo em dias começando na segunda-feira da semana atual. */
export function gerarDias(total = 14): Dia[] {
  const hoje = new Date();
  const base = new Date(hoje);
  const offset = (base.getDay() + 6) % 7; // segunda = 0
  base.setDate(base.getDate() - offset);

  return Array.from({ length: total }, (_, i) => {
    const d = new Date(base);
    d.setDate(base.getDate() + i);
    return {
      index: i,
      label: `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`,
      diaSemana: semana[d.getDay()]!,
      fimDeSemana: d.getDay() === 0 || d.getDay() === 6,
      hoje: d.toDateString() === hoje.toDateString(),
    };
  });
}

const periodosSeSobrepoe = (aInicio: number, aDias: number, bInicio: number, bDias: number) =>
  aInicio < bInicio + bDias && bInicio < aInicio + aDias;

/** Mapa tarefaId -> lista de motivos de conflito (sobreposição com outra tarefa ou com uma ausência). */
export type ConflitosPorTarefa = Map<string, string[]>;

export function detectarConflitos(tarefas: Tarefa[], ausencias: Ausencia[]): ConflitosPorTarefa {
  const conflitos: ConflitosPorTarefa = new Map();

  const adicionar = (id: string, motivo: string) => {
    const atuais = conflitos.get(id);
    if (atuais) {
      if (!atuais.includes(motivo)) atuais.push(motivo);
    } else {
      conflitos.set(id, [motivo]);
    }
  };

  for (let i = 0; i < tarefas.length; i++) {
    const a = tarefas[i]!;

    for (let j = i + 1; j < tarefas.length; j++) {
      const b = tarefas[j]!;
      if (a.colaboradorId !== b.colaboradorId) continue;
      if (periodosSeSobrepoe(a.inicio, a.dias, b.inicio, b.dias)) {
        adicionar(a.id, `Sobrepõe "${b.obra}"`);
        adicionar(b.id, `Sobrepõe "${a.obra}"`);
      }
    }

    for (const ausencia of ausencias) {
      if (a.colaboradorId !== ausencia.colaboradorId) continue;
      if (periodosSeSobrepoe(a.inicio, a.dias, ausencia.inicio, ausencia.dias)) {
        adicionar(a.id, `Colaborador ausente (${ausencia.motivo})`);
      }
    }
  }

  return conflitos;
}

/** Retorna a ausência (se houver) que cobre o colaborador informado no dia informado. */
export function ausenteEm(
  ausencias: Ausencia[],
  colaboradorId: string,
  diaIndex: number,
): Ausencia | undefined {
  return ausencias.find(
    (a) =>
      a.colaboradorId === colaboradorId &&
      diaIndex >= a.inicio &&
      diaIndex <= a.inicio + a.dias - 1,
  );
}

/**
 * Expande um modelo de serviço ("quick project") numa sequência de tarefas — uma por etapa,
 * encadeadas no tempo (a etapa seguinte começa assim que a anterior termina). Todas as etapas
 * saem com o mesmo colaborador; o ajuste fino (trocar o responsável de uma etapa específica,
 * mudar a duração etc.) é feito depois, editando cada tarefa normalmente.
 */
export function gerarTarefasDeModelo(
  modelo: ModeloServico,
  params: { obra: string; cliente: string; colaboradorId: string; inicio: number },
): Omit<Tarefa, "id">[] {
  let cursor = params.inicio;
  return modelo.etapas.map((etapa) => {
    const tarefa: Omit<Tarefa, "id"> = {
      colaboradorId: params.colaboradorId,
      obra: params.obra,
      cliente: params.cliente,
      fase: etapa.fase,
      inicio: cursor,
      dias: etapa.dias,
    };
    cursor += etapa.dias;
    return tarefa;
  });
}
