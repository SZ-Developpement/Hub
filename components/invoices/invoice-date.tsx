import { Card } from "@/components/ui/card";

export default function InvoiceDate({
  dateEmission,
  dateEchéance,
  projetAssocié,
}: {
  dateEmission: string;
  dateEchéance?: string;
  projetAssocié: string;
}) {
  return (
    <Card className="px-6 py-4 flex flex-row w-full items-center justify-center gap-6">
      <ItemData label="Date d'émission" value={dateEmission} />

      <div className="w-px h-8 bg-border shrink-0" />

      <ItemData
        label="Date d'échéance"
        value={dateEchéance || "Non spécifié"}
      />

      <div className="w-px h-8 bg-border shrink-0" />

      <ItemData label="Projet associé" value={projetAssocié} />
    </Card>
  );
}

function ItemData({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-0.5 flex-1 min-w-0">
      <p className="text-[11px] font-medium text-muted-foreground whitespace-nowrap">
        {label}
      </p>
      <p
        className="text-sm font-semibold text-foreground truncate"
        title={value}
      >
        {value}
      </p>
    </div>
  );
}
