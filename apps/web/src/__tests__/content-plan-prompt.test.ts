import { describe, expect, it } from 'vitest';

import { buildContentPlanPrompt } from '../lib/content-plans/prompt';

const baseInput = {
  persona: {
    name: 'Social Media Manager',
    audience: 'Marketing Team',
    context: 'Gestisce i contenuti per un brand tech',
  },
  theme: 'Lancio prodotto Q1',
  tone: 'Ispirazionale',
  callToAction: 'Scarica la guida completa',
  postCount: 3,
};

describe('buildContentPlanPrompt', () => {
  it('produces a stable prompt for the content plan generation', () => {
    expect(buildContentPlanPrompt(baseInput)).toMatchInlineSnapshot(`
"Genera un piano editoriale per social media.

[Persona]
Nome: Social Media Manager
Audience: Marketing Team
Contesto: Gestisce i contenuti per un brand tech

[Obiettivo]
Tema principale: Lancio prodotto Q1
Tono desiderato: Ispirazionale
Call to action: Scarica la guida completa
Numero di post richiesti: 3

[Fornisci]
- Un titolo sintetico per ciascun post
- Una descrizione di massimo 280 caratteri
- Una call to action coerente
- Un suggerimento di formato (reel, carosello, stories)

Restituisci i risultati come array JSON con chiavi id, title, summary, callToAction, formatSuggestion."
`);
  });
});
