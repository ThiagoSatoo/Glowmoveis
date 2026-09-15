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
  /** CPF (só dígitos, 11 caracteres) — usado como login/senha da conta de acesso desse funcionário. */
  cpf?: string | undefined;
};

/**
 * Domínio fake usado para transformar um CPF num "e-mail" válido perante o Supabase Auth (que
 * exige formato de e-mail). Nunca é exibido ao usuário — na UI sempre mostramos o CPF formatado.
 */
export const DOMINIO_LOGIN_CPF = "colaborador.cpf.login";

/** Remove tudo que não for dígito (pontos, traço, espaços, etc.). */
export function somenteDigitos(valor: string): string {
  return valor.replace(/\D/g, "");
}

/**
 * Valida um CPF pelo algoritmo oficial de dígitos verificadores (aceita tanto "12345678900"
 * quanto "123.456.789-00" — normaliza internamente). Rejeita sequências de dígito repetido
 * (ex.: "00000000000"), que passariam no cálculo mas não são CPFs válidos.
 */
export function cpfValido(cpf: string): boolean {
  const digitos = somenteDigitos(cpf);
  if (digitos.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(digitos)) return false;

  const calcularDigito = (base: string, fatorInicial: number): number => {
    let soma = 0;
    let fator = fatorInicial;
    for (const c of base) {
      soma += Number(c) * fator;
      fator -= 1;
    }
    const resto = soma % 11;
    return resto < 2 ? 0 : 11 - resto;
  };

  const primeiroDigito = calcularDigito(digitos.slice(0, 9), 10);
  const segundoDigito = calcularDigito(digitos.slice(0, 9) + String(primeiroDigito), 11);

  return digitos[9] === String(primeiroDigito) && digitos[10] === String(segundoDigito);
}

/** Formata 11 dígitos como "000.000.000-00". Retorna a entrada sem alteração se não tiver 11 dígitos. */
export function formatarCpf(cpf: string): string {
  const digitos = somenteDigitos(cpf);
  if (digitos.length !== 11) return cpf;
  return `${digitos.slice(0, 3)}.${digitos.slice(3, 6)}.${digitos.slice(6, 9)}-${digitos.slice(9)}`;
}

/** Constrói o "e-mail" fake usado internamente como login/Auth para um CPF (só dígitos). */
export function emailDoCpf(cpf: string): string {
  return `${somenteDigitos(cpf)}@${DOMINIO_LOGIN_CPF}`;
}

/** Indica se um e-mail é, na verdade, um login de CPF gerado por `emailDoCpf`. */
export function ehEmailDeCpf(email: string): boolean {
  return email.toLowerCase().endsWith(`@${DOMINIO_LOGIN_CPF}`);
}

/** Extrai os dígitos do CPF de um e-mail gerado por `emailDoCpf` (ou `undefined` se não for um). */
export function extrairCpfDoEmail(email: string): string | undefined {
  if (!ehEmailDeCpf(email)) return undefined;
  return email.slice(0, email.indexOf("@"));
}

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

/**
 * Quantos serviços e quantos pedidos um cliente já fez. Um "serviço" é uma tarefa (uma etapa
 * do cronograma); um "pedido" é um trabalho — pode reunir várias tarefas/etapas (ex.: um
 * guarda-roupa criado a partir de um modelo vira 4 tarefas — corte, montagem, acabamento,
 * entrega — mas conta como 1 pedido só). Como o sistema não tem um cadastro separado de
 * "pedido", agrupamos pelo nome da obra: tarefas do mesmo cliente com a mesma obra são o
 * mesmo pedido.
 */
export function estatisticasCliente(
  tarefas: Tarefa[],
  clienteNome: string,
): { servicos: number; pedidos: number } {
  const doCliente = tarefas.filter((t) => t.cliente === clienteNome);
  const pedidos = new Set(doCliente.map((t) => t.obra));
  return { servicos: doCliente.length, pedidos: pedidos.size };
}

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
  /**
   * Se false, a conta está desativada: perde acesso ao sistema imediatamente (bloqueado tanto no
   * login/Auth quanto nas políticas de RLS). Contas novas nascem ativas; ausente é tratado como
   * `true` para não quebrar dados antigos.
   */
  ativo?: boolean | undefined;
  /**
   * Personalização das cores das etapas só para esta conta (sobrepõe, campo a campo, a cor
   * padrão do sistema — veja `coresFasesEfetivas`). Ausente/parcial = usa o padrão do sistema
   * para as etapas não personalizadas.
   */
  coresFases?: Partial<Record<Fase, string>> | undefined;
  /**
   * Personalização das cores gerais da tela (fundo, texto, destaque etc.) só para esta conta —
   * veja `CORES_TEMA_TOKENS`/`aplicarPropriedadesCssTema`. Ausente/parcial = usa o visual padrão
   * do sistema para o que não foi personalizado. Só tem efeito no tema claro: o tema escuro
   * nunca muda por causa disso.
   */
  coresTema?: CoresTema | undefined;
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

/**
 * Cor padrão de cada etapa quando ninguém personalizou nada ainda — mesmo visual que o
 * sistema sempre teve. Só serve de "semente"; a partir daqui, tudo é configurável em
 * Configurações → Sistema (padrão do sistema) e Configurações → Perfil (por usuário).
 */
export const CORES_FASES_PADRAO: Record<Fase, string> = {
  corte: "#2f6f8f",
  montagem: "#c98a2c",
  acabamento: "#3f8f5f",
  entrega: "#6b3f7a",
};

/**
 * Resolve a cor efetiva de cada etapa para uma pessoa: a personalização dela (`usuario`) tem
 * prioridade, e cai para o padrão do sistema (`sistema`) em quem ela não mexeu. Isso não inclui
 * a cor personalizada por serviço individual (campo `cor` em `Tarefa`), que continua sendo
 * decidida à parte (tem prioridade máxima quando definida).
 */
export function coresFasesEfetivas(
  sistema: Record<Fase, string>,
  usuario?: Partial<Record<Fase, string>> | undefined,
): Record<Fase, string> {
  return { ...sistema, ...usuario };
}

/** Uma das cores gerais da tela que a pessoa pode personalizar (fora das cores das etapas, que já têm sua própria personalização em `coresFases`). */
export type ChaveCorTema =
  "primary" | "background" | "foreground" | "card" | "sidebar" | "accent" | "border";

/** Personalização das cores gerais da tela — mapa parcial: só as cores que a pessoa mexeu. */
export type CoresTema = Partial<Record<ChaveCorTema, string>>;

/** Linha de swatches mostrada em Configurações → Perfil, com a cor padrão de cada uma para referência. */
export const CORES_TEMA_TOKENS: { chave: ChaveCorTema; nome: string; padrao: string }[] = [
  { chave: "primary", nome: "Cor principal", padrao: "#853f17" },
  { chave: "background", nome: "Fundo da tela", padrao: "#f9f3e7" },
  { chave: "foreground", nome: "Texto", padrao: "#2d1c12" },
  { chave: "card", nome: "Cartões e painéis", padrao: "#fefbf4" },
  { chave: "sidebar", nome: "Menu lateral", padrao: "#f1e6d6" },
  { chave: "accent", nome: "Destaque", padrao: "#f2a954" },
  { chave: "border", nome: "Bordas e contornos", padrao: "#ded2c0" },
];

/** Todas as variáveis CSS que a personalização de tema chega a tocar — usada para limpar tudo de uma vez. */
const PROPRIEDADES_CSS_TEMA = [
  "--primary",
  "--primary-foreground",
  "--ring",
  "--sidebar-ring",
  "--background",
  "--foreground",
  "--card-foreground",
  "--popover-foreground",
  "--sidebar-foreground",
  "--card",
  "--popover",
  "--sidebar",
  "--accent",
  "--accent-foreground",
  "--border",
  "--input",
  "--sidebar-border",
] as const;

/**
 * Converte a personalização da pessoa nas variáveis CSS reais que cada cor controla. Cada cor
 * escolhida também define automaticamente sua cor de texto/contraste (via `corContraste`), para
 * nunca dar em texto ilegível — a pessoa só escolhe o fundo, não o par.
 */
function propriedadesCssDeCoresTema(cores: CoresTema): Partial<Record<string, string>> {
  const props: Partial<Record<string, string>> = {};
  if (cores.primary) {
    props["--primary"] = cores.primary;
    props["--primary-foreground"] = corContraste(cores.primary);
    props["--ring"] = cores.primary;
    props["--sidebar-ring"] = cores.primary;
  }
  if (cores.background) props["--background"] = cores.background;
  if (cores.foreground) {
    props["--foreground"] = cores.foreground;
    props["--card-foreground"] = cores.foreground;
    props["--popover-foreground"] = cores.foreground;
    props["--sidebar-foreground"] = cores.foreground;
  }
  if (cores.card) {
    props["--card"] = cores.card;
    props["--popover"] = cores.card;
  }
  if (cores.sidebar) props["--sidebar"] = cores.sidebar;
  if (cores.accent) {
    props["--accent"] = cores.accent;
    props["--accent-foreground"] = corContraste(cores.accent);
  }
  if (cores.border) {
    props["--border"] = cores.border;
    props["--input"] = cores.border;
    props["--sidebar-border"] = cores.border;
  }
  return props;
}

/** Remove toda personalização de cor de tema do elemento, voltando ao visual padrão (claro ou escuro). */
export function limparPropriedadesCssTema(raiz: HTMLElement): void {
  for (const p of PROPRIEDADES_CSS_TEMA) raiz.style.removeProperty(p);
}

/**
 * Aplica a personalização de cores da pessoa no elemento (normalmente `document.documentElement`).
 * Chame só quando o tema efetivo for claro — o tema escuro nunca deve ser tocado por isto.
 */
export function aplicarPropriedadesCssTema(raiz: HTMLElement, cores: CoresTema): void {
  limparPropriedadesCssTema(raiz);
  for (const [chave, valor] of Object.entries(propriedadesCssDeCoresTema(cores))) {
    if (valor) raiz.style.setProperty(chave, valor);
  }
}

/** Ajustes gerais do sistema, editáveis em Configurações → Sistema. */
export type ConfiguracoesSistema = {
  nomeEmpresa: string;
  /** Cor padrão de cada etapa para todo mundo que não personalizou a própria (veja `Usuario.coresFases`). */
  coresFases: Record<Fase, string>;
};

/** Valor exibido enquanto os dados reais ainda não chegaram do Supabase. */
export const configuracoesSistemaIniciais: ConfiguracoesSistema = {
  nomeEmpresa: "Carregando…",
  coresFases: CORES_FASES_PADRAO,
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
