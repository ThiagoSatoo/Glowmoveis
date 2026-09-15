import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";

// Precisam bater com o que está configurado no VitePWA() de vite.config.ts (filename/scope
// padrão, já que não customizamos nenhum dos dois lá).
const URL_SERVICE_WORKER = "/sw.js";
const ESCOPO_SERVICE_WORKER = "/";

// A aba pode ficar aberta o dia inteiro — reforça a checagem por uma versão nova de tempos em
// tempos, em vez de depender só da checagem automática (esporádica) do navegador.
const INTERVALO_CHECAGEM_MS = 60 * 60 * 1000;

/**
 * Registra o service worker do PWA "na mão" (chamando `navigator.serviceWorker` direto, sem
 * passar pelo módulo virtual `virtual:pwa-register` do vite-plugin-pwa) e, quando detecta uma
 * versão nova (depois de um novo deploy no GitHub/Vercel), bloqueia o app inteiro atrás de um
 * aviso obrigatório: a pessoa só volta a usar o sistema depois de clicar em "Atualizar agora".
 * Não tem "fechar", nem "depois", nem atualização sozinha — enquanto ela não aceitar, o app não
 * abre.
 *
 * Por que não usar `virtual:pwa-register`: esse módulo só existe de verdade quando o plugin gera
 * o build de produção — em alguns ambientes de `vite dev` (confirmado em Windows) o import dele
 * falha na análise estática do Vite ("Failed to resolve import"). Falar direto com a API nativa
 * do navegador evita esse módulo por completo, então esse problema não pode mais acontecer nem
 * no dev nem em produção.
 */
export function AtualizacaoObrigatoria() {
  const [precisaAtualizar, setPrecisaAtualizar] = useState(false);
  const [atualizando, setAtualizando] = useState(false);
  const workerEmEsperaRef = useRef<ServiceWorker | null>(null);

  useEffect(() => {
    // Em "vite dev" não existe /sw.js nem /manifest.webmanifest de verdade (só o build de
    // produção gera esses arquivos) — tentar registrar aqui só gera um 404 e um erro no
    // console, sem nenhum efeito. Simples checagem de ambiente, sem import nenhum envolvido.
    if (!import.meta.env.PROD) return;
    if (!("serviceWorker" in navigator)) return;

    let cancelado = false;
    let registroAtual: ServiceWorkerRegistration | null = null;

    // Só conta como "atualização" se já existe um controller ativo (ou seja, não é a primeira
    // instalação do service worker nesta aba) — o próprio `sw.js` já sabe esperar (não chama
    // `skipWaiting()` sozinho) até receber a mensagem "SKIP_WAITING" abaixo.
    const avisarSeHouverEspera = (registro: ServiceWorkerRegistration) => {
      if (!registro.waiting || !navigator.serviceWorker.controller) return;
      workerEmEsperaRef.current = registro.waiting;
      setPrecisaAtualizar(true);
    };

    navigator.serviceWorker
      .register(URL_SERVICE_WORKER, { scope: ESCOPO_SERVICE_WORKER })
      .then((registro) => {
        if (cancelado) return;
        registroAtual = registro;
        avisarSeHouverEspera(registro);
        registro.addEventListener("updatefound", () => {
          const novo = registro.installing;
          novo?.addEventListener("statechange", () => {
            if (novo.state === "installed") avisarSeHouverEspera(registro);
          });
        });
      })
      .catch((erro: unknown) => {
        console.error("Falha ao registrar o service worker:", erro);
      });

    const intervalo = window.setInterval(() => {
      void registroAtual?.update();
    }, INTERVALO_CHECAGEM_MS);

    // O service worker novo só assume depois do clique em "Atualizar agora" (postMessage lá
    // embaixo); quando isso acontece, o navegador dispara "controllerchange" — é a hora certa
    // de recarregar com a versão nova.
    let jaRecarregou = false;
    const aoTrocarController = () => {
      if (jaRecarregou) return;
      jaRecarregou = true;
      window.location.reload();
    };
    navigator.serviceWorker.addEventListener("controllerchange", aoTrocarController);

    return () => {
      cancelado = true;
      window.clearInterval(intervalo);
      navigator.serviceWorker.removeEventListener("controllerchange", aoTrocarController);
    };
  }, []);

  if (!precisaAtualizar) return null;

  const atualizarAgora = () => {
    setAtualizando(true);
    workerEmEsperaRef.current?.postMessage({ type: "SKIP_WAITING" });
  };

  return (
    <div
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="atualizacao-obrigatoria-titulo"
      aria-describedby="atualizacao-obrigatoria-descricao"
      className="fixed inset-0 z-[100] flex items-center justify-center bg-background/95 p-4 backdrop-blur-sm"
    >
      <div className="plank w-full max-w-sm rounded-lg p-6 text-center">
        <h2 id="atualizacao-obrigatoria-titulo" className="text-lg font-semibold text-foreground">
          Nova versão disponível
        </h2>
        <p id="atualizacao-obrigatoria-descricao" className="mt-2 text-sm text-muted-foreground">
          O sistema foi atualizado. É preciso atualizar para continuar usando o Cronograma — a
          página vai recarregar sozinha, em segundos.
        </p>
        <Button className="mt-5 w-full" autoFocus onClick={atualizarAgora} disabled={atualizando}>
          {atualizando ? "Atualizando…" : "Atualizar agora"}
        </Button>
      </div>
    </div>
  );
}
