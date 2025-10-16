import { createContext, useContext, useMemo, type ReactNode } from 'react';

import { InfluencerAIClient } from '../index';

const InfluencerAIClientContext = createContext<InfluencerAIClient | null>(null);

export interface InfluencerAIProviderProps {
  children: ReactNode;
  baseUrl?: string;
  client?: InfluencerAIClient;
}

export function InfluencerAIProvider({ children, baseUrl, client }: InfluencerAIProviderProps) {
  const value = useMemo(() => client ?? new InfluencerAIClient(baseUrl), [client, baseUrl]);

  return (
    <InfluencerAIClientContext.Provider value={value}>
      {children}
    </InfluencerAIClientContext.Provider>
  );
}

export function useInfluencerAIClient(): InfluencerAIClient {
  const ctx = useContext(InfluencerAIClientContext);
  if (!ctx) {
    throw new Error('useInfluencerAIClient must be used within an InfluencerAIProvider');
  }
  return ctx;
}
