import {
  BarChart3,
  CalendarDays,
  Contact,
  Flag,
  Hammer,
  LogOut,
  Moon,
  Settings,
  Sun,
  Users,
  Wrench,
} from "lucide-react";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
} from "@/components/ui/sidebar";
import { useGantt } from "@/lib/gantt-store";

export type SecaoId =
  "cronograma" | "equipe" | "servicos" | "clientes" | "agenda" | "relatorios" | "configuracoes";

const ITENS: { id: SecaoId; label: string; icone: typeof Hammer }[] = [
  { id: "cronograma", label: "Cronograma", icone: CalendarDays },
  { id: "equipe", label: "Equipe", icone: Users },
  { id: "servicos", label: "Serviços", icone: Wrench },
  { id: "clientes", label: "Clientes", icone: Contact },
  { id: "agenda", label: "Ausências e prazos", icone: Flag },
  { id: "relatorios", label: "Relatórios", icone: BarChart3 },
  { id: "configuracoes", label: "Configurações", icone: Settings },
];

type Props = {
  secaoAtiva: SecaoId;
  onSelecionarSecao: (id: SecaoId) => void;
  usuarioNome?: string | undefined;
};

export function AppSidebar({ secaoAtiva, onSelecionarSecao, usuarioNome }: Props) {
  const { tema, definirTema, logout, configuracoesSistema, usuarioLogado } = useGantt();
  const escuro = tema === "escuro";
  // O cargo "Usuário" só acompanha o próprio cronograma — sem acesso às demais páginas.
  const itensVisiveis =
    usuarioLogado?.papel === "usuario" ? ITENS.filter((i) => i.id === "cronograma") : ITENS;

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <div className="flex items-center gap-2 px-2 py-1.5">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <Hammer className="size-4" />
          </span>
          <div className="min-w-0 group-data-[collapsible=icon]:hidden">
            <p className="truncate text-sm font-semibold">{configuracoesSistema.nomeEmpresa}</p>
            <p className="truncate text-xs text-sidebar-foreground/60">Marcenaria</p>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navegação</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {itensVisiveis.map((item) => (
                <SidebarMenuItem key={item.id}>
                  <SidebarMenuButton
                    isActive={secaoAtiva === item.id}
                    onClick={() => onSelecionarSecao(item.id)}
                    tooltip={item.label}
                  >
                    <item.icone />
                    <span>{item.label}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarSeparator />
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              onClick={() => definirTema(escuro ? "claro" : "escuro")}
              tooltip={escuro ? "Usar tema claro" : "Usar tema escuro"}
            >
              {escuro ? <Sun /> : <Moon />}
              <span>{escuro ? "Tema claro" : "Tema escuro"}</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
          {usuarioNome && (
            <SidebarMenuItem>
              <SidebarMenuButton
                onClick={logout}
                tooltip={`Sair (${usuarioNome})`}
                className="text-muted-foreground"
              >
                <LogOut />
                <span className="truncate">Sair · {usuarioNome}</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          )}
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
