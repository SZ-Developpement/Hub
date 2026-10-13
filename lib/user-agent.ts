/** Résumé lisible d'un user-agent : « Chrome sur Windows ». */
export function describeUserAgent(userAgent: string | null | undefined): {
  label: string;
  mobile: boolean;
} {
  if (!userAgent) return { label: "Appareil inconnu", mobile: false };

  const browser = /Edg\//.test(userAgent)
    ? "Edge"
    : /OPR\/|Opera/.test(userAgent)
      ? "Opera"
      : /Firefox\//.test(userAgent)
        ? "Firefox"
        : /Chrome\//.test(userAgent)
          ? "Chrome"
          : /Safari\//.test(userAgent)
            ? "Safari"
            : "Navigateur";

  const system = /iPhone|iPad|iPod/.test(userAgent)
    ? "iOS"
    : /Android/.test(userAgent)
      ? "Android"
      : /Windows/.test(userAgent)
        ? "Windows"
        : /Mac OS X|Macintosh/.test(userAgent)
          ? "macOS"
          : /Linux/.test(userAgent)
            ? "Linux"
            : null;

  return {
    label: system ? `${browser} sur ${system}` : browser,
    mobile: /Mobile|iPhone|Android/.test(userAgent),
  };
}
