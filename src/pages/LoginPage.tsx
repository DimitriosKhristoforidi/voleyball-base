import { useState, type FormEvent } from "react";
import { Volleyball } from "lucide-react";
import { Button, Card } from "@/components/ui/hero";
import { AppInput } from "@/components/ui/AppField";
import { useAuth } from "@/lib/auth";

export default function LoginPage() {
  const { signIn } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await signIn(email, password);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось войти");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background p-4">
      {/* Ambient brand glow */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-40 left-1/2 size-[36rem] -translate-x-1/2 rounded-full bg-accent/20 blur-[120px]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute bottom-0 right-0 size-96 translate-x-1/3 translate-y-1/3 rounded-full bg-violet-500/15 blur-[100px]"
      />

      <Card className="relative w-full max-w-sm border-border/70 shadow-xl">
        <Card.Header className="items-center pt-8 text-center">
          <span className="flex size-14 items-center justify-center rounded-2xl bg-gradient-to-br from-accent to-violet-500 text-white shadow-lg shadow-accent/30">
            <Volleyball className="size-7" />
          </span>
          <Card.Title className="mt-3 text-xl">Волейбол · Админка</Card.Title>
          <Card.Description>Войдите, чтобы управлять играми</Card.Description>
        </Card.Header>
        <Card.Content>
          <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
            <AppInput
              label="Email"
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              value={email}
              onChange={setEmail}
              isRequired
            />
            <AppInput
              label="Пароль"
              type="password"
              autoComplete="current-password"
              placeholder="••••••••"
              value={password}
              onChange={setPassword}
              isRequired
            />
            {error && (
              <div className="rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger-soft-foreground">
                {error}
              </div>
            )}
            <Button variant="primary" type="submit" isPending={loading} fullWidth>
              Войти
            </Button>
          </form>
        </Card.Content>
      </Card>
    </div>
  );
}
