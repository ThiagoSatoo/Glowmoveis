import { useState } from "react";
import { toast } from "sonner";
import { Pencil, Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Cliente } from "@/lib/gantt-data";
import { useGantt } from "@/lib/gantt-store";
import { useDesfazerToast } from "@/lib/undo-toast";

function mensagemErro(erro: unknown, padrao: string) {
  return erro instanceof Error ? erro.message : padrao;
}

export function SecaoClientes() {
  const { clientes, tarefas, salvarCliente, removerCliente } = useGantt();
  const { avisarComDesfazer } = useDesfazerToast();

  const [clienteId, setClienteId] = useState<string | undefined>();
  const [nome, setNome] = useState("");
  const [telefone, setTelefone] = useState("");
  const [endereco, setEndereco] = useState("");
  const [observacoes, setObservacoes] = useState("");

  const limpar = () => {
    setClienteId(undefined);
    setNome("");
    setTelefone("");
    setEndereco("");
    setObservacoes("");
  };

  const editar = (c: Cliente) => {
    setClienteId(c.id);
    setNome(c.nome);
    setTelefone(c.telefone ?? "");
    setEndereco(c.endereco ?? "");
    setObservacoes(c.observacoes ?? "");
  };

  const submeter = async () => {
    if (!nome.trim()) {
      toast.error("Digite o nome do cliente.");
      return;
    }
    try {
      await salvarCliente({
        id: clienteId,
        nome: nome.trim(),
        ...(telefone.trim() ? { telefone: telefone.trim() } : {}),
        ...(endereco.trim() ? { endereco: endereco.trim() } : {}),
        ...(observacoes.trim() ? { observacoes: observacoes.trim() } : {}),
      });
      avisarComDesfazer(
        clienteId ? `Cliente "${nome.trim()}" atualizado.` : `Cliente "${nome.trim()}" adicionado.`,
      );
      limpar();
    } catch (erro) {
      toast.error(mensagemErro(erro, "Não foi possível salvar o cliente."));
    }
  };

  return (
    <div className="space-y-4">
      <p className="text-xs text-muted-foreground">
        Cadastre aqui os clientes para escolhê-los (em vez de digitar de novo) ao criar um serviço
        ou um prazo. Editar o nome aqui não altera o nome já usado em serviços antigos.
      </p>
      <div className="grid gap-3 rounded-lg border border-border bg-card p-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="cli-nome">Nome</Label>
          <Input
            id="cli-nome"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            placeholder="Ex.: Fernanda Rocha"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="cli-telefone">Telefone / WhatsApp</Label>
          <Input
            id="cli-telefone"
            value={telefone}
            onChange={(e) => setTelefone(e.target.value)}
            placeholder="Ex.: (11) 99999-0000"
          />
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="cli-endereco">Endereço</Label>
          <Input
            id="cli-endereco"
            value={endereco}
            onChange={(e) => setEndereco(e.target.value)}
            placeholder="Ex.: Rua das Palmeiras, 120"
          />
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="cli-obs">Observações</Label>
          <Input
            id="cli-obs"
            value={observacoes}
            onChange={(e) => setObservacoes(e.target.value)}
            placeholder="Ex.: prefere ser avisado por WhatsApp"
          />
        </div>
        <div className="flex gap-2 sm:col-span-2">
          <Button onClick={() => void submeter()}>
            <Plus className="mr-2 size-4" />
            {clienteId ? "Salvar alterações" : "Adicionar cliente"}
          </Button>
          {clienteId && (
            <Button variant="ghost" onClick={limpar}>
              Cancelar
            </Button>
          )}
        </div>
      </div>

      <ul className="divide-y divide-border rounded-lg border border-border bg-card">
        {clientes.map((c) => {
          const qtdServicos = tarefas.filter((t) => t.cliente === c.nome).length;
          return (
            <li key={c.id} className="flex items-center gap-2 p-3">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{c.nome}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {[c.telefone, c.endereco].filter(Boolean).join(" · ") || "Sem contato cadastrado"}
                  {" · "}
                  {qtdServicos} {qtdServicos === 1 ? "serviço" : "serviços"}
                </p>
              </div>
              <Button variant="ghost" size="icon" onClick={() => editar(c)}>
                <Pencil className="size-4" />
                <span className="sr-only">Editar {c.nome}</span>
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() =>
                  void removerCliente(c.id)
                    .then(() => avisarComDesfazer(`Cliente "${c.nome}" removido.`))
                    .catch((erro: unknown) =>
                      toast.error(mensagemErro(erro, "Não foi possível remover o cliente.")),
                    )
                }
              >
                <Trash2 className="size-4 text-destructive" />
                <span className="sr-only">Remover {c.nome}</span>
              </Button>
            </li>
          );
        })}
        {clientes.length === 0 && (
          <li className="p-3 text-sm text-muted-foreground">Nenhum cliente cadastrado.</li>
        )}
      </ul>
    </div>
  );
}
