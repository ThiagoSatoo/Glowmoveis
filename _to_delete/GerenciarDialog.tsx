import { useState } from "react";
import { Pencil, Plus, Settings2, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  faseClass,
  faseLabel,
  nomeFuncao,
  SEM_FUNCAO_ID,
  type Dia,
  type Fase,
  type Tarefa,
} from "@/lib/gantt-data";
import { useGantt } from "@/lib/gantt-store";

const fases = Object.keys(faseLabel) as Fase[];

export function GerenciarDialog({ dias }: { dias: Dia[] }) {
  const {
    colaboradores,
    tarefas,
    funcoes,
    ausencias,
    marcos,
    salvarColaborador,
    removerColaborador,
    salvarTarefa,
    removerTarefa,
    salvarFuncao,
    removerFuncao,
    salvarAusencia,
    removerAusencia,
    salvarMarco,
    removerMarco,
    desfazer,
    refazer,
  } = useGantt();

  function avisarComRefazer(mensagem = "Ação desfeita.") {
    toast(mensagem, {
      action: {
        label: "Refazer",
        onClick: () => {
          refazer();
          avisarComDesfazer("Ação refeita.");
        },
      },
      duration: 6000,
    });
  }

  function avisarComDesfazer(mensagem: string) {
    toast(mensagem, {
      action: {
        label: "Desfazer",
        onClick: () => {
          desfazer();
          avisarComRefazer();
        },
      },
      duration: 6000,
    });
  }

  const [aberto, setAberto] = useState(false);

  // formulário de colaborador
  const [colabId, setColabId] = useState<string | undefined>();
  const [nome, setNome] = useState("");
  const [funcaoId, setFuncaoId] = useState(SEM_FUNCAO_ID);
  const [novaFuncaoRapida, setNovaFuncaoRapida] = useState("");

  // formulário de função (cargo)
  const [funcaoEditId, setFuncaoEditId] = useState<string | undefined>();
  const [funcaoNomeCampo, setFuncaoNomeCampo] = useState("");

  // formulário de serviço
  const [tarefaId, setTarefaId] = useState<string | undefined>();
  const [obra, setObra] = useState("");
  const [clienteNome, setClienteNome] = useState("");
  const [fase, setFase] = useState<Fase>("corte");
  const [responsavel, setResponsavel] = useState("");
  const [inicio, setInicio] = useState("0");
  const [dias_, setDias] = useState("2");

  // formulário de ausência
  const [ausenciaId, setAusenciaId] = useState<string | undefined>();
  const [ausColaboradorId, setAusColaboradorId] = useState("");
  const [ausInicio, setAusInicio] = useState("0");
  const [ausDias, setAusDias] = useState("1");
  const [ausMotivo, setAusMotivo] = useState("");

  // formulário de marco
  const [marcoId, setMarcoId] = useState<string | undefined>();
  const [marcoDia, setMarcoDia] = useState("0");
  const [marcoDescricao, setMarcoDescricao] = useState("");
  const [marcoCliente, setMarcoCliente] = useState("");

  const limparColab = () => {
    setColabId(undefined);
    setNome("");
    setFuncaoId(SEM_FUNCAO_ID);
    setNovaFuncaoRapida("");
  };

  const limparFuncao = () => {
    setFuncaoEditId(undefined);
    setFuncaoNomeCampo("");
  };

  const limparTarefa = () => {
    setTarefaId(undefined);
    setObra("");
    setClienteNome("");
    setFase("corte");
    setResponsavel(colaboradores[0]?.id ?? "");
    setInicio("0");
    setDias("2");
  };

  const limparAusencia = () => {
    setAusenciaId(undefined);
    setAusColaboradorId(colaboradores[0]?.id ?? "");
    setAusInicio("0");
    setAusDias("1");
    setAusMotivo("");
  };

  const limparMarco = () => {
    setMarcoId(undefined);
    setMarcoDia("0");
    setMarcoDescricao("");
    setMarcoCliente("");
  };

  const editarColab = (id: string) => {
    const c = colaboradores.find((x) => x.id === id);
    if (!c) return;
    setColabId(c.id);
    setNome(c.nome);
    setFuncaoId(c.funcaoId);
  };

  const editarFuncao = (id: string) => {
    const f = funcoes.find((x) => x.id === id);
    if (!f) return;
    setFuncaoEditId(f.id);
    setFuncaoNomeCampo(f.nome);
  };

  const editarTarefa = (t: Tarefa) => {
    setTarefaId(t.id);
    setObra(t.obra);
    setClienteNome(t.cliente);
    setFase(t.fase);
    setResponsavel(t.colaboradorId);
    setInicio(String(t.inicio));
    setDias(String(t.dias));
  };

  const editarAusencia = (id: string) => {
    const a = ausencias.find((x) => x.id === id);
    if (!a) return;
    setAusenciaId(a.id);
    setAusColaboradorId(a.colaboradorId);
    setAusInicio(String(a.inicio));
    setAusDias(String(a.dias));
    setAusMotivo(a.motivo);
  };

  const editarMarco = (id: string) => {
    const m = marcos.find((x) => x.id === id);
    if (!m) return;
    setMarcoId(m.id);
    setMarcoDia(String(m.dia));
    setMarcoDescricao(m.descricao);
    setMarcoCliente(m.cliente ?? "");
  };

  const submeterColab = () => {
    if (!nome.trim()) return;
    salvarColaborador({ id: colabId, nome: nome.trim(), funcaoId });
    avisarComDesfazer(
      colabId
        ? `Funcionário "${nome.trim()}" atualizado.`
        : `Funcionário "${nome.trim()}" adicionado.`,
    );
    limparColab();
  };

  const criarFuncaoRapida = () => {
    const texto = novaFuncaoRapida.trim();
    if (!texto) return;
    const id = salvarFuncao({ nome: texto });
    setFuncaoId(id);
    setNovaFuncaoRapida("");
  };

  const submeterFuncao = () => {
    if (!funcaoNomeCampo.trim()) return;
    salvarFuncao({ id: funcaoEditId, nome: funcaoNomeCampo.trim() });
    avisarComDesfazer(
      funcaoEditId
        ? `Função "${funcaoNomeCampo.trim()}" atualizada.`
        : `Função "${funcaoNomeCampo.trim()}" adicionada.`,
    );
    limparFuncao();
  };

  const submeterTarefa = () => {
    const resp = responsavel || colaboradores[0]?.id;
    if (!obra.trim() || !resp) return;
    salvarTarefa({
      id: tarefaId,
      obra: obra.trim(),
      cliente: clienteNome.trim() || "Sem cliente",
      fase,
      colaboradorId: resp,
      inicio: Number(inicio),
      dias: Math.max(1, Number(dias_) || 1),
    });
    avisarComDesfazer(
      tarefaId ? `Serviço "${obra.trim()}" atualizado.` : `Serviço "${obra.trim()}" adicionado.`,
    );
    limparTarefa();
  };

  const submeterAusencia = () => {
    const colaborador = ausColaboradorId || colaboradores[0]?.id;
    if (!colaborador || !ausMotivo.trim()) return;
    salvarAusencia({
      id: ausenciaId,
      colaboradorId: colaborador,
      inicio: Number(ausInicio),
      dias: Math.max(1, Number(ausDias) || 1),
      motivo: ausMotivo.trim(),
    });
    avisarComDesfazer(ausenciaId ? "Ausência atualizada." : "Ausência registrada.");
    limparAusencia();
  };

  const submeterMarco = () => {
    if (!marcoDescricao.trim()) return;
    salvarMarco({
      id: marcoId,
      dia: Number(marcoDia),
      descricao: marcoDescricao.trim(),
      ...(marcoCliente.trim() ? { cliente: marcoCliente.trim() } : {}),
    });
    avisarComDesfazer(marcoId ? "Marco atualizado." : "Marco adicionado.");
    limparMarco();
  };

  return (
    <Dialog
      open={aberto}
      onOpenChange={(v) => {
        setAberto(v);
        if (v) {
          limparColab();
          limparFuncao();
          limparTarefa();
          limparAusencia();
          limparMarco();
        }
      }}
    >
      <DialogTrigger asChild>
        <Button variant="secondary">
          <Settings2 className="mr-2 size-4" />
          Gerenciar
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Equipe e serviços</DialogTitle>
          <DialogDescription>
            Cadastre funcionários, funções, serviços, ausências e marcos do cronograma.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="funcionarios">
          <TabsList className="flex h-auto w-full flex-wrap gap-1">
            <TabsTrigger value="funcionarios" className="min-w-[6rem] flex-1">
              Funcionários
            </TabsTrigger>
            <TabsTrigger value="funcoes" className="min-w-[6rem] flex-1">
              Funções
            </TabsTrigger>
            <TabsTrigger value="servicos" className="min-w-[6rem] flex-1">
              Serviços
            </TabsTrigger>
            <TabsTrigger value="ausencias" className="min-w-[6rem] flex-1">
              Ausências
            </TabsTrigger>
            <TabsTrigger value="marcos" className="min-w-[6rem] flex-1">
              Marcos
            </TabsTrigger>
          </TabsList>

          <TabsContent value="funcionarios" className="space-y-4 pt-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="nome">Nome</Label>
                <Input
                  id="nome"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  placeholder="Ex.: João Batista"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Função</Label>
                <Select value={funcaoId} onValueChange={setFuncaoId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Sem função" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={SEM_FUNCAO_ID}>Sem função</SelectItem>
                    {funcoes.map((f) => (
                      <SelectItem key={f.id} value={f.id}>
                        {f.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="nova-funcao-rapida" className="text-xs text-muted-foreground">
                  Não achou a função? Cadastre uma nova sem sair daqui:
                </Label>
                <div className="flex gap-2">
                  <Input
                    id="nova-funcao-rapida"
                    value={novaFuncaoRapida}
                    onChange={(e) => setNovaFuncaoRapida(e.target.value)}
                    placeholder="Ex.: Estofador"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        criarFuncaoRapida();
                      }
                    }}
                  />
                  <Button type="button" variant="secondary" onClick={criarFuncaoRapida}>
                    <Plus className="mr-1 size-4" />
                    Criar função
                  </Button>
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <Button onClick={submeterColab}>
                <Plus className="mr-2 size-4" />
                {colabId ? "Salvar alterações" : "Adicionar funcionário"}
              </Button>
              {colabId && (
                <Button variant="ghost" onClick={limparColab}>
                  Cancelar
                </Button>
              )}
            </div>

            <ul className="divide-y divide-border rounded-md border border-border">
              {colaboradores.map((c) => (
                <li key={c.id} className="flex items-center gap-2 p-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{c.nome}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {nomeFuncao(funcoes, c.funcaoId)}
                    </p>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => editarColab(c.id)}>
                    <Pencil className="size-4" />
                    <span className="sr-only">Editar {c.nome}</span>
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      removerColaborador(c.id);
                      avisarComDesfazer(`Funcionário "${c.nome}" removido.`);
                    }}
                  >
                    <Trash2 className="size-4 text-destructive" />
                    <span className="sr-only">Remover {c.nome}</span>
                  </Button>
                </li>
              ))}
              {colaboradores.length === 0 && (
                <li className="p-3 text-sm text-muted-foreground">
                  Nenhum funcionário cadastrado.
                </li>
              )}
            </ul>
          </TabsContent>

          <TabsContent value="funcoes" className="space-y-4 pt-4">
            <p className="text-xs text-muted-foreground">
              As funções aparecem no cadastro de funcionários e no filtro do cronograma. Remover uma
              função deixa os funcionários que a usavam como "sem função".
            </p>
            <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
              <div className="space-y-1.5">
                <Label htmlFor="funcao-nome">Nome da função</Label>
                <Input
                  id="funcao-nome"
                  value={funcaoNomeCampo}
                  onChange={(e) => setFuncaoNomeCampo(e.target.value)}
                  placeholder="Ex.: Estofador"
                />
              </div>
              <div className="flex items-end gap-2">
                <Button onClick={submeterFuncao}>
                  <Plus className="mr-2 size-4" />
                  {funcaoEditId ? "Salvar" : "Adicionar"}
                </Button>
                {funcaoEditId && (
                  <Button variant="ghost" onClick={limparFuncao}>
                    Cancelar
                  </Button>
                )}
              </div>
            </div>

            <ul className="divide-y divide-border rounded-md border border-border">
              {funcoes.map((f) => {
                const emUso = colaboradores.filter((c) => c.funcaoId === f.id).length;
                return (
                  <li key={f.id} className="flex items-center gap-2 p-3">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold">{f.nome}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {emUso} {emUso === 1 ? "funcionário" : "funcionários"}
                      </p>
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => editarFuncao(f.id)}>
                      <Pencil className="size-4" />
                      <span className="sr-only">Editar {f.nome}</span>
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        removerFuncao(f.id);
                        avisarComDesfazer(`Função "${f.nome}" removida.`);
                      }}
                    >
                      <Trash2 className="size-4 text-destructive" />
                      <span className="sr-only">Remover {f.nome}</span>
                    </Button>
                  </li>
                );
              })}
              {funcoes.length === 0 && (
                <li className="p-3 text-sm text-muted-foreground">Nenhuma função cadastrada.</li>
              )}
            </ul>
          </TabsContent>

          <TabsContent value="servicos" className="space-y-4 pt-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="obra">Serviço / obra</Label>
                <Input
                  id="obra"
                  value={obra}
                  onChange={(e) => setObra(e.target.value)}
                  placeholder="Ex.: Guarda-roupa Apto 51"
                />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="cliente">Cliente</Label>
                <Input
                  id="cliente"
                  value={clienteNome}
                  onChange={(e) => setClienteNome(e.target.value)}
                  placeholder="Ex.: Fernanda Rocha"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Etapa</Label>
                <Select value={fase} onValueChange={(v) => setFase(v as Fase)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {fases.map((f) => (
                      <SelectItem key={f} value={f}>
                        {faseLabel[f]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Responsável</Label>
                <Select
                  value={responsavel || colaboradores[0]?.id || ""}
                  onValueChange={setResponsavel}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Escolha" />
                  </SelectTrigger>
                  <SelectContent>
                    {colaboradores.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Início</Label>
                <Select value={inicio} onValueChange={setInicio}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {dias.map((d) => (
                      <SelectItem key={d.index} value={String(d.index)}>
                        {d.label} ({d.diaSemana})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="duracao">Duração (dias)</Label>
                <Input
                  id="duracao"
                  type="number"
                  min={1}
                  max={dias.length}
                  value={dias_}
                  onChange={(e) => setDias(e.target.value)}
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Button onClick={submeterTarefa}>
                <Plus className="mr-2 size-4" />
                {tarefaId ? "Salvar alterações" : "Adicionar serviço"}
              </Button>
              {tarefaId && (
                <Button variant="ghost" onClick={limparTarefa}>
                  Cancelar
                </Button>
              )}
            </div>

            <ul className="divide-y divide-border rounded-md border border-border">
              {tarefas.map((t) => (
                <li key={t.id} className="flex items-center gap-2 p-3">
                  <span className={`size-3 shrink-0 rounded-sm ${faseClass[t.fase]}`} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{t.obra}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {t.cliente} ·{" "}
                      {colaboradores.find((c) => c.id === t.colaboradorId)?.nome ??
                        "Sem responsável"}
                      {" · "}
                      {dias[t.inicio]?.label ?? "?"} · {t.dias} dias
                    </p>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => editarTarefa(t)}>
                    <Pencil className="size-4" />
                    <span className="sr-only">Editar {t.obra}</span>
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      removerTarefa(t.id);
                      avisarComDesfazer(`Serviço "${t.obra}" excluído.`);
                    }}
                  >
                    <Trash2 className="size-4 text-destructive" />
                    <span className="sr-only">Remover {t.obra}</span>
                  </Button>
                </li>
              ))}
              {tarefas.length === 0 && (
                <li className="p-3 text-sm text-muted-foreground">Nenhum serviço cadastrado.</li>
              )}
            </ul>
          </TabsContent>

          <TabsContent value="ausencias" className="space-y-4 pt-4">
            <p className="text-xs text-muted-foreground">
              Férias, atestados e folgas aparecem como período bloqueado na agenda do colaborador e
              entram na detecção de conflitos.
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Colaborador</Label>
                <Select
                  value={ausColaboradorId || colaboradores[0]?.id || ""}
                  onValueChange={setAusColaboradorId}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Escolha" />
                  </SelectTrigger>
                  <SelectContent>
                    {colaboradores.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="aus-motivo">Motivo</Label>
                <Input
                  id="aus-motivo"
                  value={ausMotivo}
                  onChange={(e) => setAusMotivo(e.target.value)}
                  placeholder="Ex.: Férias"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Início</Label>
                <Select value={ausInicio} onValueChange={setAusInicio}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {dias.map((d) => (
                      <SelectItem key={d.index} value={String(d.index)}>
                        {d.label} ({d.diaSemana})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="aus-duracao">Duração (dias)</Label>
                <Input
                  id="aus-duracao"
                  type="number"
                  min={1}
                  max={dias.length}
                  value={ausDias}
                  onChange={(e) => setAusDias(e.target.value)}
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Button onClick={submeterAusencia}>
                <Plus className="mr-2 size-4" />
                {ausenciaId ? "Salvar alterações" : "Registrar ausência"}
              </Button>
              {ausenciaId && (
                <Button variant="ghost" onClick={limparAusencia}>
                  Cancelar
                </Button>
              )}
            </div>

            <ul className="divide-y divide-border rounded-md border border-border">
              {ausencias.map((a) => (
                <li key={a.id} className="flex items-center gap-2 p-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">
                      {colaboradores.find((c) => c.id === a.colaboradorId)?.nome ??
                        "Sem colaborador"}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {a.motivo} · {dias[a.inicio]?.label ?? "?"} · {a.dias}{" "}
                      {a.dias === 1 ? "dia" : "dias"}
                    </p>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => editarAusencia(a.id)}>
                    <Pencil className="size-4" />
                    <span className="sr-only">Editar ausência</span>
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      removerAusencia(a.id);
                      avisarComDesfazer("Ausência removida.");
                    }}
                  >
                    <Trash2 className="size-4 text-destructive" />
                    <span className="sr-only">Remover ausência</span>
                  </Button>
                </li>
              ))}
              {ausencias.length === 0 && (
                <li className="p-3 text-sm text-muted-foreground">Nenhuma ausência registrada.</li>
              )}
            </ul>
          </TabsContent>

          <TabsContent value="marcos" className="space-y-4 pt-4">
            <p className="text-xs text-muted-foreground">
              Marcos aparecem como um marcador na linha do tempo — use para prazos e entregas
              prometidas ao cliente.
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="marco-descricao">Descrição</Label>
                <Input
                  id="marco-descricao"
                  value={marcoDescricao}
                  onChange={(e) => setMarcoDescricao(e.target.value)}
                  placeholder="Ex.: Entrega prometida"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="marco-cliente">Cliente (opcional)</Label>
                <Input
                  id="marco-cliente"
                  value={marcoCliente}
                  onChange={(e) => setMarcoCliente(e.target.value)}
                  placeholder="Ex.: Fernanda Rocha"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Data</Label>
                <Select value={marcoDia} onValueChange={setMarcoDia}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {dias.map((d) => (
                      <SelectItem key={d.index} value={String(d.index)}>
                        {d.label} ({d.diaSemana})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex gap-2">
              <Button onClick={submeterMarco}>
                <Plus className="mr-2 size-4" />
                {marcoId ? "Salvar alterações" : "Adicionar marco"}
              </Button>
              {marcoId && (
                <Button variant="ghost" onClick={limparMarco}>
                  Cancelar
                </Button>
              )}
            </div>

            <ul className="divide-y divide-border rounded-md border border-border">
              {marcos.map((m) => (
                <li key={m.id} className="flex items-center gap-2 p-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{m.descricao}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {dias[m.dia]?.label ?? "?"}
                      {m.cliente ? ` · ${m.cliente}` : ""}
                    </p>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => editarMarco(m.id)}>
                    <Pencil className="size-4" />
                    <span className="sr-only">Editar marco</span>
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      removerMarco(m.id);
                      avisarComDesfazer("Marco removido.");
                    }}
                  >
                    <Trash2 className="size-4 text-destructive" />
                    <span className="sr-only">Remover marco</span>
                  </Button>
                </li>
              ))}
              {marcos.length === 0 && (
                <li className="p-3 text-sm text-muted-foreground">Nenhum marco cadastrado.</li>
              )}
            </ul>
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Badge variant="outline" className="mr-auto font-normal">
            {colaboradores.length} funcionários · {tarefas.length} serviços
          </Badge>
          <Button variant="secondary" onClick={() => setAberto(false)}>
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
