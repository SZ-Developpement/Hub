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

export function DataCard({
  title,
  value,
  code,
}: {
  title: string;
  value?: string;
  code?: string;
}) {
  return (
    <div>
      <p className="text-[11px] font-medium text-muted-foreground mb-0.5">
        {title}
      </p>
      {value && <p className="text-sm text-foreground">{value}</p>}
      {code && (
        <code className="text-xs font-mono bg-muted px-1.5 py-0.5 rounded text-muted-foreground">
          {code}
        </code>
      )}
    </div>
  );
}

export function KV({
  label,
  value,
  href,
}: {
  label: string;
  value: React.ReactNode;
  href?: string;
}) {
  return (
    <div className="flex items-start gap-4 py-2.5 border-b border-border last:border-0">
      <span className="text-xs font-medium text-muted-foreground w-28 shrink-0 pt-px">
        {label}
      </span>
      {href ? (
        <a
          href={href}
          className="text-sm text-blue-600 hover:underline underline-offset-2"
        >
          {value}
        </a>
      ) : (
        <span className="text-sm text-foreground">{value}</span>
      )}
    </div>
  );
}
