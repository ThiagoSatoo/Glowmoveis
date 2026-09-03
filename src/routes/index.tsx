import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";

import { AppSidebar, type SecaoId } from "@/components/AppSidebar";
import { GanttMarcenaria } from "@/components/GanttMarcenaria";
import { SecaoAgenda } from "@/components/secoes/SecaoAgenda";
import { SecaoClientes } from "@/components/secoes/SecaoClientes";
import { SecaoConfiguracoes } from "@/components/secoes/SecaoConfiguracoes";
import { SecaoEquipe } from "@/components/secoes/SecaoEquipe";
import { SecaoRelatorios } from "@/components/secoes/SecaoRelatorios";
import { SecaoServicos } from "@/components/secoes/SecaoServicos";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { GanttProvider, useGantt } from "@/lib/gantt-store";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Cronograma da Marcenaria | Gantt da Equipe" },
      {
        name: "description",
        content:
          "Diagrama de Gantt para marcenaria: acompanhe obras por colaborador e por dia, com opção de inverter linhas e colunas.",
      },
      { property: "og:title", content: "Cronograma da Marcenaria | Gantt da Equipe" },
      {
        property: "og:description",
        content:
          "Planejamento visual da oficina: colaboradores nas linhas, linha do tempo nas colunas — e o inverso em um clique.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

const TITULOS: Record<SecaoId, { titulo: string; descricao: string }> = {
  cronograma: {
    titulo: "Planejamento de produção",
    descricao:
      "Quem está em qual obra, em qual etapa e por quantos dias. Inverta os eixos para ler o cronograma por data ou por colaborador.",
  },
  equipe: {
    titulo: "Equipe",
    descricao: "Cadastre os funcionários da marcenaria e as funções (cargos) da oficina.",
  },
  servicos: {
    titulo: "Serviços",
    descricao: "Cadastre os serviços do cronograma, direto ou a partir de um modelo rápido.",
  },
  clientes: {
    titulo: "Clientes",
    descricao: "Nome, contato e observações — use ao criar serviços e prazos.",
  },
  agenda: {
    titulo: "Ausências e prazos",
    descricao: "Férias, folgas e prazos importantes que aparecem no cronograma.",
  },
  relatorios: {
    titulo: "Relatórios",
    descricao: "Números gerais da oficina: clientes, carga de trabalho e conflitos de agenda.",
  },
  configuracoes: {
    titulo: "Configurações",
    descricao: "Seu perfil e os ajustes gerais do sistema.",
  },
};

function Index() {
  return (
    <GanttProvider>
      <IndexProtegido />
    </GanttProvider>
  );
}

function IndexProtegido() {
  const [secao, setSecao] = useState<SecaoId>("cronograma");
  const { titulo, descricao } = TITULOS[secao];
  const { usuarioLogadoId, usuarioLogado, sessaoCarregada, carregandoDados, configuracoesSistema } =
    useGantt();
  const navigate = useNavigate();

  useEffect(() => {
    if (sessaoCarregada && !usuarioLogadoId) void navigate({ to: "/login", replace: true });
  }, [sessaoCarregada, usuarioLogadoId, navigate]);

  // O cargo "Usuário" só acompanha o próprio cronograma — evita ficar preso numa seção
  // restrita caso o cargo mude (ou a conta troque) enquanto essa seção está aberta.
  useEffect(() => {
    if (usuarioLogado?.papel === "usuario" && secao !== "cronograma") setSecao("cronograma");
  }, [usuarioLogado, secao]);

  // Enquanto a sessão do Supabase ainda está sendo restaurada, ou os dados protegidos
  // (tarefas, colaboradores etc.) ainda não chegaram, evita renderizar uma tela vazia
  // ou piscar o redirecionamento para /login antes da hora.
  if (!sessaoCarregada || !usuarioLogadoId || carregandoDados) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">
        Carregando…
      </div>
    );
  }

  return (
    <SidebarProvider>
      <AppSidebar
        secaoAtiva={secao}
        onSelecionarSecao={setSecao}
        usuarioNome={usuarioLogado?.nome}
      />
      <SidebarInset>
        <main className="min-h-screen px-3 py-6 sm:px-4 sm:py-8 md:px-8">
          <div className="mx-auto max-w-6xl space-y-6 md:space-y-8">
            <div className="flex items-start gap-2 border-b border-border pb-6">
              <SidebarTrigger className="mt-1 shrink-0" />
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-[0.25em] text-primary">
                  {configuracoesSistema.nomeEmpresa}
                </p>
                <h1 className="mt-2 text-3xl leading-none sm:text-5xl md:text-6xl">{titulo}</h1>
                <p className="mt-3 max-w-xl text-sm text-muted-foreground">{descricao}</p>
              </div>
            </div>

            {secao === "cronograma" && <GanttMarcenaria />}
            {secao === "equipe" && <SecaoEquipe />}
            {secao === "servicos" && <SecaoServicos />}
            {secao === "clientes" && <SecaoClientes />}
            {secao === "agenda" && <SecaoAgenda />}
            {secao === "relatorios" && <SecaoRelatorios />}
            {secao === "configuracoes" && <SecaoConfiguracoes />}
          </div>
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
