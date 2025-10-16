import React from 'react';

import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';

export type PromptSummaryCardProps = {
  personaSummary: string;
  theme: string;
  targetPlatforms: string[];
};

const platformLabels: Record<string, string> = {
  instagram: 'Instagram',
  tiktok: 'TikTok',
  youtube: 'YouTube Shorts',
};

export function PromptSummaryCard({
  personaSummary,
  theme,
  targetPlatforms,
}: PromptSummaryCardProps) {
  return (
    <Card data-testid="prompt-summary">
      <CardHeader>
        <CardTitle className="text-xl font-semibold">Review prompt configuration</CardTitle>
        <p className="text-sm text-muted-foreground">
          Conferma i parametri che verranno inviati alla generazione del piano editoriale.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <section>
          <h3 className="text-sm font-medium text-muted-foreground">Persona</h3>
          <p className="mt-1 text-sm leading-relaxed text-foreground">{personaSummary}</p>
        </section>
        <section>
          <h3 className="text-sm font-medium text-muted-foreground">Theme</h3>
          <p className="mt-1 text-sm text-foreground">{theme}</p>
        </section>
        <section>
          <h3 className="text-sm font-medium text-muted-foreground">Target platforms</h3>
          <div className="mt-2 flex flex-wrap gap-2">
            {targetPlatforms.map((platform) => (
              <Badge key={platform} variant="outline">
                {platformLabels[platform] ?? platform}
              </Badge>
            ))}
          </div>
        </section>
      </CardContent>
    </Card>
  );
}
