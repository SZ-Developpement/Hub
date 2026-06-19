import React from "react";

// 1. Définition stricte des couleurs Tailwind
const avatarColors: Record<string, string> = {
  indigo:
    "bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300",
  teal: "bg-teal-100 text-teal-700 dark:bg-teal-950 dark:text-teal-300",
  orange:
    "bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300",
  pink: "bg-pink-100 text-pink-700 dark:bg-pink-950 dark:text-pink-300",
  purple:
    "bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300",
  red: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300",
  yellow:
    "bg-yellow-100 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-300",
  blue: "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300",
};

interface LetterAvatarProps {
  name?: string;
  initials?: string;
  color?: string;
  size?: "xs" | "sm" | "md" | "lg" | "xl";
}

export function LetterAvatar({
  name,
  initials,
  color = "indigo",
  size = "md",
}: LetterAvatarProps) {
  // 2. Génération des lettres sécurisée contre les espaces vides
  const letters =
    initials ??
    (name ?? "")
      .trim()
      .split(/\s+/) // Gère un ou plusieurs espaces
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);

  const sizes = {
    xs: "w-5 h-5 text-[9px]",
    sm: "w-7 h-7 text-xs",
    md: "w-9 h-9 text-sm",
    lg: "w-11 h-11 text-base",
    xl: "w-16 h-16 text-xl",
  };

  // 3. Secours (fallback) si la couleur demandée n'existe pas dans le dictionnaire
  const colorClass = avatarColors[color] ?? avatarColors.indigo;

  return (
    <div
      className={`${sizes[size]} ${colorClass} rounded-full flex items-center justify-center font-semibold shrink-0`}
    >
      {letters || "?"}
    </div>
  );
}
