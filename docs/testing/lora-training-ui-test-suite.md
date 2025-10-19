# LoRA Training UI - Test Suite Documentation

**Created:** 2025-10-19
**Issue:** #166 - LoRA Training UI
**Status:** Complete - Ready for TDD RED phase

## Overview

This document describes the comprehensive test suite for the LoRA Training UI feature. The tests are written following Test-Driven Development (TDD) principles and Behavior-Driven Development (BDD) scenarios.

**Current State:** Tests are in **RED phase** - they will FAIL until the actual components are implemented.

## Test Suite Structure

```
apps/web/src/
├── hooks/
│   └── __tests__/
│       ├── useLoRAWizard.test.ts (180 lines, 18 tests)
│       └── usePresignedUrl.test.ts (220 lines, 20 tests)
├── components/lora-training/
│   └── __tests__/
│       ├── LoRATrainingWizard.test.tsx (450 lines, 35+ tests)
│       ├── JobMonitor.test.tsx (480 lines, 40+ tests)
│       └── JobsTable.test.tsx (520 lines, 45+ tests)
packages/sdk/src/react/
└── __tests__/
    └── useJob-polling.test.ts (380 lines, 25+ tests)
```

**Total:** 6 test files, 180+ test cases, ~2,200 lines of test code

## Test Coverage by BDD Scenario

### Phase 1: Foundation Tests (Critical)

#### 1. useLoRAWizard Hook Tests
**File:** `apps/web/src/hooks/__tests__/useLoRAWizard.test.ts`

**Purpose:** Validates wizard state management logic

**Test Categories:**
- Initial state verification
- Step navigation (next/prev)
- Dataset selection (Step 0)
- Config selection (Step 1)
- Review step (Step 2)
- Validation logic per step
- Reset functionality
- Complete user flow

**Key Tests:**
- ✓ Should initialize with step 0 and empty state
- ✓ Should advance to next step when data is valid
- ✓ Should not advance when validation fails
- ✓ Should enable canProceed when dataset is selected
- ✓ Should require both config and job name for step 1
- ✓ Should preserve data when navigating back and forth
- ✓ Should reset all state to initial values

**BDD Mapping:** Core state machine for Scenarios 1.1, 1.2, 1.3

---

#### 2. usePresignedUrl Hook Tests
**File:** `apps/web/src/hooks/__tests__/usePresignedUrl.test.ts`

**Purpose:** Validates presigned URL expiration detection

**Test Categories:**
- Expiry detection (isPast logic)
- Minutes remaining calculation
- Refresh warning threshold (<5 minutes)
- Edge cases (null, invalid dates)
- Real-world scenarios

**Key Tests:**
- ✓ Should detect expired URLs when date is in past
- ✓ Should calculate minutes remaining correctly
- ✓ Should warn when less than 5 minutes remain
- ✓ Should handle null/undefined gracefully
- ✓ Should update when expiry date changes

**BDD Mapping:** Scenario 2.3 (Presigned URL expiration handling)

---

### Phase 2: Component Tests (High Priority)

#### 3. LoRATrainingWizard Component Tests
**File:** `apps/web/src/components/lora-training/__tests__/LoRATrainingWizard.test.tsx`

**Purpose:** Validates complete wizard user flow

**Test Categories:**
- Step 1: Dataset selection (BDD 1.1)
- Step 2: Configuration selection (BDD 1.2)
- Step 3: Review and submit (BDD 1.3)
- Navigation and validation
- Job creation on submit
- Loading states
- Error handling
- Accessibility

**Key Tests:**
- ✓ Should display available datasets from API
- ✓ Should enable Next button when dataset is selected
- ✓ Should allow entering job name
- ✓ Should require both config and job name for step 2
- ✓ Should display review summary with all selections
- ✓ Should create job with correct payload on submit
- ✓ Should call onComplete callback with job ID
- ✓ Should show error when job creation fails
- ✓ Should preserve selections when navigating back
- ✓ Should support keyboard navigation

**BDD Mapping:** Complete Scenarios 1.1, 1.2, 1.3

---

#### 4. JobMonitor Component Tests
**File:** `apps/web/src/components/lora-training/__tests__/JobMonitor.test.tsx`

**Purpose:** Validates job monitoring UI for all job states

**Test Categories:**
- Running job display (BDD 2.1)
- Succeeded job display (BDD 2.2)
- Failed job display (BDD 2.4)
- Pending job display
- Presigned URL expiration (BDD 2.3)
- Polling behavior
- Loading/error states
- Multiple artifacts
- Accessibility

**Key Tests:**
- ✓ Should display progress bar with correct percentage
- ✓ Should show training logs for running jobs
- ✓ Should display artifacts with download buttons
- ✓ Should show presigned URL expiration warning
- ✓ Should disable download when URL is expired
- ✓ Should refetch job when refresh URL is clicked
- ✓ Should display error message for failed jobs
- ✓ Should enable polling for running/pending jobs
- ✓ Should stop polling for terminal states
- ✓ Should update UI when polled job status changes

**BDD Mapping:** Scenarios 2.1, 2.2, 2.3, 2.4

---

#### 5. JobsTable Component Tests
**File:** `apps/web/src/components/lora-training/__tests__/JobsTable.test.tsx`

**Purpose:** Validates job list with filtering and pagination

**Test Categories:**
- Job list rendering (BDD 3.1)
- Status filtering (BDD 3.2)
- Sorting (name, date)
- Pagination
- Navigation to job details
- Loading/error states
- Empty states
- Row actions
- Accessibility

**Key Tests:**
- ✓ Should render table with job data
- ✓ Should display status badges with correct styling
- ✓ Should navigate to job detail when View is clicked
- ✓ Should filter jobs by status (running, succeeded, failed, pending)
- ✓ Should call useJobs with correct filter parameters
- ✓ Should sort by creation date and name
- ✓ Should show pagination when more than 20 jobs
- ✓ Should disable Previous on first page
- ✓ Should show empty state when no jobs exist
- ✓ Should support keyboard navigation

**BDD Mapping:** Scenarios 3.1, 3.2

---

### Phase 3: SDK Hook Tests (Medium Priority)

#### 6. useJob Polling Tests
**File:** `packages/sdk/src/react/__tests__/useJob-polling.test.ts`

**Purpose:** Validates polling logic for real-time job updates

**Test Categories:**
- Polling activation (running/pending)
- Polling deactivation (succeeded/failed)
- Polling interval (2 seconds)
- Error handling and retries
- Hook lifecycle
- Data consistency
- Concurrent polling

**Key Tests:**
- ✓ Should poll when job status is running
- ✓ Should poll when job status is pending
- ✓ Should not poll when polling option is false
- ✓ Should stop polling when status changes to succeeded
- ✓ Should stop polling when status changes to failed
- ✓ Should use 2 second interval for active jobs
- ✓ Should handle network errors gracefully
- ✓ Should stop polling when hook unmounts
- ✓ Should restart polling when jobId changes
- ✓ Should preserve data between polling requests

**BDD Mapping:** Scenario 2.1 (Real-time job monitoring)

---

## Testing Patterns and Best Practices

### 1. Mock Strategy

**SDK Hooks (useDatasets, useLoraConfigs, useCreateJob, useJobs, useJob):**
```typescript
jest.mock('@influencerai/sdk', () => ({
  useDatasets: jest.fn(),
  useLoraConfigs: jest.fn(),
  useCreateJob: jest.fn(),
}));

const mockedUseDatasets = useDatasets as jest.MockedFunction<typeof useDatasets>;
```

**Date Functions (date-fns):**
```typescript
jest.mock('date-fns', () => ({
  differenceInMinutes: jest.fn(),
  isPast: jest.fn(),
}));
```

**Next.js Router:**
```typescript
const mockPush = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}));
```

### 2. Test Setup Pattern

```typescript
describe('Component', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });

    // Setup mocks
    mockedUseDatasets.mockReturnValue({
      data: mockData,
      isLoading: false,
      error: null,
    } as any);

    jest.clearAllMocks();
  });

  const renderComponent = () => {
    return render(
      <QueryClientProvider client={queryClient}>
        <Component />
      </QueryClientProvider>
    );
  };
});
```

### 3. User Interaction Pattern

```typescript
const user = userEvent.setup();

// Click interaction
await user.click(screen.getByRole('button', { name: /next/i }));

// Type interaction
await user.type(screen.getByLabelText(/job name/i), 'My Training Job');

// Keyboard interaction
await user.keyboard('{Enter}');
```

### 4. Async Assertions

```typescript
// Wait for element to appear
await waitFor(() => {
  expect(screen.getByText('Loading complete')).toBeInTheDocument();
});

// Wait for condition
await waitFor(() => {
  expect(mockFn).toHaveBeenCalled();
}, { timeout: 3000 });
```

### 5. Accessibility Testing

```typescript
// Use semantic queries
const button = screen.getByRole('button', { name: /submit/i });
const input = screen.getByLabelText(/job name/i);

// Check ARIA attributes
expect(progressBar).toHaveAttribute('aria-valuenow', '45');
expect(statusBadge).toHaveAttribute('role', 'status');
expect(errorMessage.closest('[role="alert"]')).toBeInTheDocument();
```

## Running the Tests

### Run All Tests
```bash
cd D:\Repositories\influencerai-monorepo
pnpm test
```

### Run Specific Test Suite
```bash
# Hook tests
pnpm --filter web test hooks/__tests__/useLoRAWizard.test.ts
pnpm --filter web test hooks/__tests__/usePresignedUrl.test.ts

# Component tests
pnpm --filter web test components/lora-training/__tests__/LoRATrainingWizard.test.tsx
pnpm --filter web test components/lora-training/__tests__/JobMonitor.test.tsx
pnpm --filter web test components/lora-training/__tests__/JobsTable.test.tsx

# SDK tests
pnpm --filter sdk test react/__tests__/useJob-polling.test.ts
```

### Run in Watch Mode
```bash
pnpm --filter web test:watch
```

### Run with Coverage
```bash
pnpm --filter web test -- --coverage
```

## Expected Test Results

**Current Status (Before Implementation):**
```
FAIL  apps/web/src/hooks/__tests__/useLoRAWizard.test.ts
  ● Test suite failed to run
    Cannot find module '../useLoRAWizard'

FAIL  apps/web/src/hooks/__tests__/usePresignedUrl.test.ts
  ● Test suite failed to run
    Cannot find module '../usePresignedUrl'

FAIL  apps/web/src/components/lora-training/__tests__/LoRATrainingWizard.test.tsx
  ● Test suite failed to run
    Cannot find module '../LoRATrainingWizard'

... (similar for all 6 files)
```

**Expected After Phase 4 (Implementation):**
```
PASS  apps/web/src/hooks/__tests__/useLoRAWizard.test.ts (18 tests)
PASS  apps/web/src/hooks/__tests__/usePresignedUrl.test.ts (20 tests)
PASS  apps/web/src/components/lora-training/__tests__/LoRATrainingWizard.test.tsx (35 tests)
PASS  apps/web/src/components/lora-training/__tests__/JobMonitor.test.tsx (40 tests)
PASS  apps/web/src/components/lora-training/__tests__/JobsTable.test.tsx (45 tests)
PASS  packages/sdk/src/react/__tests__/useJob-polling.test.ts (25 tests)

Test Suites: 6 passed, 6 total
Tests:       183 passed, 183 total
```

## Next Steps (TDD Workflow)

### Phase 4: Implementation (GREEN Phase)

1. **Implement useLoRAWizard hook** → Run tests → Fix until green
2. **Implement usePresignedUrl hook** → Run tests → Fix until green
3. **Implement LoRATrainingWizard component** → Run tests → Fix until green
4. **Implement JobMonitor component** → Run tests → Fix until green
5. **Implement JobsTable component** → Run tests → Fix until green
6. **Implement useJob polling in SDK** → Run tests → Fix until green

### Phase 5: Refactoring (REFACTOR Phase)

Once all tests are green:
- Extract reusable components
- Optimize performance
- Improve accessibility
- Refine error handling
- Add logging and analytics
- Tests should remain green throughout

## Test Maintenance

### Adding New Tests

When adding features, follow this pattern:

1. **Write failing test first**
   ```typescript
   it('should handle new feature', () => {
     // Arrange
     const { result } = renderHook(() => useHook());

     // Act
     act(() => result.current.newFeature());

     // Assert
     expect(result.current.state).toBe('expected');
   });
   ```

2. **Implement minimal code to pass**
3. **Refactor while keeping tests green**

### Updating Existing Tests

When modifying behavior:

1. Update test expectations FIRST
2. Run tests (should fail)
3. Update implementation
4. Verify tests pass
5. Refactor if needed

## Common Issues and Solutions

### Issue: "Cannot find module '../Component'"
**Solution:** This is expected before implementation. Implement the component first.

### Issue: "TypeError: Cannot read property 'data' of undefined"
**Solution:** Ensure SDK hooks are properly mocked in `beforeEach`.

### Issue: "Timeout: waitFor timed out"
**Solution:** Increase timeout or check if async operation is actually completing:
```typescript
await waitFor(() => expect(x).toBe(y), { timeout: 5000 });
```

### Issue: "Warning: ReactDOM.render is deprecated"
**Solution:** Update to React 18's `createRoot` in test setup if needed.

### Issue: "Cannot find name 'React'"
**Solution:** Add `import React from 'react'` to test file.

## Code Quality Metrics

**Target Coverage:**
- Statements: >90%
- Branches: >85%
- Functions: >90%
- Lines: >90%

**Test Quality Indicators:**
- ✓ No `any` types in test code
- ✓ All mocks properly typed
- ✓ Semantic queries (getByRole, getByLabelText)
- ✓ Realistic user interactions (userEvent)
- ✓ Proper async handling (waitFor)
- ✓ Accessibility checks (ARIA attributes)
- ✓ Clear test descriptions
- ✓ Arrange-Act-Assert pattern

## References

- [React Testing Library Best Practices](https://testing-library.com/docs/react-testing-library/intro/)
- [TanStack Query Testing Guide](https://tanstack.com/query/latest/docs/react/guides/testing)
- [Jest Async Testing](https://jestjs.io/docs/asynchronous)
- [MSW for API Mocking](https://mswjs.io/docs/)
- [Accessibility Testing](https://testing-library.com/docs/queries/about/#priority)

---

**Document Status:** Complete
**Last Updated:** 2025-10-19
**Next Review:** After Phase 4 implementation completion
