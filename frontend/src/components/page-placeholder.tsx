import { Badge } from "@/components/ui/badge";

type PagePlaceholderProps = {
  title: string;
  description: string;
  phase: string;
};

export function PagePlaceholder({ title, description, phase }: PagePlaceholderProps) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
      <Badge variant="secondary">Phase {phase} placeholder</Badge>
      <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
      <p className="max-w-md text-muted-foreground">{description}</p>
    </div>
  );
}