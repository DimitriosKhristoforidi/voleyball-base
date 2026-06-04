/**
 * Absolute URL for the public (unauthenticated) game view.
 * Set VITE_PUBLIC_APP_URL in production if the app is served from a fixed domain.
 */
export function getPublicGameUrl(gameId: string): string {
  const configured = import.meta.env.VITE_PUBLIC_APP_URL as string | undefined;
  const base =
    configured?.replace(/\/$/, "") ??
    (typeof window !== "undefined" ? window.location.origin : "");
  return `${base}/games/${gameId}/view`;
}
