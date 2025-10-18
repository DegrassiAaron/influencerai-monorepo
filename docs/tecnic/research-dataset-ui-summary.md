# Dataset Management UI - Quick Start Guide

**For Issue #177 Implementation**

This is a condensed quick-start guide extracted from the comprehensive research document: `research-dataset-ui-nextjs-tanstack-query.md`

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                Next.js 15 App Router                        │
│  - Server Components by default                            │
│  - File-based routing with special files                   │
│  - Automatic code splitting                                │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│              TanStack Query v5 (React Query)                │
│  - Centralized query state management                      │
│  - Automatic caching and refetching                        │
│  - Optimistic updates                                      │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                   SDK Hooks Layer                           │
│  - useDatasets(params) - List with pagination              │
│  - useDataset(id) - Single dataset detail                  │
│  - useDeleteDataset() - Delete mutation                    │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                  Backend API (NestJS)                       │
│  GET /datasets?take=20&skip=0&name=search                  │
│  GET /datasets/:id                                         │
│  DELETE /datasets/:id                                      │
└─────────────────────────────────────────────────────────────┘
```

---

## Step 1: Enhance SDK Hooks

**File:** `packages/sdk/src/react/hooks.ts`

Add dataset pagination support:

```typescript
export type ListDatasetsParams = {
  name?: string;
  take?: number;
  skip?: number;
  sortBy?: 'createdAt' | 'updatedAt' | 'name';
  sortOrder?: 'asc' | 'desc';
};

export type PaginatedDatasets = {
  data: Dataset[];
  total: number;
  take: number;
  skip: number;
};

export function useDatasets(
  params?: ListDatasetsParams,
  options?: UseDatasetsOptions
): UseQueryResult<PaginatedDatasets, InfluencerAIAPIError> {
  const client = useInfluencerAIClient();
  return useQuery<PaginatedDatasets, InfluencerAIAPIError>({
    queryKey: influencerAIQueryKeys.datasets.list(params),
    queryFn: () => client.listDatasets(params ?? {}),
    ...options,
  });
}

export function useDataset(
  id: string,
  options?: UseDatasetOptions
): UseQueryResult<Dataset, InfluencerAIAPIError> {
  const client = useInfluencerAIClient();
  return useQuery<Dataset, InfluencerAIAPIError>({
    queryKey: influencerAIQueryKeys.datasets.detail(id),
    queryFn: () => client.getDataset(id),
    enabled: options?.enabled ?? Boolean(id),
    ...options,
  });
}
```

**File:** `packages/sdk/src/react/query-keys.ts`

```typescript
datasets: {
  root: DATASETS_ROOT,
  list: (params?: ListDatasetsParams) =>
    [...DATASETS_ROOT, 'list', params ?? null] as const,
  detail: (id: string) => [...DATASETS_ROOT, 'detail', id] as const,
}
```

---

## Step 2: Configure QueryClient

**File:** `apps/web/src/app/providers.tsx`

Add default configuration to prevent excessive refetching:

```typescript
const [client] = useState(() => new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000, // 1 minute - CRITICAL for UX
      gcTime: 5 * 60 * 1000, // 5 minutes
      retry: 1,
      refetchOnWindowFocus: false, // Prevent annoying refetches
    },
  },
}));
```

---

## Step 3: Create List Page

**File:** `apps/web/src/app/(dashboard)/dashboard/datasets/page.tsx`

```typescript
import { Metadata } from 'next';
import { DatasetList } from './components/DatasetList';

export const metadata: Metadata = {
  title: 'Datasets | InfluencerAI',
  description: 'Manage your LoRA training datasets',
};

export default function DatasetsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Datasets</h1>
          <p className="text-muted-foreground">
            Manage image datasets for LoRA training
          </p>
        </div>
      </div>
      <DatasetList />
    </div>
  );
}
```

---

## Step 4: Create List Component with URL State

**File:** `apps/web/src/app/(dashboard)/dashboard/datasets/components/DatasetList.tsx`

```typescript
'use client';

import { useSearchParams, usePathname, useRouter } from 'next/navigation';
import { useDatasets } from '@influencerai/sdk/react';

export function DatasetList() {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();

  // Parse URL params
  const params = {
    name: searchParams.get('name') ?? undefined,
    take: Number(searchParams.get('take') ?? '20'),
    skip: Number(searchParams.get('skip') ?? '0'),
    sortBy: (searchParams.get('sortBy') as any) ?? 'createdAt',
    sortOrder: (searchParams.get('sortOrder') as any) ?? 'desc',
  };

  // Fetch data
  const { data, isLoading, error } = useDatasets(params);

  // Update URL params
  const updateParams = (updates: Partial<typeof params>) => {
    const urlParams = new URLSearchParams(searchParams.toString());
    const newParams = { ...params, ...updates };

    // Reset to page 1 on filter/sort change
    if ('name' in updates || 'sortBy' in updates) {
      newParams.skip = 0;
    }

    Object.entries(newParams).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        urlParams.set(key, String(value));
      } else {
        urlParams.delete(key);
      }
    });

    router.replace(`${pathname}?${urlParams.toString()}`, { scroll: false });
  };

  if (isLoading) return <Skeleton />;
  if (error) return <ErrorMessage error={error} />;

  return (
    <div className="space-y-6">
      <DatasetFilters currentParams={params} onFilterChange={updateParams} />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {data?.data.map((dataset) => (
          <DatasetCard key={dataset.id} dataset={dataset} />
        ))}
      </div>

      <Pagination
        total={data?.total ?? 0}
        take={params.take}
        skip={params.skip}
        onPageChange={(page) => updateParams({ skip: page * params.take })}
      />
    </div>
  );
}
```

---

## Step 5: Create Detail Page

**File:** `apps/web/src/app/(dashboard)/dashboard/datasets/[id]/page.tsx`

```typescript
import { Metadata } from 'next';
import { DatasetDetail } from './components/DatasetDetail';

export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  return {
    title: `Dataset ${params.id} | InfluencerAI`,
  };
}

export default function DatasetDetailPage({ params }: { params: { id: string } }) {
  return <DatasetDetail id={params.id} />;
}
```

**File:** `apps/web/src/app/(dashboard)/dashboard/datasets/[id]/components/DatasetDetail.tsx`

```typescript
'use client';

import { useDataset } from '@influencerai/sdk/react';
import { ImageGallery } from './ImageGallery';

export function DatasetDetail({ id }: { id: string }) {
  const { data: dataset, isLoading, error } = useDataset(id);

  if (isLoading) return <Skeleton />;
  if (error?.status === 404) return <NotFound />;
  if (error) return <ErrorMessage error={error} />;

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">{dataset.name}</h1>
      <ImageGallery images={dataset.images ?? []} />
    </div>
  );
}
```

---

## Step 6: Optimize Images

**File:** `apps/web/src/app/(dashboard)/dashboard/datasets/components/ImageGallery.tsx`

```typescript
'use client';

import Image from 'next/image';

export function ImageGallery({ images }: { images: Array<{ url: string; alt: string }> }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      {images.map((image, idx) => (
        <div key={idx} className="relative aspect-square overflow-hidden rounded-lg">
          <Image
            src={image.url}
            alt={image.alt}
            fill
            sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
            className="object-cover"
            priority={idx < 6} // Load first 6 images immediately
          />
        </div>
      ))}
    </div>
  );
}
```

**CRITICAL:** Always include `sizes` prop for responsive images!

---

## Loading States

**File:** `apps/web/src/app/(dashboard)/dashboard/datasets/loading.tsx`

```typescript
export default function Loading() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {Array.from({ length: 6 }).map((_, i) => (
        <Skeleton key={i} className="h-64 w-full" />
      ))}
    </div>
  );
}
```

---

## Error Boundaries

**File:** `apps/web/src/app/(dashboard)/dashboard/datasets/error.tsx`

```typescript
'use client'; // MUST be client component

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="text-center py-12">
      <h2 className="text-xl font-semibold">Something went wrong!</h2>
      <p className="text-muted-foreground">{error.message}</p>
      <Button onClick={reset}>Try again</Button>
    </div>
  );
}
```

---

## Common Pitfalls to Avoid

### 1. Missing 'use client' Directive

```typescript
// ❌ WRONG
import { useSearchParams } from 'next/navigation';
export function MyComponent() {
  const params = useSearchParams(); // ERROR!
}

// ✅ CORRECT
'use client';
import { useSearchParams } from 'next/navigation';
export function MyComponent() {
  const params = useSearchParams();
}
```

### 2. Missing Image Sizes Prop

```typescript
// ❌ WRONG - Serves oversized images, wastes 70% bandwidth
<Image src={url} alt={alt} fill />

// ✅ CORRECT
<Image
  src={url}
  alt={alt}
  fill
  sizes="(max-width: 768px) 100vw, 33vw"
/>
```

### 3. Not Setting staleTime

```typescript
// ❌ WRONG - Refetches on every navigation
const [client] = useState(() => new QueryClient());

// ✅ CORRECT
const [client] = useState(() => new QueryClient({
  defaultOptions: {
    queries: { staleTime: 60 * 1000 }
  }
}));
```

### 4. Mutation without Cache Invalidation

```typescript
// ❌ WRONG - UI doesn't update
const deleteMutation = useDeleteDataset();

// ✅ CORRECT
const deleteMutation = useDeleteDataset({
  onSuccess: () => {
    queryClient.invalidateQueries({
      queryKey: influencerAIQueryKeys.datasets.root
    });
  },
});
```

---

## Performance Checklist

- [ ] QueryClient configured with `staleTime: 60 * 1000`
- [ ] Images use `sizes` prop for responsive loading
- [ ] First 4-6 images use `priority={true}`
- [ ] URL params used for filter/pagination state (shareable!)
- [ ] Mutations invalidate appropriate query keys
- [ ] Loading.tsx files prevent layout shift
- [ ] Error.tsx files catch and display errors
- [ ] Filter inputs debounced (300ms)
- [ ] `router.replace()` uses `{ scroll: false }` to prevent scroll jump

---

## Key Files to Create

```
apps/web/src/app/(dashboard)/dashboard/datasets/
├── page.tsx                           # List page
├── loading.tsx                        # Loading skeleton
├── error.tsx                          # Error boundary
├── [id]/
│   ├── page.tsx                       # Detail page
│   ├── loading.tsx                    # Loading skeleton
│   ├── error.tsx                      # Error boundary
│   └── components/
│       ├── DatasetDetail.tsx          # Detail component
│       └── ImageGallery.tsx           # Image gallery
└── components/
    ├── DatasetList.tsx                # List component
    ├── DatasetCard.tsx                # Card component
    ├── DatasetFilters.tsx             # Filter component
    └── Pagination.tsx                 # Pagination component
```

---

## Testing the Implementation

1. **Test URL State:**
   - Apply filters → URL updates
   - Refresh page → Filters persist
   - Share URL → Same filtered view

2. **Test Pagination:**
   - Navigate pages → URL updates with skip param
   - Filter change → Resets to page 1

3. **Test Image Loading:**
   - Check Network tab → Multiple sizes served
   - Check first 6 images load immediately
   - Check remaining images lazy load

4. **Test Error Handling:**
   - Disconnect network → Error boundary shows
   - Click "Try again" → Refetches data
   - Navigate to invalid ID → 404 shown

---

## Next Steps

1. ✅ Enhance SDK hooks with pagination support
2. ✅ Configure QueryClient with staleTime
3. ✅ Create list page with URL state management
4. ✅ Create detail page with image gallery
5. ✅ Add loading and error states
6. ✅ Test performance and UX

For detailed implementation examples and advanced patterns, see the full research document: **`research-dataset-ui-nextjs-tanstack-query.md`**

---

**Quick Start Version:** 1.0
**Parent Document:** research-dataset-ui-nextjs-tanstack-query.md
**Last Updated:** 2025-10-18
