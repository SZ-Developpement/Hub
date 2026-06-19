import { LetterAvatar } from "@/components/ui/LetterAvatar";

interface TeamCardProps {
  name: string;
  role: string;
}

const COLORS = [
  "indigo",
  "teal",
  "orange",
  "pink",
  "purple",
  "red",
  "yellow",
  "blue",
];

export default function TeamCard({ name, role }: TeamCardProps) {
  // 1. Initiales sécurisées (évite le crash si espaces multiples ou nom vide)
  const initials = name
    .trim()
    .split(/\s+/)
    .map((word) => word[0])
    .join("")
    .toUpperCase()
    .slice(0, 2); // limite à 2 caractères max

  // 2. Couleur déterministe basée sur le nom (évite les flashs de couleur au re-render)
  const getDeterministicColor = (str: string) => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    const index = Math.abs(hash) % COLORS.length;
    return COLORS[index];
  };

  const color = getDeterministicColor(name);

  return (
    <div className="flex items-center gap-3">
      <LetterAvatar initials={initials} color={color} size="md" />
      <div className="min-w-0 flex flex-col gap-0.5">
        <p className="text-sm font-medium text-foreground truncate">{name}</p>
        <span
          className={`text-[10px] font-semibold uppercase tracking-wide ${
            role === "FOUNDER" ? " text-violet-700" : "text-muted-foreground"
          }`}
        >
          {role}
        </span>
      </div>
    </div>
  );
}
