import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function CardDash({
  title,
  description,
  className,
  children,
}: {
  title: string;
  description?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <div className="px-5 pb-3.5 flex flex-col gap-1 border-b border-border">
        <h3 className="text-base font-semibold text-foreground leading-none">
          {title}
        </h3>
        {description && (
          <p className="text-sm text-muted-foreground">{description}</p>
        )}
      </div>

      <div className={cn("px-5", className)}>{children}</div>
    </Card>
  );
}
