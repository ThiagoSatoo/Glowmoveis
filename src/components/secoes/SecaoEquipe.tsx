import { useState } from "react";
import { toast } from "sonner";
import { Pencil, Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  nomeFuncao,
  papeisAtribuiveis,
  papelLabel,
  podeGerenciarPapel,
  SEM_FUNCAO_ID,
  type Papel,
  type Usuario,
} from "@/lib/gantt-data";
import { useGantt } from "@/lib/gantt-store";
import { useDesfazerToast } from "@/lib/undo-toast";

const SEM_VINCULO = "";

function mensagemErro(erro: unknown, padrao: string) {
  return erro instanceof Error ? erro.message : padrao;
}

export function SecaoEquipe() {
  const {
    colaboradores,
    funcoes,
    salvarColaborador,
    removerColaborador,
    salvarFuncao,
    removerFuncao,
    usuarios,
    usuarioLogado,
    salvarUsuario,
    removerUsuario,
  } = useGantt();
  const { avisarComDesfazer } = useDesfazerToast();

  const podeGerenciarUsuarios =
    usuarioLogado?.papel === "admin" || usuarioLogado?.papel === "gerente";
  const cargosAtribuiveis = usuarioLogado ? papeisAtribuiveis(usuarioLogado.papel) : [];
  const admins = usuarios.filter((u) => u.papel === "admin").length;

  // formulário de colaborador
  const [colabId, setColabId] = useState<string | undefined>();
  const [nome, setNome] = useState("");
  const [funcaoId, setFuncaoId] = useState(SEM_FUNCAO_ID);
  const [novaFuncaoRapida, setNovaFuncaoRapida] = useState("");

  // formulário de função
  const [funcaoEditId, setFuncaoEditId] = useState<string | undefined>();
  const [funcaoNomeCampo, setFuncaoNomeCampo] = useState("");

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

  const submeterColab = async () => {
    if (!nome.trim()) {
      toast.error("Digite o nome do funcionário.");
      return;
    }
    try {
      await salvarColaborador({ id: colabId, nome: nome.trim(), funcaoId });
      avisarComDesfazer(
        colabId
          ? `Funcionário "${nome.trim()}" atualizado.`
          : `Funcionário "${nome.trim()}" adicionado.`,
      );
      limparColab();
    } catch (erro) {
      toast.error(mensagemErro(erro, "Não foi possível salvar o funcionário."));
    }
  };

  const criarFuncaoRapida = async () => {
    const texto = novaFuncaoRapida.trim();
    if (!texto) {
      toast.error("Digite o nome da função.");
      return;
    }
    try {
      const id = await salvarFuncao({ nome: texto });
      setFuncaoId(id);
      setNovaFuncaoRapida("");
    } catch (erro) {
      toast.error(mensagemErro(erro, "Não foi possível criar a função."));
    }
  };

  const submeterFuncao = async () => {
    if (!funcaoNomeCampo.trim()) {
      toast.error("Digite o nome da função.");
      return;
    }
    try {
      await salvarFuncao({ id: funcaoEditId, nome: funcaoNomeCampo.trim() });
      avisarComDesfazer(
        funcaoEditId
          ? `Função "${funcaoNomeCampo.trim()}" atualizada.`
          : `Função "${funcaoNomeCampo.trim()}" adicionada.`,
      );
      limparFuncao();
    } catch (erro) {
      toast.error(mensagemErro(erro, "Não foi possível salvar a função."));
    }
  };

  // formulário de usuário do sistema (login)
  const [usuarioId, setUsuarioId] = useState<string | undefined>();
  const [uNome, setUNome] = useState("");
  const [uEmail, setUEmail] = useState("");
  const [uSenha, setUSenha] = useState("");
  const [uPapel, setUPapel] = useState<Papel>(cargosAtribuiveis[0] ?? "usuario");
  const [uColaboradorId, setUColaboradorId] = useState(SEM_VINCULO);
  const [uVerTodos, setUVerTodos] = useState(false);
  const [salvandoUsuario, setSalvandoUsuario] = useState(false);

  const limparFormUsuario = () => {
    setUsuarioId(undefined);
    setUNome("");
    setUEmail("");
    setUSenha("");
    setUPapel(cargosAtribuiveis[0] ?? "usuario");
    setUColaboradorId(SEM_VINCULO);
    setUVerTodos(false);
  };

  const editarUsuario = (u: Usuario) => {
    setUsuarioId(u.id);
    setUNome(u.nome);
    setUEmail(u.email);
    setUSenha("");
    setUPapel(u.papel);
    setUColaboradorId(u.colaboradorId ?? SEM_VINCULO);
    setUVerTodos(!!u.verTodosNaAgenda);
  };

  const submeterUsuario = async () => {
    if (!usuarioLogado) return;
    if (!uNome.trim()) {
      toast.error("Digite o nome do usuário.");
      return;
    }
    if (!usuarioId && !uEmail.trim()) {
      toast.error("Digite o e-mail de acesso.");
      return;
    }
    if (!usuarioId && !uSenha.trim()) {
      toast.error("Defina uma senha para o novo usuário.");
      return;
    }
    setSalvandoUsuario(true);
    try {
      await salvarUsuario({
        id: usuarioId,
        nome: uNome.trim(),
        email: uEmail.trim() || undefined,
        senha: uSenha.trim() || undefined,
        papel: uPapel,
        colaboradorId: uColaboradorId || undefined,
        verTodosNaAgenda: uVerTodos,
      });
      avisarComDesfazer(usuarioId ? "Usuário atualizado." : "Usuário criado.");
      limparFormUsuario();
    } catch (erro) {
      toast.error(mensagemErro(erro, "Não foi possível salvar o usuário."));
    } finally {
      setSalvandoUsuario(false);
    }
  };

  const removerUsuarioDaLista = async (u: Usuario) => {
    try {
      await removerUsuario(u.id);
      avisarComDesfazer(`Usuário "${u.nome}" removido.`);
    } catch (erro) {
      toast.error(mensagemErro(erro, "Não foi possível remover esse usuário."));
    }
  };

  return (
    <Tabs defaultValue="funcionarios" className="space-y-4">
      <TabsList>
        <TabsTrigger value="funcionarios">Funcionários</TabsTrigger>
        <TabsTrigger value="funcoes">Funções</TabsTrigger>
        {podeGerenciarUsuarios && <TabsTrigger value="usuarios">Usuários do sistema</TabsTrigger>}
      </TabsList>

      <TabsContent value="funcionarios" className="space-y-4">
        <div className="grid gap-3 rounded-lg border border-border bg-card p-4 sm:grid-cols-2">
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
                    void criarFuncaoRapida();
                  }
                }}
              />
              <Button type="button" variant="secondary" onClick={() => void criarFuncaoRapida()}>
                <Plus className="mr-1 size-4" />
                Criar função
              </Button>
            </div>
          </div>
          <div className="flex gap-2 sm:col-span-2">
            <Button onClick={() => void submeterColab()}>
              <Plus className="mr-2 size-4" />
              {colabId ? "Salvar alterações" : "Adicionar funcionário"}
            </Button>
            {colabId && (
              <Button variant="ghost" onClick={limparColab}>
                Cancelar
              </Button>
            )}
          </div>
        </div>

        <ul className="divide-y divide-border rounded-lg border border-border bg-card">
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
                  void removerColaborador(c.id).then(() =>
                    avisarComDesfazer(`Funcionário "${c.nome}" removido.`),
                  );
                }}
              >
                <Trash2 className="size-4 text-destructive" />
                <span className="sr-only">Remover {c.nome}</span>
              </Button>
            </li>
          ))}
          {colaboradores.length === 0 && (
            <li className="p-3 text-sm text-muted-foreground">Nenhum funcionário cadastrado.</li>
          )}
        </ul>
      </TabsContent>

      <TabsContent value="funcoes" className="space-y-4">
        <p className="text-xs text-muted-foreground">
          As funções aparecem no cadastro de funcionários e no filtro do cronograma. Remover uma
          função deixa os funcionários que a usavam como "sem função".
        </p>
        <div className="grid gap-3 rounded-lg border border-border bg-card p-4 sm:grid-cols-[1fr_auto]">
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
            <Button onClick={() => void submeterFuncao()}>
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

        <ul className="divide-y divide-border rounded-lg border border-border bg-card">
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
                    void removerFuncao(f.id).then(() =>
                      avisarComDesfazer(`Função "${f.nome}" removida.`),
                    );
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

      {podeGerenciarUsuarios && (
        <TabsContent value="usuarios" className="space-y-4">
          <p className="text-xs text-muted-foreground">
            {usuarioLogado?.papel === "admin"
              ? "Administradores podem criar contas de qualquer cargo. Gerentes só podem criar contas do cargo Usuário."
              : "Você pode criar e gerenciar apenas contas do cargo Usuário."}{" "}
            O cargo Usuário, por padrão, só acompanha a própria linha do tempo no Cronograma — sem
            poder criar, editar ou excluir nada.
          </p>
          <div className="grid gap-3 rounded-lg border border-border bg-card p-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="us-nome">Nome</Label>
              <Input id="us-nome" value={uNome} onChange={(e) => setUNome(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="us-email">E-mail de acesso</Label>
              <Input
                id="us-email"
                type="email"
                value={uEmail}
                onChange={(e) => setUEmail(e.target.value)}
                disabled={!!usuarioId}
                placeholder="pessoa@exemplo.com"
              />
              {usuarioId && (
                <p className="text-xs text-muted-foreground">O e-mail não pode ser trocado aqui.</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="us-senha">{usuarioId ? "Nova senha (opcional)" : "Senha"}</Label>
              <Input
                id="us-senha"
                type="password"
                value={uSenha}
                onChange={(e) => setUSenha(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Cargo</Label>
              <Select value={uPapel} onValueChange={(v) => setUPapel(v as Papel)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {cargosAtribuiveis.map((p) => (
                    <SelectItem key={p} value={p}>
                      {papelLabel[p]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {uPapel === "usuario" && (
              <>
                <div className="space-y-1.5">
                  <Label>Vincular a um funcionário</Label>
                  <Select value={uColaboradorId} onValueChange={setUColaboradorId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Nenhum" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={SEM_VINCULO}>Nenhum</SelectItem>
                      {colaboradores.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Define de quem é a linha do tempo que essa conta acompanha.
                  </p>
                </div>
                <div className="flex items-center justify-between gap-2 rounded-md border border-border p-3 sm:col-span-1">
                  <div>
                    <Label htmlFor="us-ver-todos">Ver a agenda de todos</Label>
                    <p className="text-xs text-muted-foreground">
                      Se desligado, essa conta só vê a própria linha do tempo.
                    </p>
                  </div>
                  <Switch id="us-ver-todos" checked={uVerTodos} onCheckedChange={setUVerTodos} />
                </div>
              </>
            )}
            <div className="flex gap-2 sm:col-span-2">
              <Button onClick={() => void submeterUsuario()} disabled={salvandoUsuario}>
                <Plus className="mr-2 size-4" />
                {salvandoUsuario
                  ? "Salvando…"
                  : usuarioId
                    ? "Salvar alterações"
                    : "Adicionar usuário"}
              </Button>
              {usuarioId && (
                <Button variant="ghost" onClick={limparFormUsuario}>
                  Cancelar
                </Button>
              )}
            </div>
          </div>

          <ul className="divide-y divide-border rounded-lg border border-border bg-card">
            {usuarios.map((u) => {
              const podeGerenciarEsse =
                !!usuarioLogado && podeGerenciarPapel(usuarioLogado.papel, u.papel);
              const vinculado = colaboradores.find((c) => c.id === u.colaboradorId);
              return (
                <li key={u.id} className="flex items-center gap-2 p-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">
                      {u.nome}
                      {u.id === usuarioLogado?.id && (
                        <span className="ml-2 text-xs font-normal text-muted-foreground">
                          (você)
                        </span>
                      )}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {u.email} · {papelLabel[u.papel]}
                      {u.papel === "usuario" &&
                        (vinculado ? ` · Vinculado a ${vinculado.nome}` : " · Sem vínculo")}
                      {u.papel === "usuario" && u.verTodosNaAgenda && " · Vê a agenda de todos"}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => editarUsuario(u)}
                    disabled={!podeGerenciarEsse}
                  >
                    <Pencil className="size-4" />
                    <span className="sr-only">Editar {u.nome}</span>
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => void removerUsuarioDaLista(u)}
                    disabled={
                      !podeGerenciarEsse ||
                      usuarios.length <= 1 ||
                      (u.papel === "admin" && admins <= 1)
                    }
                  >
                    <Trash2 className="size-4 text-destructive" />
                    <span className="sr-only">Remover {u.nome}</span>
                  </Button>
                </li>
              );
            })}
          </ul>
        </TabsContent>
      )}
    </Tabs>
  );
}
