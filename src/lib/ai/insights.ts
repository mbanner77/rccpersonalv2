import { pipeline } from "@xenova/transformers";

type PipelineHandler = (input: string, options?: Record<string, unknown>) => Promise<{ generated_text?: string }[] | { generated_text?: string }>;

let generatorPromise: Promise<PipelineHandler> | null = null;
let modelDisabled = false;

async function getGenerator(): Promise<PipelineHandler | null> {
  if (modelDisabled) return null;
  if (!generatorPromise) {
    generatorPromise = pipeline("text-generation", "Xenova/LaMini-Flan-T5-77M" as const, {
      device: "cpu",
    }) as Promise<PipelineHandler>;
  }
  try {
    return await generatorPromise;
  } catch (error) {
    console.warn("AI model load failed, switching to heuristic fallback", error);
    modelDisabled = true;
    return null;
  }
}

function heuristicAnswer(question: string, stats: {
  windowDays: number;
  hits7: number;
  hitsWindow: number;
  topYears: number[];
  birthdaysToday: number;
  totals: { birthdays: number; hires: number; jubilees: number };
}): string {
  const lines: string[] = [];
  const lower = question.toLowerCase();

  lines.push(`In den kommenden ${stats.windowDays} Tagen stehen ${stats.hitsWindow} Jubiläen an (davon ${stats.hits7} innerhalb der nächsten 7 Tage).`);
  if (stats.topYears.length) {
    lines.push(`Am häufigsten gefeiert: ${stats.topYears.join(", ")} Jahre.`);
  }
  if (stats.birthdaysToday > 0) {
    lines.push(`Heute haben ${stats.birthdaysToday} Personen Geburtstag.`);
  }
  lines.push(`Dieses Jahr summieren sich ${stats.totals.birthdays} Geburtstage, ${stats.totals.jubilees} Jubiläen und ${stats.totals.hires} Eintritte.`);

  if (lower.includes("eintritt")) {
    lines.push("Eintritte verteilen sich aktuell gleichmäßig – es gibt noch keine Unitspezifische Auswertung.");
  }
  if (lower.includes("unit")) {
    lines.push("Hinweis: Units werden bereits erfasst. Detailstatistiken pro Unit folgen, momentan werden globale Werte ausgegeben.");
  }
  if (lower.includes("monat")) {
    lines.push("Für den nächsten Monat empfehlen sich die Monatsgrafiken unter 'Auswertungen' – sie zeigen die detaillierten Zahlen pro Monat.");
  }

  lines.push("Wenn du genauere Filter brauchst, nutze die Drilldown-Ansichten." );
  return lines.join(" \n");
}

export async function generateInsightPrompt(question: string, stats: {
  windowDays: number;
  hits7: number;
  hitsWindow: number;
  topYears: number[];
  birthdaysToday: number;
  totals: { birthdays: number; hires: number; jubilees: number };
}): Promise<string> {
  const prompt = `Du bist ein hilfreicher Assistent für ein HR-Dashboard. Nutze die folgenden Zahlen und beantworte die Frage kurz und sachlich.

Kennzahlen:
- Jubiläen in 7 Tagen: ${stats.hits7}
- Jubiläen in ${stats.windowDays} Tagen: ${stats.hitsWindow}
- Häufigste Jubiläumsjahre: ${stats.topYears.join(", ") || "keine"}
- Geburtstage heute: ${stats.birthdaysToday}
- Geburtstage gesamt dieses Jahr: ${stats.totals.birthdays}
- Eintritte gesamt dieses Jahr: ${stats.totals.hires}
- Jubiläen gesamt dieses Jahr: ${stats.totals.jubilees}

Frage: ${question}

Antwort:`;

  const handler = await getGenerator();
  if (handler) {
    try {
      const output = await handler(prompt, {
        max_new_tokens: 120,
        temperature: 0.7,
        top_p: 0.9,
      });

      const text = Array.isArray(output) ? output[0]?.generated_text ?? "" : (output as { generated_text?: string })?.generated_text ?? "";
      const clean = text.split("Antwort:").pop()?.trim() || text.trim();
      if (clean) return clean;
    } catch (error) {
      console.warn("AI generation failed, using heuristic fallback", error);
      modelDisabled = true;
    }
  }

  return heuristicAnswer(question, stats);
}
