import { ContentPlanGenerateInput } from "./types";

export function buildContentPlanPrompt({
  persona,
  theme,
  tone,
  callToAction,
  postCount,
}: ContentPlanGenerateInput): string {
  return [
    "Genera un piano editoriale per social media.",
    "",
    "[Persona]",
    `Nome: ${persona.name}`,
    `Audience: ${persona.audience}`,
    `Contesto: ${persona.context}`,
    "",
    "[Obiettivo]",
    `Tema principale: ${theme}`,
    `Tono desiderato: ${tone}`,
    `Call to action: ${callToAction}`,
    `Numero di post richiesti: ${postCount}`,
    "",
    "[Fornisci]",
    "- Un titolo sintetico per ciascun post",
    "- Una descrizione di massimo 280 caratteri",
    "- Una call to action coerente",
    "- Un suggerimento di formato (reel, carosello, stories)",
    "",
    "Restituisci i risultati come array JSON con chiavi id, title, summary, callToAction, formatSuggestion.",
  ].join("\n");
}
