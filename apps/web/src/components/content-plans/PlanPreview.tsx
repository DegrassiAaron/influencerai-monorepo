import React from 'react';

import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import type { ContentPlanJob } from '../../lib/content-plans';

export type PlanPreviewProps = {
  job: ContentPlanJob;
  approvalStatus: 'approved' | 'rejected' | null;
  onRegenerate: () => void;
  onApprove: () => void;
  onReject: () => void;
  isRegenerating: boolean;
  isUpdatingApproval: boolean;
};

const platformLabels: Record<string, string> = {
  instagram: 'Instagram',
  tiktok: 'TikTok',
  youtube: 'YouTube Shorts',
};

export function PlanPreview({
  job,
  approvalStatus,
  onRegenerate,
  onApprove,
  onReject,
  isRegenerating,
  isUpdatingApproval,
}: PlanPreviewProps) {
  return (
    <section className="space-y-4" aria-live="polite">
      <header className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-foreground">Generated content plan</h2>
          <p className="text-sm text-muted-foreground">
            Piano creato il {new Date(job.plan.createdAt).toLocaleString()}. Usa le azioni per
            approvare o richiedere una nuova generazione.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={onRegenerate} disabled={isRegenerating}>
            {isRegenerating ? 'Rigenerazione...' : 'Regenerate plan'}
          </Button>
          <Button
            variant="default"
            className="bg-emerald-600 text-white hover:bg-emerald-500"
            onClick={onApprove}
            disabled={isUpdatingApproval}
          >
            {isUpdatingApproval && approvalStatus !== 'approved'
              ? 'Salvataggio...'
              : 'Approve plan'}
          </Button>
          <Button variant="destructive" onClick={onReject} disabled={isUpdatingApproval}>
            {isUpdatingApproval && approvalStatus !== 'rejected' ? 'Salvataggio...' : 'Reject plan'}
          </Button>
        </div>
      </header>
      {approvalStatus ? (
        <p className="text-sm font-medium text-muted-foreground">
          Stato corrente: <span className="capitalize text-foreground">{approvalStatus}</span>
        </p>
      ) : null}
      <div className="grid gap-4 md:grid-cols-2">
        {job.plan.posts.map((post, index) => (
          <Card key={`${job.id}-${index}`}>
            <CardHeader>
              <CardTitle className="text-base font-semibold">Post {index + 1}</CardTitle>
              <p className="text-xs text-muted-foreground">
                Piattaforme:{' '}
                {job.plan.targetPlatforms.map((p) => platformLabels[p] ?? p).join(', ')}
              </p>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <h3 className="text-sm font-medium text-muted-foreground">Caption</h3>
                <p className="mt-1 text-sm leading-relaxed text-foreground">{post.caption}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-muted-foreground">Hashtags</h3>
                <div className="mt-2 flex flex-wrap gap-2">
                  {post.hashtags.map((tag) => (
                    <Badge key={tag} variant="secondary">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}
