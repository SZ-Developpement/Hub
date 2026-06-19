import { Lock } from "lucide-react";
import { Card } from "@/components/ui/card";

export function InternesCard({ text }: { text: string }) {
  return (
    <Card className="bg-amber-50/60 ring-amber-100">
      {/* Titre */}
      <div className="px-5 pb-3.5 border-b border-amber-100 flex items-center gap-2">
        <Lock size={13} className="text-amber-600" />
        <h3 className="text-sm font-semibold text-amber-800">Notes internes</h3>
        <span className="ml-auto text-[10px] font-medium uppercase tracking-wide text-amber-600">
          Membres seulement
        </span>
      </div>
      {/* Description */}
      <p className="px-5 text-sm text-amber-900 leading-relaxed">{text}</p>
    </Card>
  );
}
