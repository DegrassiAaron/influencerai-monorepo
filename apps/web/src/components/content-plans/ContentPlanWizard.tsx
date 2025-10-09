"use client";

import { useMemo, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  ContentPlan,
  ContentPlanGenerateInput,
  createContentPlan,
  updateContentPlanStatus,
} from "@/lib/content-plans";

const personaSchema = z.object({
  name: z.string().min(1, "La persona è obbligatoria"),
  audience: z.string().min(1, "L'audience è obbligatoria"),
  context: z.string().min(1, "Descrivi il contesto"),
});

const promptSchema = z.object({
  theme: z.string().min(1, "Il tema è obbligatorio"),
  tone: z.string().min(1, "Il tono è obbligatorio"),
  callToAction: z.string().min(1, "Specifica una call to action"),
  postCount: z
    .number()
    .int("Inserisci un numero intero")
    .min(1, "Almeno un post")
    .max(10, "Massimo 10 post"),
});

type PersonaFormState = z.infer<typeof personaSchema>;

type PromptFormState = {
  theme: string;
  tone: string;
  callToAction: string;
  postCount: string;
};

type WizardStep = "persona" | "prompt" | "preview";

type FieldErrors<TKeys extends string> = Partial<Record<TKeys, string>>;

const initialPersonaState: PersonaFormState = {
  name: "",
  audience: "",
  context: "",
};

const initialPromptState: PromptFormState = {
  theme: "",
  tone: "",
  callToAction: "",
  postCount: "3",
};

const STEPS: { id: WizardStep; label: string }[] = [
  { id: "persona", label: "Persona" },
  { id: "prompt", label: "Parametri" },
  { id: "preview", label: "Anteprima" },
];

function mapZodErrors<TKeys extends string>(
  errors: Record<string, string[] | undefined>
): FieldErrors<TKeys> {
  return Object.entries(errors).reduce<FieldErrors<TKeys>>(
    (acc, [key, messages]) => {
      if (messages && messages.length > 0) {
        acc[key as TKeys] = messages[0];
      }
      return acc;
    },
    {}
  );
}

export function ContentPlanWizard() {
  const [step, setStep] = useState<WizardStep>("persona");
  const [personaForm, setPersonaForm] = useState<PersonaFormState>(
    initialPersonaState
  );
  const [promptForm, setPromptForm] = useState<PromptFormState>(
    initialPromptState
  );
  const [personaErrors, setPersonaErrors] = useState<
    FieldErrors<keyof PersonaFormState>
  >({});
  const [promptErrors, setPromptErrors] = useState<
    FieldErrors<keyof PromptFormState>
  >({});
  const [plan, setPlan] = useState<ContentPlan | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  const generateMutation = useMutation({
    mutationFn: createContentPlan,
    onSuccess: (nextPlan) => {
      setPlan(nextPlan);
      setStep("preview");
      setFeedback("Piano generato correttamente.");
    },
    onError: (error: unknown) => {
      const message =
        error instanceof Error
          ? error.message
          : "Impossibile generare il piano. Riprova.";
      setFeedback(message);
    },
  });

  const statusMutation = useMutation({
    mutationFn: updateContentPlanStatus,
    onSuccess: (updatedPlan) => {
      setPlan((current) => {
        if (!current) {
          return updatedPlan;
        }
        return { ...current, status: updatedPlan.status };
      });
      setFeedback("Stato del piano aggiornato.");
    },
    onError: (error: unknown) => {
      const message =
        error instanceof Error
          ? error.message
          : "Aggiornamento stato non riuscito.";
      setFeedback(message);
    },
  });

  const isLoadingPlan = generateMutation.isPending;
  const isUpdatingStatus = statusMutation.isPending;

  const parsedPromptInput = useMemo(() => {
    const parsedPostCount = Number.parseInt(promptForm.postCount, 10);
    return {
      theme: promptForm.theme,
      tone: promptForm.tone,
      callToAction: promptForm.callToAction,
      postCount: Number.isNaN(parsedPostCount) ? 0 : parsedPostCount,
    };
  }, [promptForm]);

  function handlePersonaSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const result = personaSchema.safeParse(personaForm);

    if (!result.success) {
      setPersonaErrors(mapZodErrors(result.error.flatten().fieldErrors));
      return;
    }

    setPersonaErrors({});
    setPersonaForm(result.data);
    setStep("prompt");
    setFeedback(null);
  }

  function handlePromptSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const result = promptSchema.safeParse(parsedPromptInput);

    if (!result.success) {
      setPromptErrors(mapZodErrors(result.error.flatten().fieldErrors));
      return;
    }

    setPromptErrors({});

    const payload: ContentPlanGenerateInput = {
      persona: personaForm,
      ...result.data,
    };

    setFeedback("Generazione del piano in corso...");
    generateMutation.mutate(payload);
  }

  function handleRegenerate() {
    const result = promptSchema.safeParse(parsedPromptInput);
    if (!result.success) {
      setPromptErrors(mapZodErrors(result.error.flatten().fieldErrors));
      setStep("prompt");
      return;
    }

    const payload: ContentPlanGenerateInput = {
      persona: personaForm,
      ...result.data,
    };

    setFeedback("Rigenerazione del piano in corso...");
    generateMutation.mutate(payload);
  }

  function handleStatusChange(status: "APPROVED" | "REJECTED") {
    if (!plan) {
      return;
    }

    setFeedback("Aggiornamento stato in corso...");
    statusMutation.mutate({ planId: plan.id, status });
  }

  return (
    <div className="space-y-6">
      <ol className="flex flex-wrap items-center gap-2 text-sm font-medium text-muted-foreground">
        {STEPS.map((wizardStep, index) => {
          const isActive = wizardStep.id === step;
          const isCompleted = STEPS.findIndex(({ id }) => id === step) > index;
          return (
            <li
              key={wizardStep.id}
              className="flex items-center gap-2"
              aria-current={isActive ? "step" : undefined}
            >
              <span
                className={`flex h-8 w-8 items-center justify-center rounded-full border text-xs ${
                  isActive
                    ? "border-brand-500 bg-brand-100 text-brand-700"
                    : isCompleted
                      ? "border-brand-200 bg-brand-50 text-brand-600"
                      : "border-border"
                }`}
              >
                {index + 1}
              </span>
              <span className={isActive ? "text-foreground" : undefined}>
                {wizardStep.label}
              </span>
              {index < STEPS.length - 1 ? <span className="text-xs">›</span> : null}
            </li>
          );
        })}
      </ol>

      {step === "persona" ? (
        <Card>
          <form onSubmit={handlePersonaSubmit} className="space-y-4">
            <CardHeader>
              <CardTitle>Definisci la persona</CardTitle>
              <CardDescription>
                Identifica la figura a cui è destinato il piano editoriale e il
                suo contesto.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="persona-name">Persona</Label>
                <Input
                  id="persona-name"
                  value={personaForm.name}
                  onChange={(event) =>
                    setPersonaForm((current) => ({
                      ...current,
                      name: event.target.value,
                    }))
                  }
                />
                {personaErrors.name ? (
                  <p className="text-sm text-destructive">{personaErrors.name}</p>
                ) : null}
              </div>
              <div className="space-y-2">
                <Label htmlFor="persona-audience">Audience</Label>
                <Input
                  id="persona-audience"
                  value={personaForm.audience}
                  onChange={(event) =>
                    setPersonaForm((current) => ({
                      ...current,
                      audience: event.target.value,
                    }))
                  }
                />
                {personaErrors.audience ? (
                  <p className="text-sm text-destructive">
                    {personaErrors.audience}
                  </p>
                ) : null}
              </div>
              <div className="space-y-2">
                <Label htmlFor="persona-context">Contesto della persona</Label>
                <textarea
                  id="persona-context"
                  className="min-h-[120px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  value={personaForm.context}
                  onChange={(event) =>
                    setPersonaForm((current) => ({
                      ...current,
                      context: event.target.value,
                    }))
                  }
                />
                {personaErrors.context ? (
                  <p className="text-sm text-destructive">
                    {personaErrors.context}
                  </p>
                ) : null}
              </div>
            </CardContent>
            <div className="flex justify-end gap-2 border-t border-border/60 px-6 py-4">
              <Button type="submit">Prossimo</Button>
            </div>
          </form>
        </Card>
      ) : null}

      {step === "prompt" ? (
        <Card>
          <form onSubmit={handlePromptSubmit} className="space-y-4">
            <CardHeader>
              <CardTitle>Parametri del piano</CardTitle>
              <CardDescription>
                Definisci il tema, il tono e il numero di post da generare.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="plan-theme">Tema del piano</Label>
                <Input
                  id="plan-theme"
                  value={promptForm.theme}
                  onChange={(event) =>
                    setPromptForm((current) => ({
                      ...current,
                      theme: event.target.value,
                    }))
                  }
                />
                {promptErrors.theme ? (
                  <p className="text-sm text-destructive">{promptErrors.theme}</p>
                ) : null}
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="plan-tone">Tono</Label>
                  <Input
                    id="plan-tone"
                    value={promptForm.tone}
                    onChange={(event) =>
                      setPromptForm((current) => ({
                        ...current,
                        tone: event.target.value,
                      }))
                    }
                  />
                  {promptErrors.tone ? (
                    <p className="text-sm text-destructive">{promptErrors.tone}</p>
                  ) : null}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="plan-post-count">Numero di post</Label>
                  <Input
                    id="plan-post-count"
                    inputMode="numeric"
                    value={promptForm.postCount}
                    onChange={(event) =>
                      setPromptForm((current) => ({
                        ...current,
                        postCount: event.target.value,
                      }))
                    }
                  />
                  {promptErrors.postCount ? (
                    <p className="text-sm text-destructive">
                      {promptErrors.postCount}
                    </p>
                  ) : null}
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="plan-cta">Call to action</Label>
                <Input
                  id="plan-cta"
                  value={promptForm.callToAction}
                  onChange={(event) =>
                    setPromptForm((current) => ({
                      ...current,
                      callToAction: event.target.value,
                    }))
                  }
                />
                {promptErrors.callToAction ? (
                  <p className="text-sm text-destructive">
                    {promptErrors.callToAction}
                  </p>
                ) : null}
              </div>
            </CardContent>
            <div className="flex justify-between gap-2 border-t border-border/60 px-6 py-4">
              <Button variant="outline" type="button" onClick={() => setStep("persona")}>
                Indietro
              </Button>
              <Button type="submit" disabled={isLoadingPlan}>
                {isLoadingPlan ? "Generazione..." : "Genera anteprima"}
              </Button>
            </div>
          </form>
        </Card>
      ) : null}

      {step === "preview" ? (
        <Card>
          <CardHeader>
            <CardTitle>Anteprima contenuti</CardTitle>
            <CardDescription>
              Rivedi i post generati prima di approvare o richiedere una nuova
              iterazione.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {isLoadingPlan ? (
              <p role="status" className="text-sm text-muted-foreground">
                Generazione del piano in corso...
              </p>
            ) : null}
            {!isLoadingPlan && plan ? (
              <div className="space-y-4">
                <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                  <span className="font-medium text-foreground">Stato:</span>
                  <span className="rounded-full bg-muted px-3 py-1 capitalize">
                    {plan.status.toLowerCase()}
                  </span>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  {plan.posts.map((post) => (
                    <article
                      key={post.id}
                      className="rounded-lg border border-border/60 bg-card p-4 shadow-sm"
                    >
                      <h3 className="text-lg font-semibold text-foreground">
                        {post.title}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {post.summary}
                      </p>
                      <div className="mt-4 text-xs uppercase text-muted-foreground">
                        Call to action
                      </div>
                      <p className="text-sm text-foreground">{post.callToAction}</p>
                      {post.formatSuggestion ? (
                        <p className="mt-2 text-xs text-muted-foreground">
                          Formato suggerito: {post.formatSuggestion}
                        </p>
                      ) : null}
                    </article>
                  ))}
                </div>
              </div>
            ) : null}
            {!isLoadingPlan && !plan ? (
              <p className="text-sm text-muted-foreground">
                Compila i passaggi precedenti per generare un piano editoriale.
              </p>
            ) : null}
          </CardContent>
          <div className="flex flex-col gap-2 border-t border-border/60 p-6 md:flex-row md:items-center md:justify-between">
            <div className="flex gap-2">
              <Button
                variant="outline"
                type="button"
                onClick={() => setStep("prompt")}
              >
                Modifica parametri
              </Button>
              <Button
                variant="secondary"
                type="button"
                onClick={handleRegenerate}
                disabled={isLoadingPlan}
              >
                {isLoadingPlan ? "Rigenerazione..." : "Rigenera piano"}
              </Button>
            </div>
            <div className="flex gap-2">
              <Button
                variant="destructive"
                type="button"
                onClick={() => handleStatusChange("REJECTED")}
                disabled={isUpdatingStatus}
              >
                {isUpdatingStatus ? "Aggiornamento..." : "Rifiuta piano"}
              </Button>
              <Button
                type="button"
                onClick={() => handleStatusChange("APPROVED")}
                disabled={isUpdatingStatus}
              >
                {isUpdatingStatus ? "Aggiornamento..." : "Approva piano"}
              </Button>
            </div>
          </div>
        </Card>
      ) : null}

      <p aria-live="polite" className="text-sm text-muted-foreground">
        {feedback}
      </p>
    </div>
  );
}
