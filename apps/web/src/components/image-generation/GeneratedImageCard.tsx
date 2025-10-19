'use client';

import { useState } from 'react';
import { useJob } from '@influencerai/sdk';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardDescription,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { Loader2, Download, Copy, Check, RefreshCw, ExternalLink } from 'lucide-react';
import { parseImageGenerationResult } from '@/lib/image-generation';

function normalizeStatus(status?: string | null): string {
  return typeof status === 'string' ? status.toLowerCase() : '';
}

function getErrorMessage(result: unknown): string | null {
  if (!result || typeof result !== 'object') {
    return null;
  }

  const data = result as Record<string, unknown>;
  if (typeof data.message === 'string') {
    return data.message;
  }
  if (typeof data.error === 'string') {
    return data.error;
  }
  return null;
}

interface GeneratedImageCardProps {
  jobId: string;
}

export function GeneratedImageCard({ jobId }: GeneratedImageCardProps) {
  const {
    data: job,
    isLoading,
    error,
    refetch,
  } = useJob(jobId, {
    polling: true,
  });

  const [copied, setCopied] = useState(false);

  const status = normalizeStatus(job?.status);
  const result = parseImageGenerationResult(job?.result);
  const errorMessage = getErrorMessage(job?.result);

  const handleCopy = async () => {
    if (!result?.s3Url) return;
    try {
      await navigator.clipboard.writeText(result.s3Url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  };

  const isTerminal =
    status === 'succeeded' || status === 'failed' || status === 'completed';
  const isRunning = status === 'pending' || status === 'running';

  if (error) {
    return (
      <Card className="border-destructive/30">
        <CardHeader>
          <CardTitle className="flex items-center justify-between text-base">
            <span className="truncate font-medium">Job {jobId}</span>
            <Badge variant="destructive">Errore</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert variant="destructive">
            <AlertTitle>Impossibile caricare il job</AlertTitle>
            <AlertDescription>{error.message}</AlertDescription>
          </Alert>
          <Button variant="outline" onClick={() => refetch()}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Riprova
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="space-y-1">
        <CardTitle className="flex items-center justify-between text-base">
          <span className="truncate font-medium">Job {jobId}</span>
          <Badge
            variant={
              status === 'succeeded' || status === 'completed'
                ? 'default'
                : status === 'failed'
                  ? 'destructive'
                  : 'secondary'
            }
          >
            {status ? status.charAt(0).toUpperCase() + status.slice(1) : '...'}
          </Badge>
        </CardTitle>
        {result?.message && (
          <CardDescription className="text-xs text-muted-foreground">
            {result.message}
          </CardDescription>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading && (
          <div className="space-y-3">
            <Skeleton className="h-64 w-full rounded-xl" />
            <Skeleton className="h-5 w-1/3" />
            <Skeleton className="h-5 w-1/4" />
          </div>
        )}

        {isRunning && !isLoading && (
          <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-border/60 p-8 text-center">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            <div>
              <p className="font-medium text-foreground">Generazione in corso…</p>
              <p className="text-xs text-muted-foreground">
                Il job è attivo, aggiornamento automatico ogni 2 secondi.
              </p>
            </div>
          </div>
        )}

        {isTerminal && status !== 'failed' && result?.s3Url && (
          <div className="space-y-4">
            <div className="overflow-hidden rounded-xl border border-border/60">
              <img
                src={result.s3Url}
                alt={result.prompt || 'Immagine generata'}
                className="h-auto w-full bg-muted object-cover"
                loading="lazy"
              />
            </div>

            <div className="grid grid-cols-1 gap-3 text-sm text-muted-foreground sm:grid-cols-2">
              {result.seed !== undefined && (
                <div className="flex flex-col rounded-md border border-border/60 bg-background/60 p-3">
                  <span className="text-xs uppercase text-muted-foreground/80">Seed</span>
                  <span className="font-medium text-foreground">{result.seed}</span>
                </div>
              )}
              {result.cfgScale !== undefined && (
                <div className="flex flex-col rounded-md border border-border/60 bg-background/60 p-3">
                  <span className="text-xs uppercase text-muted-foreground/80">
                    CFG
                  </span>
                  <span className="font-medium text-foreground">
                    {result.cfgScale.toFixed(2)}
                  </span>
                </div>
              )}
              {result.steps !== undefined && (
                <div className="flex flex-col rounded-md border border-border/60 bg-background/60 p-3">
                  <span className="text-xs uppercase text-muted-foreground/80">
                    Steps
                  </span>
                  <span className="font-medium text-foreground">{result.steps}</span>
                </div>
              )}
              {result.loraUsed && result.loraUsed.length > 0 && (
                <div className="flex flex-col rounded-md border border-border/60 bg-background/60 p-3">
                  <span className="text-xs uppercase text-muted-foreground/80">
                    LoRA utilizzate
                  </span>
                  <span className="font-medium text-foreground">
                    {result.loraUsed.join(', ')}
                  </span>
                </div>
              )}
            </div>

            <div className="flex flex-wrap gap-2">
              <Button asChild>
                <a href={result.s3Url} target="_blank" rel="noopener noreferrer">
                  <Download className="mr-2 h-4 w-4" />
                  Scarica
                </a>
              </Button>
              <Button variant="outline" onClick={handleCopy}>
                {copied ? (
                  <Check className="mr-2 h-4 w-4" />
                ) : (
                  <Copy className="mr-2 h-4 w-4" />
                )}
                {copied ? 'Copiato' : 'Copia link'}
              </Button>
              <Button variant="ghost" asChild>
                <a href={result.s3Url} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="mr-2 h-4 w-4" />
                  Apri in nuova scheda
                </a>
              </Button>
            </div>
          </div>
        )}

        {status === 'failed' && (
          <Alert variant="destructive">
            <AlertTitle>Generazione fallita</AlertTitle>
            <AlertDescription>
              {errorMessage ?? 'Il worker ha restituito un errore durante la generazione.'}
            </AlertDescription>
          </Alert>
        )}

        <div className="flex justify-end">
          <Button variant="ghost" size="sm" onClick={() => refetch()}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Aggiorna
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
