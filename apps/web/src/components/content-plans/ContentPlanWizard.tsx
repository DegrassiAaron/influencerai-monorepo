'use client';

import React, { useMemo, useState } from 'react';
import { useMutation } from '@tanstack/react-query';

import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Badge } from '../ui/badge';
import { Textarea } from '../ui/textarea';
import { cn } from '../../lib/utils';
import {
  createContentPlan,
  updateContentPlanApproval,
  type ApprovalStatus,
  type ContentPlanJob,
} from '../../lib/content-plans';

import { PromptSummaryCard } from './PromptSummaryCard';
import { PlanPreview } from './PlanPreview';

type WizardStep = 0 | 1 | 2;

type WizardState = {
  influencerId: string;
  personaSummary: string;
  theme: string;
  targetPlatforms: Platform[];
};

type Platform = 'instagram' | 'tiktok' | 'youtube';

const platformOptions: Array<{ value: Platform; label: string; description: string }> = [
  {
    value: 'instagram',
    label: 'Instagram',
    description: 'Stories e reel brevi per mantenere ingaggio costante.',
  },
  {
    value: 'tiktok',
    label: 'TikTok',
    description: 'Short form video con trend del momento.',
  },
  {
    value: 'youtube',
    label: 'YouTube Shorts',
    description: 'Clip verticali ottimizzate per discovery.',
  },
];

const steps: Array<{ title: string; description: string }> = [
  {
    title: 'Persona',
    description: "Identifica l'influencer virtuale e sintetizza i tratti chiave.",
  },
  {
    title: 'Parametri',
    description: 'Definisci tema editoriale e piattaforme prioritarie.',
  },
  {
    title: 'Revisione',
    description: 'Controlla il prompt e avvia la generazione del piano.',
  },
];

const initialState: WizardState = {
  influencerId: '',
  personaSummary: '',
  theme: '',
  targetPlatforms: ['instagram'],
};

export function ContentPlanWizard() {
  const [step, setStep] = useState<WizardStep>(0);
  const [state, setState] = useState<WizardState>(initialState);
  const [job, setJob] = useState<ContentPlanJob | null>(null);
  const [approvalStatus, setApprovalStatus] = useState<ApprovalStatus | null>(null);

  const createPlanMutation = useMutation({
    mutationFn: createContentPlan,
    onSuccess: (result) => {
      setJob(result);
      setApprovalStatus(null);
    },
  });

  const approvalMutation = useMutation({
    mutationFn: updateContentPlanApproval,
    onSuccess: (data) => {
      setApprovalStatus(data.approvalStatus);
      setJob((prev) => (prev ? { ...prev, plan: data.plan } : prev));
    },
  });

  const canGoNext = useMemo(() => {
    if (step === 0) {
      return state.influencerId.trim().length > 0 && state.personaSummary.trim().length > 0;
    }
    if (step === 1) {
      return state.theme.trim().length > 0 && state.targetPlatforms.length > 0;
    }
    return true;
  }, [state.influencerId, state.personaSummary, state.theme, state.targetPlatforms, step]);

  const handleNext = () => {
    if (step < 2 && canGoNext) {
      setStep((prev) => (prev + 1) as WizardStep);
    }
  };

  const handleBack = () => {
    if (step > 0) {
      setStep((prev) => (prev - 1) as WizardStep);
    }
  };

  const resetGeneratedPlan = () => {
    if (job) {
      setJob(null);
    }
    setApprovalStatus(null);
  };

  const setField = <K extends keyof WizardState>(key: K, value: WizardState[K]) => {
    setState((prev) => ({ ...prev, [key]: value }));
    resetGeneratedPlan();
  };

  const togglePlatform = (platform: Platform) => {
    setState((prev) => {
      const exists = prev.targetPlatforms.includes(platform);
      const targetPlatforms = exists
        ? prev.targetPlatforms.filter((p) => p !== platform)
        : [...prev.targetPlatforms, platform];
      return { ...prev, targetPlatforms };
    });
    resetGeneratedPlan();
  };

  const handleGenerate = () => {
    createPlanMutation.mutate({
      influencerId: state.influencerId.trim(),
      theme: state.theme.trim(),
      targetPlatforms: state.targetPlatforms,
    });
  };

  const handleApproval = (status: ApprovalStatus) => {
    if (!job) return;
    approvalMutation.mutate({
      id: job.id,
      approvalStatus: status,
      plan: {
        ...job.plan,
        posts: job.plan.posts,
      },
    });
  };

  const resetWizard = () => {
    setState(initialState);
    setStep(0);
    setJob(null);
    setApprovalStatus(null);
  };

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-8">
      <header className="space-y-4">
        <h1 className="text-3xl font-semibold text-foreground">Content plan wizard</h1>
        <p className="max-w-3xl text-sm text-muted-foreground">
          Guida marketing step-by-step per configurare i prompt, generare anteprime dei post e
          condividere decisioni di approvazione con il team operativo.
        </p>
        <ol className="flex flex-col gap-3 md:flex-row md:gap-4">
          {steps.map((item, index) => (
            <li
              key={item.title}
              className={cn(
                'flex-1 rounded-lg border p-3',
                index === step ? 'border-brand-500 bg-brand-50' : 'border-border'
              )}
            >
              <div className="flex items-center gap-2">
                <Badge variant={index === step ? 'brand' : 'outline'}>{index + 1}</Badge>
                <span className="text-sm font-medium text-foreground">{item.title}</span>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">{item.description}</p>
            </li>
          ))}
        </ol>
      </header>

      <section className="rounded-xl border border-border bg-card p-6 shadow-sm">
        {step === 0 ? (
          <div className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="influencerId">Influencer ID</Label>
              <Input
                id="influencerId"
                placeholder="es. inf_1234"
                value={state.influencerId}
                onChange={(event) => setField('influencerId', event.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Inserisci l&apos;identificativo dell&apos;influencer virtuale da utilizzare
                nell&apos;API.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="personaSummary">Persona summary</Label>
              <Textarea
                id="personaSummary"
                placeholder="Descrivi tono di voce, interessi e community dell'influencer virtuale"
                value={state.personaSummary}
                onChange={(event) => setField('personaSummary', event.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Questa descrizione aiuta il team a contestualizzare il piano generato e resta
                disponibile nella revisione finale.
              </p>
            </div>
          </div>
        ) : null}

        {step === 1 ? (
          <div className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="theme">Theme</Label>
              <Input
                id="theme"
                placeholder="es. Lancio programma Summer Glow"
                value={state.theme}
                onChange={(event) => setField('theme', event.target.value)}
              />
            </div>
            <div className="space-y-3">
              <span className="text-sm font-medium text-foreground">Target platforms</span>
              <div className="grid gap-3 md:grid-cols-3">
                {platformOptions.map((option) => {
                  const checked = state.targetPlatforms.includes(option.value);
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => togglePlatform(option.value)}
                      className={cn(
                        'rounded-lg border p-3 text-left transition',
                        checked
                          ? 'border-brand-500 bg-brand-50'
                          : 'border-border hover:border-brand-300'
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-semibold text-foreground">
                          {option.label}
                        </span>
                        {checked ? <Badge variant="brand">Selected</Badge> : null}
                      </div>
                      <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                        {option.description}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        ) : null}

        {step === 2 ? (
          <div className="space-y-6">
            <PromptSummaryCard
              personaSummary={state.personaSummary}
              theme={state.theme}
              targetPlatforms={state.targetPlatforms}
            />
            {createPlanMutation.isError ? (
              <p className="text-sm text-destructive">
                {(createPlanMutation.error as Error)?.message ??
                  'Errore durante la generazione del piano.'}
              </p>
            ) : null}
            <div className="flex flex-wrap gap-3">
              <Button onClick={handleGenerate} disabled={createPlanMutation.isPending}>
                {createPlanMutation.isPending
                  ? 'Generazione...'
                  : job
                    ? 'Regenerate content plan'
                    : 'Generate content plan'}
              </Button>
              <Button variant="ghost" onClick={resetWizard}>
                Reset form
              </Button>
            </div>
            {job ? (
              <PlanPreview
                job={job}
                approvalStatus={approvalStatus}
                onRegenerate={handleGenerate}
                onApprove={() => handleApproval('approved')}
                onReject={() => handleApproval('rejected')}
                isRegenerating={createPlanMutation.isPending}
                isUpdatingApproval={approvalMutation.isPending}
              />
            ) : null}
            {approvalMutation.isError ? (
              <p className="text-sm text-destructive">
                {(approvalMutation.error as Error)?.message ??
                  'Impossibile aggiornare lo stato di approvazione.'}
              </p>
            ) : null}
          </div>
        ) : null}
      </section>

      <footer className="flex items-center justify-between">
        <Button variant="outline" onClick={handleBack} disabled={step === 0}>
          Back
        </Button>
        {step < 2 ? (
          <Button onClick={handleNext} disabled={!canGoNext}>
            Next
          </Button>
        ) : (
          <div className="h-10" aria-hidden="true" />
        )}
      </footer>
    </div>
  );
}
