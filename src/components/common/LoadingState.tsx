import { Spinner } from "@/components/ui/spinner";

export function LoadingState({ label = "Загрузка..." }: { label?: string }) {
  return (
    <div className="flex h-40 flex-col items-center justify-center gap-2">
      <Spinner size="md" color="accent" />
      <span className="text-sm text-muted">{label}</span>
    </div>
  );
}

export function LoadingStateScreen() {
  return (
    <div className="flex h-screen w-full items-center justify-center">
      <LoadingState />
    </div>
  );
}
