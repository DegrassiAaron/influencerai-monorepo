'use client';

import { useEffect, useMemo, useState } from 'react';
import { useCreateJob, useJob, type JobResponse } from '@influencerai/sdk';
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Sparkles, RefreshCw } from 'lucide-react';
import {
  extractLoraArtifacts,
  inferInfluencerId,
  type LoraArtifact,
} from '@/lib/image-generation';
import { GeneratedImageCard } from './GeneratedImageCard';

interface ImageGenerationWorkspaceProps {
  trainingJobId: string;
}

type ArtifactSelection = {
  identifier: string;
  artifact: LoraArtifact;
};

function normalizeStatus(job?: JobResponse | null): string {
  if (!job || !job.status) return '';
  return job.status.toLowerCase();
}

export function ImageGenerationWorkspace({ trainingJobId }: ImageGenerationWorkspaceProps) {
  const {
    data: trainingJob,
    isLoading,
    error,
    refetch,
  } = useJob(trainingJobId);

  const artifacts = useMemo(() => extractLoraArtifacts(trainingJob), [trainingJob]);

  const artifactSelections: ArtifactSelection[] = useMemo(
    () =>
      artifacts.map((artifact) => ({
        identifier: artifact.key ?? artifact.filename,
        artifact,
      })),
    [artifacts]
  );

  const artifactMap = useMemo(() => {
    const map = new Map<string, LoraArtifact>();
    for (const selection of artifactSelections) {
      map.set(selection.identifier, selection.artifact);
    }
    return map;
  }, [artifactSelections]);

  const [selectedArtifacts, setSelectedArtifacts] = useState<string[]>([]);
  const [influencerId, setInfluencerId] = useState('');
  const [influencerTouched, setInfluencerTouched] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [negativePrompt, setNegativePrompt] = useState('');
  const [checkpoint, setCheckpoint] = useState('sd_xl_base_1.0.safetensors');
  const [guidanceScale, setGuidanceScale] = useState('7.5');
  const [steps, setSteps] = useState('20');
  const [width, setWidth] = useState('832');
  const [height, setHeight] = useState('1216');
  const [seed, setSeed] = useState('');
  const [loraStrength, setLoraStrength] = useState('0.85');
  const [formError, setFormError] = useState<string | null>(null);
  const [generatedJobIds, setGeneratedJobIds] = useState<string[]>([]);

  useEffect(() => {
    const inferred = inferInfluencerId(trainingJob);
    if (inferred && !influencerTouched) {
      setInfluencerId(inferred);
    }
  }, [trainingJob, influencerTouched]);

  useEffect(() => {
    if (artifactSelections.length === 0) {
      setSelectedArtifacts([]);
      return;
    }

    setSelectedArtifacts((prev) => {
      if (prev.length > 0) {
        return prev.filter((identifier) => artifactMap.has(identifier));
      }
      return [artifactSelections[0].identifier];
    });
  }, [artifactSelections, artifactMap]);

  const createJobMutation = useCreateJob({
    onSuccess: (job) => {
      setGeneratedJobIds((prev) => [job.id, ...prev]);
    },
  });

  const handleToggleArtifact = (identifier: string, checked: boolean) => {
    setSelectedArtifacts((prev) => {
      if (checked) {
        if (prev.includes(identifier)) return prev;
        return [...prev, identifier];
      }
      return prev.filter((value) => value !== identifier);
    });
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);

    const trimmedPrompt = prompt.trim();
    const trimmedCheckpoint = checkpoint.trim();
    const trimmedInfluencer = influencerId.trim();
    const trimmedNegative = negativePrompt.trim();

    if (!trimmedPrompt) {
      setFormError('Il prompt è obbligatorio.');
      return;
    }

    if (!trimmedCheckpoint) {
      setFormError('Specifica un checkpoint valido.');
      return;
    }

    if (!trimmedInfluencer) {
      setFormError('Inserisci un influencer ID.');
      return;
    }

    const parsedSteps = Number.parseInt(steps, 10);
    const parsedCfg = Number.parseFloat(guidanceScale);
    const parsedWidth = Number.parseInt(width, 10);
    const parsedHeight = Number.parseInt(height, 10);
    const parsedSeed = seed.trim() ? Number.parseInt(seed, 10) : undefined;
    const parsedStrength = Number.parseFloat(loraStrength);

    const payload: Record<string, unknown> = {
      prompt: trimmedPrompt,
      checkpoint: trimmedCheckpoint,
      influencerId: trimmedInfluencer,
      steps: Number.isFinite(parsedSteps) ? parsedSteps : 20,
      cfg: Number.isFinite(parsedCfg) ? parsedCfg : 7.5,
      width: Number.isFinite(parsedWidth) ? parsedWidth : 832,
      height: Number.isFinite(parsedHeight) ? parsedHeight : 1216,
    };

    if (trimmedNegative) {
      payload.negativePrompt = trimmedNegative;
    }

    if (Number.isFinite(parsedSeed)) {
      payload.seed = parsedSeed;
    }

    if (Number.isFinite(parsedStrength) && selectedArtifacts.length > 0) {
      const loras = selectedArtifacts
        .map((identifier) => artifactMap.get(identifier))
        .filter((artifact): artifact is LoraArtifact => Boolean(artifact))
        .map((artifact) => ({
          path: artifact.key ?? artifact.filename,
          strengthModel: parsedStrength,
          strengthClip: parsedStrength,
        }));

      if (loras.length > 0) {
        payload.loras = loras;
      }
    }

    createJobMutation.mutate({
      type: 'image-generation',
      payload,
    });
  };

  const status = normalizeStatus(trainingJob);
  const trainingReady = status === 'succeeded';

  return (
    <div className="space-y-8">
      <header className="flex flex-col gap-4">
        <div className="space-y-1">
          <Badge variant="brand" className="gap-2 bg-brand-600 text-white">
            <Sparkles className="h-4 w-4" />
            Image generation
          </Badge>
          <h1 className="text-3xl font-semibold tracking-tight text-foreground">
            Playground generazione immagini
          </h1>
          <p className="max-w-2xl text-sm text-muted-foreground">
            Sperimenta prompt, parametri e modelli LoRA per ottenere anteprime ad alta
            fedeltà a partire dal job di training <span className="font-mono">{trainingJobId}</span>.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
          <span>
            Stato training:{' '}
            <Badge
              variant={
                status === 'succeeded'
                  ? 'default'
                  : status === 'failed'
                    ? 'destructive'
                    : 'secondary'
              }
            >
              {status ? status.charAt(0).toUpperCase() + status.slice(1) : '...'}
            </Badge>
          </span>
          <span>LoRA disponibili: {artifactSelections.length}</span>
          <Button variant="ghost" size="sm" onClick={() => refetch()}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Aggiorna job
          </Button>
        </div>
      </header>

      {error && (
        <Alert variant="destructive">
          <AlertTitle>Impossibile caricare il job</AlertTitle>
          <AlertDescription>{error.message}</AlertDescription>
        </Alert>
      )}

      {!trainingReady && !isLoading && !error && (
        <Alert>
          <AlertTitle>Il training non è ancora completo</AlertTitle>
          <AlertDescription>
            Attendi che il job raggiunga lo stato <strong>succeeded</strong> per
            utilizzare i pesi LoRA generati.
          </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,420px)_1fr]">
        <Card className="border-border/70 bg-card/70">
          <CardHeader>
            <CardTitle>Prompt builder</CardTitle>
            <CardDescription>
              Configura prompt, parametri di inferenza e seleziona i pesi LoRA da applicare.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <form className="space-y-6" onSubmit={handleSubmit}>
                <div className="space-y-2">
                  <Label htmlFor="influencerId">Influencer ID</Label>
                  <Input
                    id="influencerId"
                    placeholder="es. inf_123"
                    value={influencerId}
                    onChange={(event) => {
                      setInfluencerId(event.target.value);
                      setInfluencerTouched(true);
                    }}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="prompt">Prompt positivo</Label>
                  <Textarea
                    id="prompt"
                    value={prompt}
                    onChange={(event) => setPrompt(event.target.value)}
                    placeholder="Descrivi l'immagine ideale..."
                    rows={4}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="negativePrompt">Prompt negativo</Label>
                  <Textarea
                    id="negativePrompt"
                    value={negativePrompt}
                    onChange={(event) => setNegativePrompt(event.target.value)}
                    placeholder="Elementi da evitare (opzionale)"
                    rows={3}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="checkpoint">Checkpoint di base</Label>
                  <Input
                    id="checkpoint"
                    value={checkpoint}
                    onChange={(event) => setCheckpoint(event.target.value)}
                    placeholder="sd_xl_base_1.0.safetensors"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="steps">Steps</Label>
                    <Input
                      id="steps"
                      type="number"
                      min={10}
                      max={150}
                      value={steps}
                      onChange={(event) => setSteps(event.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="cfg">CFG</Label>
                    <Input
                      id="cfg"
                      type="number"
                      step="0.1"
                      min={1}
                      max={30}
                      value={guidanceScale}
                      onChange={(event) => setGuidanceScale(event.target.value)}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Width</Label>
                    <Select value={width} onValueChange={(value) => setWidth(value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Width" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="512">512</SelectItem>
                        <SelectItem value="640">640</SelectItem>
                        <SelectItem value="768">768</SelectItem>
                        <SelectItem value="832">832</SelectItem>
                        <SelectItem value="1024">1024</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Height</Label>
                    <Select value={height} onValueChange={(value) => setHeight(value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Height" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="768">768</SelectItem>
                        <SelectItem value="960">960</SelectItem>
                        <SelectItem value="1024">1024</SelectItem>
                        <SelectItem value="1216">1216</SelectItem>
                        <SelectItem value="1344">1344</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="seed">Seed (opzionale)</Label>
                    <Input
                      id="seed"
                      type="number"
                      value={seed}
                      onChange={(event) => setSeed(event.target.value)}
                      placeholder="Generato automaticamente se vuoto"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="loraStrength">LoRA strength</Label>
                    <Input
                      id="loraStrength"
                      type="number"
                      min={0}
                      max={2}
                      step="0.05"
                      value={loraStrength}
                      onChange={(event) => setLoraStrength(event.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  <Label>LoRA preselezionate</Label>
                  {artifactSelections.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      Nessun artifact trovato per questo job. Completa il training prima di generare immagini.
                    </p>
                  ) : (
                    <div className="space-y-2 rounded-lg border border-border/60 p-3">
                      {artifactSelections.map(({ identifier, artifact }) => (
                        <label
                          key={identifier}
                          className="flex items-center justify-between gap-3 rounded-md px-2 py-2 hover:bg-muted/50"
                        >
                          <div className="flex items-center gap-3">
                            <Checkbox
                              checked={selectedArtifacts.includes(identifier)}
                              onCheckedChange={(checked) =>
                                handleToggleArtifact(identifier, Boolean(checked))
                              }
                              disabled={!trainingReady}
                            />
                            <div className="space-y-1">
                              <span className="font-mono text-sm text-foreground">
                                {artifact.filename}
                              </span>
                              {artifact.key && (
                                <span className="text-xs text-muted-foreground">
                                  {artifact.key}
                                </span>
                              )}
                            </div>
                          </div>
                          {artifact.url && (
                            <a
                              href={artifact.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-brand-600 underline"
                            >
                              Download
                            </a>
                          )}
                        </label>
                      ))}
                    </div>
                  )}
                </div>

                {formError && (
                  <Alert variant="destructive">
                    <AlertTitle>Parametri non validi</AlertTitle>
                    <AlertDescription>{formError}</AlertDescription>
                  </Alert>
                )}

                {createJobMutation.isError && (
                  <Alert variant="destructive">
                    <AlertTitle>Errore durante la creazione del job</AlertTitle>
                    <AlertDescription>
                      {createJobMutation.error?.message ?? 'Impossibile avviare la generazione.'}
                    </AlertDescription>
                  </Alert>
                )}

                <Button
                  type="submit"
                  className="w-full gap-2"
                  disabled={createJobMutation.isPending || !trainingReady}
                >
                  {createJobMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Sparkles className="h-4 w-4" />
                  )}
                  Genera immagine
                </Button>
              </form>
            )}
          </CardContent>
        </Card>

        <Card className="border-border/70 bg-card/70">
          <CardHeader>
            <CardTitle>Galleria sessione</CardTitle>
            <CardDescription>
              Ogni job creato viene monitorato automaticamente. Una volta completato puoi scaricare o condividere il risultato.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {generatedJobIds.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-border/70 py-12 text-center text-sm text-muted-foreground">
                Nessuna immagine generata in questa sessione.
                <span className="text-xs">
                  Compila il form a sinistra per avviare un job di image-generation.
                </span>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                {generatedJobIds.map((jobId) => (
                  <GeneratedImageCard key={jobId} jobId={jobId} />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
