import { useEffect, useState } from "react";

// Sempre no horário de Brasília, independente do fuso horário do dispositivo
// de quem está usando o app.
const FUSO_BRASILIA = "America/Sao_Paulo";

const FORMATADOR_DATA = new Intl.DateTimeFormat("pt-BR", {
  timeZone: FUSO_BRASILIA,
  weekday: "long",
  day: "2-digit",
  month: "long",
  year: "numeric",
});

const FORMATADOR_HORA = new Intl.DateTimeFormat("pt-BR", {
  timeZone: FUSO_BRASILIA,
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hour12: false,
});

function obterParte(partes: Intl.DateTimeFormatPart[], tipo: Intl.DateTimeFormatPartTypes): string {
  return partes.find((p) => p.type === tipo)?.value ?? "";
}

// Ex.: "quinta-feira, 03 de setembro de 2026. 14:23:07"
function formatarDataHora(data: Date): string {
  const partes = FORMATADOR_DATA.formatToParts(data);
  const diaSemana = obterParte(partes, "weekday");
  const dia = obterParte(partes, "day");
  const mes = obterParte(partes, "month");
  const ano = obterParte(partes, "year");
  const hora = FORMATADOR_HORA.format(data);
  return `${diaSemana}, ${dia} de ${mes} de ${ano}. ${hora}`;
}

export function RelogioBoasVindas({ nome }: { nome?: string | undefined }) {
  // Começa "vazio" e só liga o relógio depois de montar no navegador: evita
  // divergência entre o horário renderizado no servidor e o do cliente.
  const [agora, setAgora] = useState<Date | null>(null);

  useEffect(() => {
    setAgora(new Date());
    const id = setInterval(() => setAgora(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="fixed right-3 top-3 z-40 rounded-lg border border-border bg-card/95 px-3 py-2 text-right shadow-sm backdrop-blur sm:right-4 sm:top-4">
      <p className="text-sm font-semibold leading-tight text-foreground">
        Bem-vindo{nome ? `, ${nome}` : ""}!
      </p>
      <p className="text-xs leading-tight tabular-nums text-muted-foreground">
        {agora ? formatarDataHora(agora) : " "}
      </p>
    </div>
  );
}
