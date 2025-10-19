/**
 * @file JobArtifacts.tsx
 * @description Artifact download section for succeeded jobs
 *
 * Displays downloadable artifacts (LoRA models, training logs) with file size,
 * presigned URL expiry tracking, and refresh functionality.
 */

'use client';

import * as React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { usePresignedUrl } from '@/hooks/usePresignedUrl';
import { Download, RefreshCw, AlertTriangle } from 'lucide-react';

/**
 * Artifact metadata from job result
 */
interface ArtifactMetadata {
  filename?: string;
  size?: number;
}

/**
 * Artifact from job result
 */
interface Artifact {
  id: string;
  type: string;
  url: string;
  expiresAt?: string;
  metadata?: ArtifactMetadata;
}

/**
 * Job result with artifacts
 */
interface JobResult {
  artifacts?: Artifact[];
}

/**
 * Job type matching API response
 */
interface Job {
  id: string;
  name: string;
  status: string;
  result: JobResult | null;
}

export interface JobArtifactsProps {
  /** Job with succeeded status and artifacts */
  job: Job;

  /** Optional callback when download is triggered */
  onDownload?: (artifactId: string) => void;

  /** Refetch job to get fresh presigned URLs */
  refetch?: () => void;
}

/**
 * Format bytes into human-readable file size
 */
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${Math.round((bytes / Math.pow(k, i)) * 100) / 100} ${sizes[i]}`;
}

/**
 * Single Artifact Item Component
 */
function ArtifactItem({
  artifact,
  onDownload,
  refetch,
}: {
  artifact: Artifact;
  onDownload?: (id: string) => void;
  refetch?: () => void;
}) {
  const { url, isExpired, minutesRemaining, needsRefresh } = usePresignedUrl(
    artifact.expiresAt || ''
  );

  const handleDownload = () => {
    if (!isExpired && url) {
      window.open(artifact.url, '_blank');
      onDownload?.(artifact.id);
    }
  };

  const handleRefresh = () => {
    refetch?.();
  };

  const filename = artifact.metadata?.filename || 'download';
  const fileSize = artifact.metadata?.size;

  return (
    <div className="rounded-lg border p-4">
      <div className="flex items-start justify-between">
        <div className="flex-1 space-y-1">
          <p className="font-medium">{filename}</p>
          {fileSize && (
            <p className="text-sm text-muted-foreground">{formatBytes(fileSize)}</p>
          )}
        </div>

        <div className="flex items-center space-x-2">
          {isExpired ? (
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              className="whitespace-nowrap"
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh URL
            </Button>
          ) : (
            <Button
              variant="default"
              size="sm"
              onClick={handleDownload}
              disabled={isExpired}
              className="whitespace-nowrap"
            >
              <Download className="mr-2 h-4 w-4" />
              Download
            </Button>
          )}
        </div>
      </div>

      {/* Expiry Warning */}
      {needsRefresh && !isExpired && (
        <Alert className="mt-3" variant="default">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            URL expires in {minutesRemaining} minutes. Download soon or refresh the link.
          </AlertDescription>
        </Alert>
      )}

      {/* Expired Message */}
      {isExpired && (
        <Alert className="mt-3" variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            URL expired. Click &quot;Refresh URL&quot; to generate a new download link.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}

/**
 * JobArtifacts Component
 *
 * Displays all artifacts from a succeeded job with download buttons,
 * presigned URL expiry tracking, and refresh functionality.
 */
export function JobArtifacts({ job, onDownload, refetch }: JobArtifactsProps) {
  const artifacts = job.result?.artifacts || [];

  if (artifacts.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Artifacts</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {artifacts.map((artifact) => (
          <ArtifactItem
            key={artifact.id}
            artifact={artifact}
            onDownload={onDownload}
            refetch={refetch}
          />
        ))}

        <p className="text-xs text-muted-foreground">
          Download links expire after 1 hour. Use &quot;Refresh URL&quot; to generate new links.
        </p>
      </CardContent>
    </Card>
  );
}
