import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function InfosCard({
  title,
  className,
  children,
}: {
  title: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <h3 className="px-5 pb-3.5 border-b border-border text-sm font-semibold text-foreground">
        {title}
      </h3>
      <div className={cn("px-5", className)}>{children}</div>
    </Card>
  );
}
