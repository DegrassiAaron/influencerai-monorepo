/**
 * @file ConfigCard.tsx
 * @description Reusable card component for displaying and selecting LoRA configurations
 *
 * Provides a selectable card with LoRA config information including training
 * parameters. Supports keyboard navigation and ARIA accessibility.
 */

'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { LoraConfig } from '@influencerai/sdk';

export interface ConfigCardProps {
  /** LoRA configuration data to display */
  config: LoraConfig;
  /** Whether this config is currently selected */
  selected: boolean;
  /** Callback when config is selected */
  onSelect: () => void;
}

/**
 * Selectable card component for displaying LoRA configuration
 *
 * Renders as a button with radio semantics for accessibility.
 * Shows config name, description, and key training parameters.
 *
 * @example
 * ```tsx
 * <ConfigCard
 *   config={config}
 *   selected={selectedId === config.id}
 *   onSelect={() => setSelectedId(config.id)}
 * />
 * ```
 */
export function ConfigCard({ config, selected, onSelect }: ConfigCardProps) {
  return (
    <button
      type="button"
      onClick={onSelect}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect();
        }
      }}
      className={cn(
        'w-full text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
        selected && 'ring-2 ring-primary'
      )}
      aria-pressed={selected}
      role="radio"
      aria-checked={selected}
    >
      <Card
        className={cn(
          'h-full transition-colors hover:border-primary/50',
          selected && 'border-primary bg-primary/5'
        )}
      >
        <CardHeader>
          <div className="flex items-start justify-between gap-2">
            <CardTitle className="text-base">{config.name}</CardTitle>
            {selected && (
              <Badge variant="default" className="shrink-0">
                Selected
              </Badge>
            )}
          </div>
          {config.description && (
            <CardDescription className="line-clamp-2">{config.description}</CardDescription>
          )}
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="space-y-1">
              <span className="text-muted-foreground">Epochs</span>
              <p className="font-medium">{config.epochs} epochs</p>
            </div>
            <div className="space-y-1">
              <span className="text-muted-foreground">Network Rank</span>
              <p className="font-medium">{config.networkDim}</p>
            </div>
            <div className="space-y-1">
              <span className="text-muted-foreground">Network Alpha</span>
              <p className="font-medium">{config.networkAlpha}</p>
            </div>
            <div className="space-y-1">
              <span className="text-muted-foreground">Learning Rate</span>
              <p className="font-medium">{config.learningRate}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </button>
  );
}
