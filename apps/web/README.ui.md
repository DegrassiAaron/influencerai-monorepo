# UI primitives

The web dashboard uses a small set of primitives generated with the [shadcn/ui](https://ui.shadcn.com) generator. These components expose the shared design tokens that live in `src/app/globals.css`, so that layouts stay consistent across widgets.

## Available components

| Component                                                                              | File                           | What it solves                                                         |
| -------------------------------------------------------------------------------------- | ------------------------------ | ---------------------------------------------------------------------- |
| `Button`                                                                               | `src/components/ui/button.tsx` | Primary and secondary call-to-action buttons with shared focus states. |
| `Card` (and `CardHeader`, `CardContent`, `CardTitle`, `CardDescription`, `CardFooter`) | `src/components/ui/card.tsx`   | Surface container with spacing, borders, and typography defaults.      |
| `Badge`                                                                                | `src/components/ui/badge.tsx`  | Inline status labels with consistent color variants.                   |

All primitives rely on the CSS variables declared in `src/app/globals.css`. Tailwind classes reference tokens such as `bg-card`, `text-muted-foreground`, and `ring-ring` that automatically adapt to theme changes.

## Usage examples

### Cards

```tsx
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

export function ExampleCard() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Snapshot</CardTitle>
        <CardDescription>Ultimo aggiornamento 5 minuti fa</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">Contenuto del widget o del grafico.</p>
      </CardContent>
    </Card>
  );
}
```

### Buttons

```tsx
import { Button } from "@/components/ui/button";

<Button type="submit">Salva</Button>
<Button variant="secondary">Annulla</Button>
<Button variant="outline" size="sm">Filtra</Button>
```

Variants supported by the button primitive: `default`, `secondary`, `outline`, `ghost`, `link`, and `destructive`. Sizes: `default`, `sm`, `lg`, `icon`.

### Badges

```tsx
import { Badge } from "@/components/ui/badge";

<Badge>Default</Badge>
<Badge variant="success">Operativo</Badge>
<Badge variant="warning">Degrado</Badge>
<Badge variant="destructive">Errore</Badge>
<Badge variant="info">In elaborazione</Badge>
```

Badges are ideal for inline status indicators inside cards, table cells, or list items. Combine them with the icon/dot pattern as in `HealthCard` to visualise state transitions.

## Conventions

- Prefer composing widgets with `Card` instead of custom `<section>` wrappers.
- Use `CardHeader` + `CardTitle`/`CardDescription` for titles and sub-copy.
- Use `CardContent` for the main body and keep text color scoped with `text-muted-foreground` when showing secondary information.
- Keep badge colors consistent by picking from the predefined variants. Introduce a new variant in `badge.tsx` only when a new semantic meaning is required across multiple components.
- Buttons should never be styled with ad-hoc Tailwind strings; extend the variants in `button.tsx` if necessary.

Following these conventions keeps the styling tokens in one place and makes future widgets faster to implement.
