import { useState } from "react";
import { Plus } from "lucide-react";

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
import { useGantt } from "@/lib/gantt-store";

const SEM_CLIENTE = "__sem_cliente__";

type Props = {
  value: string;
  onChange: (nome: string) => void;
  idPrefix: string;
  label?: string;
  /** Quando true, mostra a opção "Nenhum" (usado em campos opcionais, como o cliente de um prazo). */
  opcional?: boolean;
};

/**
 * Campo de cliente reutilizado em Serviços, Edição rápida e Prazos: escolhe um cliente já
 * cadastrado (ver aba Clientes) ou cadastra um novo sem sair do formulário atual.
 */
export function SeletorCliente({ value, onChange, idPrefix, label = "Cliente", opcional }: Props) {
  const { clientes, salvarCliente } = useGantt();
  const [novoCliente, setNovoCliente] = useState("");

  const criarClienteRapido = () => {
    const nome = novoCliente.trim();
    if (!nome) return;
    salvarCliente({ nome });
    onChange(nome);
    setNovoCliente("");
  };

  return (
    <div className="space-y-1.5 sm:col-span-2">
      <Label htmlFor={`${idPrefix}-cliente`}>{label}</Label>
      <Select
        value={value || (opcional ? SEM_CLIENTE : "")}
        onValueChange={(v) => onChange(v === SEM_CLIENTE ? "" : v)}
      >
        <SelectTrigger id={`${idPrefix}-cliente`}>
          <SelectValue placeholder="Escolha o cliente" />
        </SelectTrigger>
        <SelectContent>
          {opcional && <SelectItem value={SEM_CLIENTE}>Nenhum</SelectItem>}
          {clientes.map((c) => (
            <SelectItem key={c.id} value={c.nome}>
              {c.nome}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <div className="flex gap-2">
        <Input
          value={novoCliente}
          onChange={(e) => setNovoCliente(e.target.value)}
          placeholder="Não achou? Cadastre um novo cliente…"
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              criarClienteRapido();
            }
          }}
        />
        <Button type="button" variant="secondary" onClick={criarClienteRapido}>
          <Plus className="mr-1 size-4" />
          Criar
        </Button>
      </div>
    </div>
  );
}
