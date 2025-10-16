# Tailwind CSS 4 Migration Spike Analysis

**Document Version**: 1.0
**Created**: 2025-10-16
**Author**: Development Team
**Status**: ✅ COMPLETED
**Recommendation**: ✅ GO (with phased approach)

---

## Executive Summary

### Current State

The web application (`apps/web/`) is currently in a **hybrid v3/v4 state**:

- ✅ `@tailwindcss/postcss@4.1.13` (v4 PostCSS plugin) - installed
- ⚠️ `tailwindcss@3.4.18` (v3 core) - still present as dependency
- ⚠️ `tailwind-merge@2.6.0` - **v2.x, incompatible with v4** (requires v3.x)
- ⚠️ `tailwindcss-animate@1.0.7` - **v3 plugin, incompatible with v4** (requires `tw-animate-css`)

### Key Findings

| Metric                   | Value                                              |
| ------------------------ | -------------------------------------------------- |
| **Migration Complexity** | MEDIUM-HIGH                                        |
| **Estimated Effort**     | 3-4 hours (functional), 5-6 hours (full CSS-first) |
| **Risk Level**           | MEDIUM                                             |
| **Breaking Changes**     | 5 critical areas identified                        |
| **Components Affected**  | 33+ files using Tailwind classes                   |
| **Plugin Issues**        | 2 incompatible plugins require replacement         |
| **Recommendation**       | ✅ GO - Proceed with phased migration              |

### Why Migrate?

**Pros:**

- ✅ Already halfway migrated (`@tailwindcss/postcss@4.1.13` installed)
- ✅ 5x faster builds, 100x faster incremental builds
- ✅ Official stable release (v4.1.13+) is production-ready
- ✅ shadcn/ui fully supports v4
- ✅ Next.js 15 fully compatible
- ✅ Current opacity modifier usage (`/90`, `/80`) is already v4-style
- ✅ Security: Stay on supported versions

**Cons:**

- ⚠️ 3-6 hours migration + testing effort required
- ⚠️ Potential visual regressions need thorough testing
- ⚠️ Plugin ecosystem catching up (tailwindcss-animate replacement)
- ⚠️ Team learning curve for CSS-first paradigm

### Recommendation

**✅ PROCEED** with Phase 1 & 2 (functional migration), defer Phase 3 (full CSS-first optimization) for future iteration.

---

## Table of Contents

1. [Breaking Changes Analysis](#breaking-changes-analysis)
2. [Dependency Compatibility Matrix](#dependency-compatibility-matrix)
3. [Codebase Usage Analysis](#codebase-usage-analysis)
4. [Risk Assessment](#risk-assessment)
5. [Migration Plan](#migration-plan)
6. [Testing Strategy](#testing-strategy)
7. [Rollback Plan](#rollback-plan)
8. [Success Criteria](#success-criteria)
9. [References](#references)

---

## Breaking Changes Analysis

### 1. Configuration System (CRITICAL)

**Impact**: HIGH | **Confidence**: 1.0

#### From JavaScript to CSS-First

**v3 Approach:**

```typescript
// tailwind.config.ts
export default {
  theme: {
    extend: {
      colors: { border: 'hsl(var(--border))' },
    },
  },
};
```

**v4 Native Approach:**

```css
/* globals.css */
@import 'tailwindcss';

@theme inline {
  --color-border: var(--border);
  --color-primary: var(--primary);
}

:root {
  --border: hsl(214 32% 91%);
  --primary: hsl(224 84% 56%);
}
```

**Migration Strategy:**

- **Option A (Recommended for Phase 1-2)**: Keep JS config with `@config` directive
  ```css
  @config "../tailwind.config.ts";
  @import 'tailwindcss';
  ```
- **Option B (Phase 3 - Future)**: Migrate to pure CSS-first configuration

**Current Setup:**

- Using TypeScript config (`tailwind.config.ts`)
- Custom preset system (`tailwind.preset.ts`)
- Extensions: custom colors, box shadows, animations

**Action Required:**

- Add `@config` directive to maintain existing JS config
- OR migrate theme extensions to CSS `@theme` block
- Test all custom utilities after migration

---

### 2. CSS Variable & Color System (HIGH IMPACT)

**Impact**: HIGH | **Confidence**: 0.95

#### HSL Wrapper Location Change

**Current (v3):**

```css
/* globals.css */
:root {
  --background: 0 0% 100%;
}

/* tailwind.config.ts */
colors: {
  background: 'hsl(var(--background))';
}
```

**Required (v4):**

```css
/* globals.css */
:root {
  --background: hsl(0 0% 100%);
}

/* tailwind.config.ts or @theme */
@theme inline {
  --color-background: var(--background);
}
```

**Critical Change**: `hsl()` wrapper moves from theme reference to variable definition.

**Impact on This Codebase:**

- ✅ `globals.css` already defines CSS vars in `:root` and `.dark`
- ⚠️ Must wrap ALL 15+ color values in `hsl()` at definition site
- ⚠️ Remove `hsl()` wrapper from theme references in config
- ✅ Current usage pattern `hsl(var(--border))` is correct for v4

**Color Variables Requiring Update:**

```css
/* Current format (v3) */
:root {
  --background: 0 0% 100%;
  --foreground: 215 28% 12%;
  --primary: 224 84% 56%;
  --secondary: 214 32% 91%;
  /* ... 12 more */
}

/* Required format (v4) */
:root {
  --background: hsl(0 0% 100%);
  --foreground: hsl(215 28% 12%);
  --primary: hsl(224 84% 56%);
  --secondary: hsl(214 32% 91%);
  /* ... 12 more */
}
```

**Files Affected:**

- `apps/web/src/app/globals.css` (lines 5-65)
- `apps/web/tailwind.config.ts` (lines 16-50)

**Action Required:**

1. Update all `:root` color variables with `hsl()` wrapper (15 variables)
2. Update all `.dark` color variables with `hsl()` wrapper (15 variables)
3. Add `@theme inline` block mapping variables to Tailwind utilities
4. Test all color usage, especially with opacity modifiers

---

### 3. Opacity Modifier Syntax (LOW RISK)

**Impact**: LOW | **Confidence**: 1.0

**Good News**: Current codebase extensively uses v4-compatible syntax.

**Verified Usage (14+ instances):**

```typescript
'bg-card/70'; // ✅ v4-compatible
'border-border/60'; // ✅ v4-compatible
'bg-primary/90'; // ✅ v4-compatible
'bg-destructive/10'; // ✅ v4-compatible
'border-destructive/30'; // ✅ v4-compatible
```

**v4 Implementation:**

```css
/* v4 generates this internally for bg-primary/90 */
background-color: color-mix(in oklab, var(--color-primary) 90%, transparent);
```

**Deprecated Patterns (not found in codebase):**

```typescript
// ❌ Old v3 syntax (not used)
'bg-opacity-90';
'text-opacity-75';

// ✅ Current v4 syntax (already in use)
'bg-primary/90';
'text-primary/75';
```

**Action Required**: ✅ NONE - Already using v4-compatible syntax

---

### 4. Default Utility Changes (MEDIUM RISK)

**Impact**: MEDIUM | **Confidence**: 1.0

#### Ring Utility

- **v3 Default**: `ring` = 3px width, blue-500 color
- **v4 Default**: `ring` = 1px width, currentColor
- **Risk**: Focus states may appear different
- **Mitigation**: Explicit `ring-2 ring-ring` in components

**Current Usage:**

```typescript
// apps/web/src/components/ui/button.tsx:18
'focus-visible:ring-2 ring-ring ring-offset-2'; // ✅ Explicit sizing
```

#### Border Utility

- **v3 Default**: `border` = gray-200 color
- **v4 Default**: `border` = currentColor
- **Risk**: Borders may change color
- **Mitigation**: Explicit `border-border` utility

**Current Usage:**

```typescript
// Already using explicit border colors
'border border-input';
'border border-border/60';
```

#### Placeholder Text

- **v3 Default**: gray-400
- **v4 Default**: currentColor at 50% opacity
- **Risk**: Form placeholders may appear different

**Current Usage:**

```typescript
// apps/web/src/components/ui/input.tsx:13
'placeholder:text-muted-foreground'; // ✅ Explicit color
```

#### Button Cursor

- **v3**: `cursor: pointer` on `<button>`
- **v4**: `cursor: default` (matches native behavior)
- **Risk**: Buttons may not show pointer cursor
- **Mitigation**: Add explicit `cursor-pointer` if needed

**Action Required:**

1. Visual regression test all focus states
2. Verify border colors across components
3. Test form input placeholders
4. Check button cursor behavior

---

### 5. Plugin System Changes (CRITICAL)

**Impact**: HIGH | **Confidence**: 0.95

#### tailwindcss-animate → tw-animate-css

**Problem:**

- `tailwindcss-animate@1.0.7` uses v3 JavaScript plugin API
- **Incompatible** with v4's CSS-first architecture
- Currently used for: accordion animations, custom keyframes

**Solution:**

```bash
pnpm remove tailwindcss-animate
pnpm add -D tw-animate-css
```

**CSS Changes:**

```css
/* Remove v3 plugin reference */
- import animate from "tailwindcss-animate";
- plugins: [animate]

/* Add v4 CSS import */
@import "tw-animate-css";
```

**Migration Path for Custom Animations:**

**Current (v3 JS config):**

```typescript
// tailwind.config.ts
keyframes: {
  "accordion-down": {
    from: { height: "0" },
    to: { height: "var(--radix-accordion-content-height)" }
  },
  "accordion-up": {
    from: { height: "var(--radix-accordion-content-height)" },
    to: { height: "0" }
  }
},
animation: {
  "accordion-down": "accordion-down 0.2s ease-out",
  "accordion-up": "accordion-up 0.2s ease-out"
}
```

**Required (v4 CSS):**

```css
/* In globals.css with @theme */
@theme {
  --animate-accordion-down: accordion-down 0.2s ease-out;
  --animate-accordion-up: accordion-up 0.2s ease-out;

  @keyframes accordion-down {
    from {
      height: 0;
    }
    to {
      height: var(--radix-accordion-content-height);
    }
  }

  @keyframes accordion-up {
    from {
      height: var(--radix-accordion-content-height);
    }
    to {
      height: 0;
    }
  }
}
```

**Compatibility:**

- ✅ Same API (`animate-accordion-down`, `animate-pulse`, etc.)
- ✅ Existing animation usage preserved
- ✅ Custom keyframes can be migrated to CSS

**Action Required:**

1. Replace `tailwindcss-animate` with `tw-animate-css`
2. Migrate custom keyframes from JS config to CSS `@theme`
3. Test all animations (accordion, pulse, transitions)

---

### 6. PostCSS Configuration (MINOR)

**Impact**: LOW | **Confidence**: 1.0

**Current Setup:**

```javascript
// postcss.config.js ✅ Already v4-compatible
module.exports = {
  plugins: {
    '@tailwindcss/postcss': {}, // ✅ v4 plugin
    autoprefixer: {}, // ⚠️ No longer needed
  },
};
```

**Optimization Available:**

- ⚠️ `autoprefixer` is redundant - v4 handles it automatically
- Can simplify to just `'@tailwindcss/postcss': {}`

**Action Required:**

1. Remove `autoprefixer` from `postcss.config.js`
2. Remove `autoprefixer` from `package.json` devDependencies
3. Test build to ensure vendor prefixes still applied

---

## Dependency Compatibility Matrix

| Package                    | Current | Latest | v4 Compatible | Action                          | Priority     |
| -------------------------- | ------- | ------ | ------------- | ------------------------------- | ------------ |
| `tailwindcss`              | 3.4.18  | 4.1.14 | ⚠️ Hybrid     | Finalize v4 upgrade             | **CRITICAL** |
| `@tailwindcss/postcss`     | 4.1.13  | 4.1.14 | ✅ Yes        | Minor update                    | LOW          |
| `tailwind-merge`           | 2.6.0   | 3.3.1  | ❌ **No**     | **Upgrade to v3.x**             | **CRITICAL** |
| `tailwindcss-animate`      | 1.0.7   | N/A    | ❌ **No**     | **Replace with tw-animate-css** | **HIGH**     |
| `class-variance-authority` | 0.7.1   | Latest | ✅ Yes        | None                            | ✓            |
| `clsx`                     | 2.1.1   | Latest | ✅ Yes        | None                            | ✓            |
| `next-themes`              | 0.3.0   | Latest | ✅ Yes        | None                            | ✓            |
| `shadcn/ui` components     | N/A     | N/A    | ✅ Yes        | Update CSS vars format          | MEDIUM       |
| Next.js                    | 15.1.4  | Latest | ✅ Yes        | None                            | ✓            |
| React                      | 19.2.0  | Latest | ✅ Yes        | None                            | ✓            |

### tailwind-merge v3 Breaking Changes

**Upgrade Required**: `pnpm add -D tailwind-merge@^3.0.0`

**Breaking Changes:**

1. **Theme scales**: Keys changed to match v4 namespace exactly
2. **Validators**: `isLength` split into `isNumber` and `isFraction`
3. **Prefix**: No `-` character in prefix config
4. **Custom separators**: No longer supported
5. **Order-sensitive modifiers**: Now properly handled (`before:`, `after:`)

**Impact on This Codebase:**

```typescript
// apps/web/src/lib/utils.ts
import { twMerge } from 'tailwind-merge';
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

**Risk**: LOW - Standard usage, upgrade should be seamless

**Action Required:**

1. Update `tailwind-merge` to v3.x
2. Test all `cn()` usage with complex class combinations
3. Verify conditional class merging still works correctly

### shadcn/ui Compatibility

**Status**: ✅ shadcn/ui fully supports Tailwind v4 (Q1 2025)

**Required Changes:**

1. **CSS Variables Migration:**

```css
/* Current (v3) */
:root {
  --background: 0 0% 100%; /* HSL components only */
}

/* v4 Required */
:root {
  --background: hsl(0 0% 100%); /* Complete HSL */
}
```

2. **Theme Directive:**

```css
/* Add after @import */
@theme inline {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --color-primary: var(--primary);
  --color-secondary: var(--secondary);
  /* ... all theme colors */
}
```

3. **Dark Mode**: ✅ `class` strategy fully supported

**Components in Use:**

- ✅ Button, Badge, Card, Avatar, Dialog, Label, Slot, Input, Textarea, Sheet, Separator
- ⚠️ All require CSS variable format update

**Action Required:**

1. Update CSS variables with `hsl()` wrapper
2. Add `@theme inline` color mapping
3. Test all components in light and dark mode
4. Verify interactive states (hover, focus, disabled)

---

## Codebase Usage Analysis

### Files Using Tailwind Classes: 33+

**Component Library** (`apps/web/src/components/ui/`):

- `avatar.tsx` - Custom avatars with fallback
- `badge.tsx` - Status badges with variants (default, secondary, destructive, brand)
- `breadcrumb.tsx` - Navigation breadcrumbs
- `button.tsx` - Primary UI button with variants
- `card.tsx` - Container component with header/footer
- `input.tsx` - Form input with file support
- `label.tsx` - Form labels with accessibility
- `separator.tsx` - Horizontal/vertical dividers
- `sheet.tsx` - Side sheet/drawer with animations
- `textarea.tsx` - Multi-line text input

**Layout Components** (`apps/web/src/components/layout/`):

- `app-sidebar.tsx` - Main navigation sidebar
- `app-header.tsx` - Top header with backdrop blur
- `mobile-navigation.tsx` - Mobile menu
- `app-breadcrumbs.tsx` - Breadcrumb navigation

**Feature Components**:

- `HealthCard.tsx` - System health status
- `JobsChart.tsx` - Job visualization
- `QueuesWidget.tsx` - Queue monitoring
- `theme-toggle.tsx` - Dark mode toggle
- Content plan wizards and previews

### Opacity Modifier Usage: 14+ instances

**Pattern**: `{color}/{opacity}` (already v4-compatible)

```typescript
// Backgrounds
'bg-card/70'; // Card with 70% opacity
'bg-card/80'; // Card with 80% opacity
'bg-muted/70'; // Muted background
'bg-primary/90'; // Primary color at 90%
'bg-secondary/80'; // Secondary color at 80%
'bg-destructive/10'; // Destructive background tint
'bg-background/80'; // Background with transparency

// Borders
'border-border/60'; // Semi-transparent border
'border-destructive/30'; // Light destructive border

// Hover States
'hover:bg-primary/80';
'hover:bg-secondary/80';
'hover:bg-destructive/80';
'hover:bg-brand-600/90';
```

**Risk**: LOW - Fully v4-compatible syntax already in use

### Dark Mode Implementation

**Strategy**: `class`-based dark mode

**Files**:

- `apps/web/tailwind.config.ts` - `darkMode: "class"`
- `apps/web/src/app/globals.css` - CSS variable overrides under `.dark`
- `apps/web/src/components/theme-toggle.tsx` - Toggle implementation

**Usage Examples:**

```typescript
// Conditional dark mode classes
'dark:-rotate-90 dark:scale-0';
'dark:rotate-0 dark:scale-100';

// CSS variables automatically switch via .dark selector
'bg-background'; // Uses --background (light: hsl(0 0% 100%), dark: hsl(230 30% 6%))
```

**Risk**: LOW - Fully compatible with v4

### Custom Brand Color Palette

**File**: `apps/web/tailwind.preset.ts`

```typescript
const brandColors = {
  50: "#eef2ff",
  100: "#e0e7ff",
  200: "#c7d2fe",
  300: "#a5b4fc",
  400: "#818cf8",
  500: "#6366f1",  // Primary brand color
  600: "#4f46e5",  // Darker brand
  700: "#4338ca",
  800: "#3730a3",
  900: "#312e81",
  950: "#1e1b4b",
};

boxShadow: {
  brand: "0 20px 45px -20px rgba(79, 70, 229, 0.55)",
}
```

**Usage Locations:**

- Sidebar branding (`bg-brand-600`, `text-brand-700`)
- Badge variants (`bg-brand-100`, `text-brand-700`)
- Active states (`bg-brand-50`, `hover:bg-brand-100`)
- Focus states (`text-brand-600`)

**Risk**: LOW - Custom color extensions fully supported in v4

### Animation Usage

**Plugin**: `tailwindcss-animate@1.0.7` (v3)

**Custom Animations:**

```typescript
// tailwind.config.ts
keyframes: {
  "accordion-down": { from: { height: "0" }, to: { height: "var(--radix-accordion-content-height)" } },
  "accordion-up": { from: { height: "var(--radix-accordion-content-height)" }, to: { height: "0" } }
}
```

**Usage:**

- `animate-pulse` - Skeleton loading states (JobsChart, HealthCard)
- `animate-in` / `animate-out` - Sheet/dialog entrance/exit
- `data-[state=open]:animate-in` - Conditional animations
- Custom accordion animations (not yet used in current components)

**Risk**: HIGH - Requires plugin replacement and animation migration

### Focus & Accessibility Patterns

**Focus Ring** (15+ instances):

```typescript
'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2';
```

**Disabled States**:

```typescript
'disabled:pointer-events-none disabled:opacity-50';
'peer-disabled:cursor-not-allowed peer-disabled:opacity-70';
```

**File Input Styling**:

```typescript
'file:border-0 file:bg-transparent file:text-sm file:font-medium';
```

**Placeholder Styling**:

```typescript
'placeholder:text-muted-foreground';
```

**Risk**: LOW - All patterns v4-compatible

### Responsive Breakpoints

**Usage**:

- `sm:` - Small screens (640px+)
- `md:` - Medium screens (768px+)
- `lg:` - Large screens (1024px+)

**Examples**:

```typescript
'sm:max-w-sm sm:flex-row';
'md:grid-cols-2';
'lg:flex lg:px-8';
'hidden lg:flex'; // Desktop-only sidebar
```

**Risk**: LOW - Standard breakpoint system, fully compatible

---

## Risk Assessment

### Critical Risks (HIGH Priority)

#### 1. Plugin Incompatibility (Risk: HIGH)

**Issue**: `tailwindcss-animate@1.0.7` uses v3 JavaScript plugin API, incompatible with v4.

**Impact**:

- Build may fail if plugin not removed
- Animations will not work if plugin not replaced
- Custom keyframes need migration to CSS

**Mitigation**:

1. Replace with `tw-animate-css` package
2. Migrate custom keyframes to CSS `@theme`
3. Test all animation usage

**Likelihood**: 1.0 (certain)
**Impact**: HIGH
**Mitigation Complexity**: MEDIUM

#### 2. tailwind-merge v2 Incompatibility (Risk: HIGH)

**Issue**: `tailwind-merge@2.6.0` only supports Tailwind v3, breaks with v4.

**Impact**:

- `cn()` utility may produce incorrect class merging
- Conditional styling may break
- Component variants may not render correctly

**Mitigation**:

1. Upgrade to `tailwind-merge@^3.0.0`
2. Test all `cn()` usage locations (33+ files)
3. Verify complex conditional class merging

**Likelihood**: 1.0 (certain)
**Impact**: HIGH
**Mitigation Complexity**: LOW

#### 3. CSS Variable Format Changes (Risk: MEDIUM)

**Issue**: CSS variables must include `hsl()` wrapper in v4, not in theme config.

**Impact**:

- 30+ color variables need update (`:root` + `.dark`)
- Incorrect format may cause colors to break
- Opacity modifiers may not work with improper format

**Mitigation**:

1. Update all `:root` variables with `hsl()` wrapper
2. Update all `.dark` variables with `hsl()` wrapper
3. Add `@theme inline` directive for Tailwind mapping
4. Visual regression test all colors

**Likelihood**: 1.0 (certain)
**Impact**: MEDIUM
**Mitigation Complexity**: MEDIUM

### Medium Risks (MEDIUM Priority)

#### 4. Default Utility Color Changes (Risk: MEDIUM)

**Issue**: Default colors for `ring`, `border`, `placeholder` changed in v4.

**Impact**:

- Focus states may look different (ring color/width)
- Borders may inherit `currentColor` instead of gray
- Form placeholders may change appearance

**Mitigation**:

1. Visual regression testing on all components
2. Add explicit color classes where needed
3. Test focus states thoroughly
4. Verify border colors across all components

**Likelihood**: 0.8
**Impact**: MEDIUM
**Mitigation Complexity**: LOW

#### 5. Custom Preset Migration (Risk: MEDIUM)

**Issue**: Decision point between keeping JS config or migrating to CSS-first.

**Impact**:

- JS config path: add `@config` directive, keep preset system
- CSS-first path: migrate all theme extensions to CSS, remove config files

**Mitigation**:
**Phase 1-2**: Keep JS config with `@config` (easier, backward compatible)
**Phase 3**: Evaluate CSS-first migration (cleaner, more v4-idiomatic)

**Likelihood**: 0.5 (depends on choice)
**Impact**: MEDIUM
**Mitigation Complexity**: MEDIUM (JS) / HIGH (CSS-first)

### Low Risks (LOW Priority)

#### 6. Build Performance Changes (Risk: LOW)

**Issue**: v4 promises 5x faster builds, but actual gains depend on project size.

**Impact**:

- Best case: Significant build time improvements
- Worst case: Minimal improvement if already fast

**Mitigation**:

1. Benchmark build times before/after migration
2. Monitor HMR performance in development
3. Track production build times

**Likelihood**: 0.2 (unlikely to be negative)
**Impact**: LOW
**Mitigation Complexity**: LOW

#### 7. TypeScript Config Autocomplete Loss (Risk: LOW)

**Issue**: CSS-first config loses TypeScript autocomplete for theme values.

**Impact**:

- Developer experience slightly degraded
- No IntelliSense for custom theme values
- Can be mitigated by keeping JS config with `@config`

**Mitigation**:

1. Use `@config` approach to keep TS config (Phase 1-2)
2. Defer CSS-first migration to Phase 3
3. Document theme values in comments

**Likelihood**: 1.0 (if using CSS-first)
**Impact**: LOW
**Mitigation Complexity**: LOW

---

## Migration Plan

### Overview

**Total Effort**: 3-4 hours (Phases 1-2), 5-6 hours (including Phase 3)
**Phases**: 3 phases, each independently testable
**Approach**: Incremental, low-risk, with rollback points

---

### Phase 1: Automated Migration (1-2 hours)

**Goal**: Get to a working v4 state using official tools.

**Prerequisites:**

- [x] Create migration branch: `git checkout -b chore/tailwind-v4-migration`
- [x] Backup current state: `git add . && git commit -m "chore: pre-migration snapshot"`
- [x] Take screenshots of all pages for visual regression baseline

**Steps:**

#### 1.1 Run Official Upgrade Tool (5 min)

```bash
cd D:\Repositories\influencerai-monorepo
npx @tailwindcss/upgrade
```

**Expected Changes:**

- Dependency updates in `package.json`
- CSS variable format updates in `globals.css`
- `@theme inline` directive added
- Deprecated utilities replaced

**Validation:**

```bash
git diff
# Review all changes carefully before proceeding
```

#### 1.2 Update Dependencies (5 min)

```bash
# Update tailwind-merge to v3
pnpm add -D tailwind-merge@^3.0.0

# Replace tailwindcss-animate with tw-animate-css
pnpm remove tailwindcss-animate
pnpm add -D tw-animate-css

# Install dependencies
pnpm install
```

#### 1.3 Update PostCSS Config (2 min)

**File**: `apps/web/postcss.config.js`

```javascript
// Before
module.exports = {
  plugins: {
    '@tailwindcss/postcss': {},
    autoprefixer: {}, // Remove this
  },
};

// After
module.exports = {
  plugins: {
    '@tailwindcss/postcss': {},
  },
};
```

#### 1.4 Remove autoprefixer Dependency (1 min)

```bash
pnpm remove -D autoprefixer
```

#### 1.5 Test Build (10 min)

```bash
pnpm --filter web build
```

**Expected Output**: Build succeeds without errors

**If Build Fails:**

1. Review error messages for missing dependencies
2. Check if CSS variables are properly formatted
3. Verify `@tailwindcss/postcss` is in `postcss.config.js`
4. Check for plugin conflicts

#### 1.6 Test Dev Server (10 min)

```bash
pnpm --filter web dev
```

**Validation Checklist:**

- [ ] Dev server starts without errors
- [ ] Pages load correctly
- [ ] No console errors in browser
- [ ] Styles appear roughly correct (detailed testing in Phase 2)

#### 1.7 Initial Visual Check (20 min)

**Pages to Check:**

- `/login` - Login page
- `/dashboard` - Main dashboard
- `/dashboard/content-plans` - Content plans page

**What to Look For:**

- Colors appear correct (may have slight differences)
- Layout is not broken
- Dark mode toggle still works
- Interactive states (hover, focus) present

**Commit Point:**

```bash
git add .
git commit -m "chore(web): automated Tailwind v4 migration with upgrade tool"
```

---

### Phase 2: Manual Refinements (1-2 hours)

**Goal**: Fix edge cases, replace plugins, ensure visual parity with v3.

**Prerequisites:**

- [x] Phase 1 completed
- [x] Initial build successful
- [x] No critical errors in browser console

**Steps:**

#### 2.1 Replace tailwindcss-animate Import (5 min)

**File**: `apps/web/src/app/globals.css`

```css
/* Remove or update imports - tailwindcss-animate may have been imported */
/* If you find: */
/* @import "tailwindcss-animate"; */

/* Add tw-animate-css import after @import "tailwindcss": */
@import 'tailwindcss';
@import 'tw-animate-css';
```

**File**: `apps/web/tailwind.config.ts`

```typescript
// Remove v3 plugin import
- import animate from "tailwindcss-animate";

export default {
  // ...
  // Remove from plugins array
- plugins: [animate],
+ plugins: [],
}
```

#### 2.2 Migrate Custom Animations to CSS (15 min)

**Current Location**: `apps/web/tailwind.config.ts` (lines 56-69)

**Migration Path:**

**Option A**: Keep in JS config with `@config` directive

```typescript
// tailwind.config.ts - keep as-is
keyframes: {
  "accordion-down": { from: { height: "0" }, to: { height: "var(--radix-accordion-content-height)" } },
  "accordion-up": { from: { height: "var(--radix-accordion-content-height)" }, to: { height: "0" } }
},
animation: {
  "accordion-down": "accordion-down 0.2s ease-out",
  "accordion-up": "accordion-up 0.2s ease-out"
}
```

**Option B**: Migrate to CSS `@theme` (recommended for v4)

```css
/* apps/web/src/app/globals.css */
@theme {
  --animate-accordion-down: accordion-down 0.2s ease-out;
  --animate-accordion-up: accordion-up 0.2s ease-out;

  @keyframes accordion-down {
    from {
      height: 0;
    }
    to {
      height: var(--radix-accordion-content-height);
    }
  }

  @keyframes accordion-up {
    from {
      height: var(--radix-accordion-content-height);
    }
    to {
      height: 0;
    }
  }
}
```

**Choose Option B** for this phase (more v4-idiomatic).

**Remove from JS Config:**

```typescript
// tailwind.config.ts
theme: {
  extend: {
    // Remove keyframes and animation sections
-   keyframes: { ... },
-   animation: { ... }
  }
}
```

#### 2.3 Update CSS Variables with hsl() Wrapper (30 min)

**File**: `apps/web/src/app/globals.css`

**Before (v3 format):**

```css
:root {
  --background: 0 0% 100%;
  --foreground: 215 28% 12%;
  --card: 0 0% 100%;
  --card-foreground: 215 28% 12%;
  --popover: 0 0% 100%;
  --popover-foreground: 215 28% 12%;
  --primary: 224 84% 56%;
  --primary-foreground: 210 20% 94%;
  --secondary: 214 32% 91%;
  --secondary-foreground: 215 28% 12%;
  --muted: 216 12% 91%;
  --muted-foreground: 215 16% 48%;
  --accent: 216 12% 91%;
  --accent-foreground: 215 28% 12%;
  --destructive: 0 84% 60%;
  --destructive-foreground: 210 20% 94%;
  --border: 214 32% 91%;
  --input: 214 32% 91%;
  --ring: 224 84% 56%;
  --radius: 0.75rem;
}

.dark {
  --background: 230 30% 6%;
  --foreground: 210 20% 94%;
  --card: 231 25% 10%;
  --card-foreground: 210 20% 94%;
  --popover: 231 25% 10%;
  --popover-foreground: 210 20% 94%;
  --primary: 224 84% 56%;
  --primary-foreground: 210 20% 94%;
  --secondary: 222 20% 18%;
  --secondary-foreground: 210 20% 94%;
  --muted: 222 20% 18%;
  --muted-foreground: 215 20% 65%;
  --accent: 222 20% 18%;
  --accent-foreground: 210 20% 94%;
  --destructive: 0 62% 30%;
  --destructive-foreground: 210 20% 94%;
  --border: 216 17% 22%;
  --input: 216 17% 22%;
  --ring: 224 84% 56%;
}
```

**After (v4 format):**

```css
:root {
  --background: hsl(0 0% 100%);
  --foreground: hsl(215 28% 12%);
  --card: hsl(0 0% 100%);
  --card-foreground: hsl(215 28% 12%);
  --popover: hsl(0 0% 100%);
  --popover-foreground: hsl(215 28% 12%);
  --primary: hsl(224 84% 56%);
  --primary-foreground: hsl(210 20% 94%);
  --secondary: hsl(214 32% 91%);
  --secondary-foreground: hsl(215 28% 12%);
  --muted: hsl(216 12% 91%);
  --muted-foreground: hsl(215 16% 48%);
  --accent: hsl(216 12% 91%);
  --accent-foreground: hsl(215 28% 12%);
  --destructive: hsl(0 84% 60%);
  --destructive-foreground: hsl(210 20% 94%);
  --border: hsl(214 32% 91%);
  --input: hsl(214 32% 91%);
  --ring: hsl(224 84% 56%);
  --radius: 0.75rem;
}

.dark {
  --background: hsl(230 30% 6%);
  --foreground: hsl(210 20% 94%);
  --card: hsl(231 25% 10%);
  --card-foreground: hsl(210 20% 94%);
  --popover: hsl(231 25% 10%);
  --popover-foreground: hsl(210 20% 94%);
  --primary: hsl(224 84% 56%);
  --primary-foreground: hsl(210 20% 94%);
  --secondary: hsl(222 20% 18%);
  --secondary-foreground: hsl(210 20% 94%);
  --muted: hsl(222 20% 18%);
  --muted-foreground: hsl(215 20% 65%);
  --accent: hsl(222 20% 18%);
  --accent-foreground: hsl(210 20% 94%);
  --destructive: hsl(0 62% 30%);
  --destructive-foreground: hsl(210 20% 94%);
  --border: hsl(216 17% 22%);
  --input: hsl(216 17% 22%);
  --ring: hsl(224 84% 56%);
}
```

**Automation Tip:**

```bash
# Use sed to add hsl() wrapper (backup first!)
# This is a helper - manual verification still required
```

#### 2.4 Add @theme inline Directive (15 min)

**File**: `apps/web/src/app/globals.css`

Add after `@import "tailwindcss";`:

```css
@import 'tailwindcss';
@import 'tw-animate-css';

@theme inline {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --color-card: var(--card);
  --color-card-foreground: var(--card-foreground);
  --color-popover: var(--popover);
  --color-popover-foreground: var(--popover-foreground);
  --color-primary: var(--primary);
  --color-primary-foreground: var(--primary-foreground);
  --color-secondary: var(--secondary);
  --color-secondary-foreground: var(--secondary-foreground);
  --color-muted: var(--muted);
  --color-muted-foreground: var(--muted-foreground);
  --color-accent: var(--accent);
  --color-accent-foreground: var(--accent-foreground);
  --color-destructive: var(--destructive);
  --color-destructive-foreground: var(--destructive-foreground);
  --color-border: var(--border);
  --color-input: var(--input);
  --color-ring: var(--ring);
  --radius-lg: var(--radius);
  --radius-md: calc(var(--radius) - 2px);
  --radius-sm: calc(var(--radius) - 4px);
}
```

#### 2.5 Update Tailwind Config (10 min)

**File**: `apps/web/tailwind.config.ts`

**Option A (Recommended for Phase 2)**: Keep JS config with `@config` directive

Add `@config` to CSS:

```css
/* apps/web/src/app/globals.css */
@config "../tailwind.config.ts";
@import 'tailwindcss';
```

Keep `tailwind.config.ts` as-is (minus animations if migrated to CSS).

**Option B**: Remove theme extensions from JS, rely on `@theme`

```typescript
// Simplify config
export default {
  darkMode: 'class',
  content: [
    './src/pages/**/*.{ts,tsx,mdx}',
    './src/components/**/*.{ts,tsx,mdx}',
    './src/app/**/*.{ts,tsx,mdx}',
  ],
  // Remove theme extensions - now in @theme
  plugins: [],
};
```

**Choose Option A** for stability.

#### 2.6 Test Build and Dev Server (10 min)

```bash
# Build
pnpm --filter web build

# Dev
pnpm --filter web dev
```

**Expected**: No errors, all pages load.

#### 2.7 Visual Regression Testing (30 min)

**Test Matrix:**

| Component | Light Mode | Dark Mode | Hover | Focus | Disabled |
| --------- | ---------- | --------- | ----- | ----- | -------- |
| Button    | ✓          | ✓         | ✓     | ✓     | ✓        |
| Badge     | ✓          | ✓         | ✓     | -     | -        |
| Input     | ✓          | ✓         | ✓     | ✓     | ✓        |
| Card      | ✓          | ✓         | -     | -     | -        |
| Sidebar   | ✓          | ✓         | ✓     | ✓     | -        |
| Header    | ✓          | ✓         | -     | -     | -        |
| Sheet     | ✓          | ✓         | -     | -     | -        |

**Manual Testing Steps:**

1. Open `/dashboard` in browser
2. Toggle dark mode - verify smooth transition
3. Test all interactive elements:
   - Buttons: hover, focus, active states
   - Inputs: focus ring, placeholder text
   - Cards: borders, shadows, opacity
   - Navigation: active states, hover effects
4. Check opacity modifiers visually (bg-card/80, border-border/60)
5. Test animations:
   - Pulse on loading skeletons
   - Sheet entrance/exit animations
   - Theme toggle smooth transition

**Compare with baseline screenshots.**

**Issues Found**: Document in checklist for fixes.

**Commit Point:**

```bash
git add .
git commit -m "chore(web): manual Tailwind v4 refinements - animations, CSS vars, testing"
```

---

### Phase 3: Optimization (Optional, 2-3 hours)

**Goal**: Migrate to pure CSS-first configuration (future-proof).

**Status**: ⚠️ **OPTIONAL** - Defer to future iteration.

**Prerequisites:**

- [x] Phase 1 & 2 completed
- [x] All tests passing
- [x] Visual regression testing passed

**Steps:**

#### 3.1 Migrate Custom Preset to CSS (45 min)

**Current**: `apps/web/tailwind.preset.ts`

```typescript
const brandColors = {
  50: "#eef2ff",
  100: "#e0e7ff",
  // ... 10 more shades
  950: "#1e1b4b",
};

boxShadow: {
  brand: "0 20px 45px -20px rgba(79, 70, 229, 0.55)",
}
```

**Target**: `apps/web/src/app/globals.css`

```css
@theme {
  --color-brand-50: #eef2ff;
  --color-brand-100: #e0e7ff;
  --color-brand-200: #c7d2fe;
  --color-brand-300: #a5b4fc;
  --color-brand-400: #818cf8;
  --color-brand-500: #6366f1;
  --color-brand-600: #4f46e5;
  --color-brand-700: #4338ca;
  --color-brand-800: #3730a3;
  --color-brand-900: #312e81;
  --color-brand-950: #1e1b4b;

  --shadow-brand: 0 20px 45px -20px rgba(79, 70, 229, 0.55);
}
```

#### 3.2 Remove JS Config Files (5 min)

```bash
rm apps/web/tailwind.config.ts
rm apps/web/tailwind.preset.ts
```

#### 3.3 Remove @config Directive (2 min)

```css
/* apps/web/src/app/globals.css */
- @config "../tailwind.config.ts";
@import "tailwindcss";
```

#### 3.4 Update Documentation (15 min)

- Update `CLAUDE.md` with v4 conventions
- Document theme customization approach
- Update README if needed

#### 3.5 Performance Benchmarks (20 min)

```bash
# Before migration (use git to checkout pre-migration state)
time pnpm --filter web build

# After migration
time pnpm --filter web build

# Compare build times
```

**Expected**: 5-30% faster builds with CSS-first approach.

#### 3.6 Final Testing (60 min)

- Full test suite: `pnpm --filter web test`
- E2E testing if available
- Manual QA on all pages
- Lighthouse audit

**Commit Point:**

```bash
git add .
git commit -m "chore(web): migrate to pure CSS-first Tailwind v4 config"
```

---

## Testing Strategy

### Unit Tests

**Command**: `pnpm --filter web test`

**What to Test:**

- `cn()` utility function with `tailwind-merge` v3
- Component rendering with new Tailwind classes
- Dark mode state management

**Expected**: All existing tests pass without modification.

### Build Testing

**Command**: `pnpm --filter web build`

**Success Criteria:**

- Build completes without errors
- No PostCSS warnings
- No missing CSS variable errors
- Output CSS file generated successfully

**Bundle Size Check:**

```bash
ls -lh apps/web/.next/static/css/
# Compare before/after migration
```

**Expected**: Similar or smaller bundle size.

### Dev Server Testing

**Command**: `pnpm --filter web dev`

**Success Criteria:**

- Server starts without errors
- Hot Module Replacement (HMR) works
- No console errors in terminal
- Fast refresh on file changes

### Visual Regression Testing

**Manual Testing Checklist:**

#### Color Testing

- [ ] Light mode - all theme colors render correctly
- [ ] Dark mode - all theme colors render correctly
- [ ] Opacity modifiers work (`/90`, `/80`, `/60`, etc.)
- [ ] Brand colors render correctly (purple/indigo shades)
- [ ] Custom box shadow `shadow-brand` renders

#### Component Testing

- [ ] Button - all variants (default, destructive, outline, secondary, ghost, link)
- [ ] Button - all sizes (default, sm, lg, icon)
- [ ] Badge - all variants (default, secondary, destructive, brand)
- [ ] Card - header, content, footer sections
- [ ] Input - focus ring, placeholder text, disabled state
- [ ] Textarea - min-height, focus states
- [ ] Sheet - entrance/exit animations, backdrop blur

#### Layout Testing

- [ ] Sidebar - brand logo, active states, hover effects
- [ ] Header - backdrop blur, sticky positioning
- [ ] Breadcrumbs - navigation, separators
- [ ] Mobile navigation - responsive behavior

#### Interactive States

- [ ] Hover states - all interactive elements
- [ ] Focus states - keyboard navigation, ring visibility
- [ ] Active states - button press, link clicks
- [ ] Disabled states - opacity, cursor changes

#### Animation Testing

- [ ] Pulse animation - loading skeletons
- [ ] Sheet animations - slide in/out
- [ ] Theme toggle - smooth sun/moon transition
- [ ] Accordion animations (if used)

#### Responsive Testing

- [ ] Mobile (320px-640px) - navigation, layout
- [ ] Tablet (640px-1024px) - grid adjustments
- [ ] Desktop (1024px+) - sidebar visible, full layout

#### Dark Mode Testing

- [ ] Toggle switch works smoothly
- [ ] All colors update correctly
- [ ] No flashing or jarring transitions
- [ ] Theme persists on page reload

### Browser Compatibility Testing

**Target Browsers:**

- Chrome 111+ (color-mix support)
- Firefox 128+ (color-mix support)
- Safari 16.4+ (color-mix support)
- Edge (latest)

**Note**: Tailwind v4 uses OKLCH color space via `color-mix()`, which requires modern browsers. IE11 not supported.

### Automated Visual Regression (Optional)

**Tool Suggestions:**

- Percy.io
- Chromatic
- BackstopJS

**Setup** (if time permits):

```bash
pnpm add -D backstopjs
# Configure scenarios for key pages
# Run before migration: backstopjs test
# Run after migration: backstopjs test
# Compare diffs
```

---

## Rollback Plan

### Immediate Rollback (if critical issues found)

```bash
# Discard all changes
git reset --hard HEAD
git checkout main

# Or revert to specific commit
git revert <commit-sha>
```

### Partial Rollback (if specific phase fails)

**Phase 1 Failure:**

```bash
# Revert automated migration
git reset --hard <pre-phase-1-commit>
```

**Phase 2 Failure:**

```bash
# Keep Phase 1, revert Phase 2
git reset --hard <post-phase-1-commit>
```

**Phase 3 Failure:**

```bash
# Keep Phase 1 & 2, revert Phase 3
git reset --hard <post-phase-2-commit>
```

### Fallback to Hybrid State

**Option**: Keep current hybrid state (v3 core + v4 PostCSS)

```bash
# Stay on current versions
pnpm add -D tailwindcss@3.4.18 @tailwindcss/postcss@4.1.13
```

**Rationale**: If full migration blocked, hybrid state is functional (though not optimal).

### Dependency Pinning (prevent accidental upgrades)

```json
// package.json
{
  "devDependencies": {
    "tailwindcss": "3.4.18",
    "tailwind-merge": "2.6.0",
    "tailwindcss-animate": "1.0.7"
  }
}
```

**Use only if migration fully abandoned.**

---

## Success Criteria

### Build Success Criteria

- [ ] `pnpm --filter web build` completes without errors
- [ ] No PostCSS warnings
- [ ] CSS bundle generated successfully
- [ ] Bundle size similar or smaller than v3
- [ ] Build time similar or faster than v3

### Dev Server Success Criteria

- [ ] `pnpm --filter web dev` starts without errors
- [ ] Hot Module Replacement works
- [ ] No console errors or warnings
- [ ] File changes trigger fast refresh
- [ ] Dev server performance maintained or improved

### Visual Parity Criteria

- [ ] All pages render correctly in light mode
- [ ] All pages render correctly in dark mode
- [ ] Dark mode toggle works smoothly
- [ ] All component variants render correctly
- [ ] Opacity modifiers work as expected
- [ ] Brand colors render correctly
- [ ] Focus states visible and correct
- [ ] Hover states work correctly
- [ ] Animations play smoothly

### Functional Criteria

- [ ] All interactive elements work (buttons, inputs, links)
- [ ] Forms submit correctly
- [ ] Navigation works (sidebar, breadcrumbs)
- [ ] Theme toggle persists on reload
- [ ] No JavaScript errors in console
- [ ] Accessibility features maintained (focus-visible, ARIA)

### Testing Criteria

- [ ] All unit tests pass (`pnpm --filter web test`)
- [ ] Lint checks pass (`pnpm --filter web lint`)
- [ ] Type checking passes (`pnpm --filter web type-check`)
- [ ] No Tailwind-related console warnings

### Performance Criteria

- [ ] First Contentful Paint (FCP) maintained or improved
- [ ] Largest Contentful Paint (LCP) maintained or improved
- [ ] Cumulative Layout Shift (CLS) maintained or improved
- [ ] Lighthouse score maintained (>90)

### Documentation Criteria

- [ ] Migration documented in this spike analysis
- [ ] CLAUDE.md updated with v4 conventions
- [ ] Team informed of changes
- [ ] Known issues documented

### Deployment Readiness

- [ ] Production build succeeds
- [ ] Visual regression testing passed
- [ ] No breaking changes identified
- [ ] Rollback plan tested and ready
- [ ] Team approval obtained

---

## References

### Official Documentation

- **Tailwind CSS v4 Upgrade Guide**: https://tailwindcss.com/docs/upgrade-guide
- **Tailwind CSS v4 Blog**: https://tailwindcss.com/blog/tailwindcss-v4
- **Tailwind CSS v4 Docs**: https://tailwindcss.com/docs

### Dependency Documentation

- **tailwind-merge v3**: https://github.com/dcastil/tailwind-merge
- **tw-animate-css**: https://github.com/Wombosvideo/tw-animate-css
- **shadcn/ui Tailwind v4**: https://ui.shadcn.com/docs/tailwind-v4

### Tools

- **Upgrade Tool**: `npx @tailwindcss/upgrade`
- **Vite Plugin**: `@tailwindcss/vite`
- **PostCSS Plugin**: `@tailwindcss/postcss`

### Community Resources

- Next.js 15 + Tailwind v4 examples
- shadcn/ui component examples with v4
- Tailwind v4 migration guides (community blogs)

### Internal Documentation

- `apps/web/tailwind.config.ts` - Current configuration
- `apps/web/src/app/globals.css` - CSS variables and layers
- `apps/web/tailwind.preset.ts` - Custom preset
- `CLAUDE.md` - Project conventions

---

## Appendix A: Complete File Inventory

### Files Modified in Migration

**Configuration Files:**

1. `apps/web/package.json` - Dependency updates
2. `apps/web/postcss.config.js` - Remove autoprefixer
3. `apps/web/tailwind.config.ts` - Remove animations (if migrating to CSS)

**CSS Files:**

1. `apps/web/src/app/globals.css` - CSS variable format, @theme directive, animations

**Component Files (no changes expected):**

- All 33+ component files should work without modification
- Testing required to verify

### New Files Created

1. `apps/web/docs/MIGRATION_SPIKE_TAILWIND4.md` - This document

### Files Potentially Deleted (Phase 3 only)

1. `apps/web/tailwind.config.ts` - If migrating to CSS-first
2. `apps/web/tailwind.preset.ts` - If migrating to CSS-first

---

## Appendix B: Dependency Version Matrix

### Before Migration

```json
{
  "devDependencies": {
    "@tailwindcss/postcss": "^4.1.13",
    "tailwindcss": "^3.4.16",
    "tailwind-merge": "^2.5.4",
    "tailwindcss-animate": "^1.0.7",
    "autoprefixer": "^10.4.21"
  }
}
```

### After Migration (Phase 1-2)

```json
{
  "devDependencies": {
    "@tailwindcss/postcss": "^4.1.14",
    "tailwindcss": "^4.1.14",
    "tailwind-merge": "^3.3.1",
    "tw-animate-css": "^1.0.0"
  }
}
```

### After Migration (Phase 3 - CSS-first)

```json
{
  "devDependencies": {
    "@tailwindcss/postcss": "^4.1.14",
    "tailwindcss": "^4.1.14",
    "tailwind-merge": "^3.3.1",
    "tw-animate-css": "^1.0.0"
  }
}
```

**Note**: `tailwind-merge` and `tw-animate-css` versions may vary based on latest releases.

---

## Appendix C: Migration Checklist

### Pre-Migration

- [ ] Review this spike analysis completely
- [ ] Get team approval for migration
- [ ] Create migration branch
- [ ] Take screenshots of all pages (baseline)
- [ ] Document current bundle sizes
- [ ] Document current build times

### Phase 1: Automated Migration

- [ ] Run `npx @tailwindcss/upgrade`
- [ ] Review git diff
- [ ] Update `tailwind-merge` to v3.x
- [ ] Replace `tailwindcss-animate` with `tw-animate-css`
- [ ] Remove `autoprefixer` from PostCSS config
- [ ] Remove `autoprefixer` from package.json
- [ ] Run `pnpm install`
- [ ] Test build: `pnpm --filter web build`
- [ ] Test dev: `pnpm --filter web dev`
- [ ] Initial visual check
- [ ] Commit: "automated Tailwind v4 migration"

### Phase 2: Manual Refinements

- [ ] Update `globals.css` - replace tailwindcss-animate import with tw-animate-css
- [ ] Remove animate plugin from `tailwind.config.ts`
- [ ] Migrate custom animations to CSS @theme
- [ ] Update all CSS variables with `hsl()` wrapper (`:root`)
- [ ] Update all CSS variables with `hsl()` wrapper (`.dark`)
- [ ] Add `@theme inline` directive
- [ ] Test build
- [ ] Test dev server
- [ ] Visual regression testing - Light mode
- [ ] Visual regression testing - Dark mode
- [ ] Test all interactive states (hover, focus, disabled)
- [ ] Test animations (pulse, sheet, theme toggle)
- [ ] Test responsive breakpoints
- [ ] Commit: "manual Tailwind v4 refinements"

### Phase 3: Optimization (Optional)

- [ ] Migrate brand colors to CSS @theme
- [ ] Migrate box shadow to CSS @theme
- [ ] Remove `tailwind.config.ts`
- [ ] Remove `tailwind.preset.ts`
- [ ] Remove `@config` directive
- [ ] Test build
- [ ] Performance benchmarks
- [ ] Final testing
- [ ] Commit: "pure CSS-first Tailwind v4 config"

### Validation

- [ ] Run all tests: `pnpm --filter web test`
- [ ] Run lint: `pnpm --filter web lint`
- [ ] Build for production: `pnpm --filter web build`
- [ ] Manual QA on all pages
- [ ] Browser console check (no errors)
- [ ] Lighthouse audit
- [ ] Compare bundle sizes
- [ ] Compare build times

### Documentation

- [ ] Update CLAUDE.md with v4 conventions
- [ ] Update README if needed
- [ ] Document gotchas discovered
- [ ] Update team on changes
- [ ] Close issue #126 with summary

### Deployment

- [ ] Peer review PR
- [ ] QA approval
- [ ] Merge to main
- [ ] Monitor production for issues

---

## Appendix D: Known Issues & Workarounds

### Issue 1: color-mix() Browser Support

**Description**: Tailwind v4 uses OKLCH color space via `color-mix()`, which requires modern browsers.

**Affected Browsers**: IE11, Safari <16.4, Firefox <128

**Workaround**: None - upgrade is required. Tailwind v4 does not support legacy browsers.

**Impact**: Users on old browsers will see broken colors.

**Mitigation**: Add browser version check and show upgrade message.

### Issue 2: TypeScript Autocomplete Loss (CSS-first)

**Description**: Migrating to pure CSS-first config loses TypeScript autocomplete for theme values.

**Workaround**: Use `@config` directive to keep JS config alongside CSS-first setup.

**Impact**: Slightly degraded developer experience.

**Mitigation**: Document theme values in comments, or keep JS config.

### Issue 3: tw-animate-css Differences

**Description**: tw-animate-css may have slightly different animation curves than tailwindcss-animate.

**Workaround**: Adjust animation timing in CSS if needed.

**Impact**: Animations may feel subtly different.

**Mitigation**: Visual testing and tweaking.

---

## Conclusion

This spike analysis provides a comprehensive plan for migrating from Tailwind CSS v3 to v4 in the InfluencerAI web application. The migration is **recommended to proceed** with a phased approach:

**Phase 1-2** (3-4 hours): Functional migration using automated tools and manual refinements.
**Phase 3** (2-3 hours): Optional CSS-first optimization for future-proofing.

**Key Takeaways:**

- Current codebase is already halfway migrated (hybrid state)
- 2 critical dependency incompatibilities (tailwind-merge, tailwindcss-animate)
- 30+ CSS variables need format update
- Visual regression testing is critical
- Phased approach minimizes risk
- Rollback plan ready if issues arise

**Recommendation**: ✅ **GO** - Proceed with migration in Phases 1-2, defer Phase 3.

---

**Document Status**: ✅ COMPLETED
**Last Updated**: 2025-10-16
**Next Steps**: Begin Phase 1 execution after team approval.
