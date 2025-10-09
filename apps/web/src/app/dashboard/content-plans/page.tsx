import { ContentPlanWizard } from "@/components/content-plans/ContentPlanWizard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export default function ContentPlansPage() {
  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-4 border-b border-border/60 pb-6 md:flex-row md:items-center md:justify-between">
        <div className="space-y-2">
          <Badge variant="brand" className="bg-brand-100 text-brand-700">
            Content Planning
          </Badge>
          <h1 className="text-3xl font-semibold text-foreground">
            Genera e approva il piano editoriale
          </h1>
          <p className="max-w-2xl text-sm text-muted-foreground">
            Completa il wizard per creare un piano editoriale personalizzato per
            la tua persona e gestisci l'approvazione del contenuto.
          </p>
        </div>
        <Button variant="secondary">Scarica come CSV</Button>
      </header>
      <ContentPlanWizard />
    </div>
  );
}
