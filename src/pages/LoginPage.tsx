import { useState, type FormEvent } from "react";
import { Button, Card } from "@heroui/react";
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
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-sm">
        <Card.Header>
          <Card.Title>🏐 Волейбол · Админка</Card.Title>
          <Card.Description>Войдите, чтобы управлять играми</Card.Description>
        </Card.Header>
        <Card.Content>
          <form className="flex flex-col gap-3" onSubmit={handleSubmit}>
            <AppInput
              label="Email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={setEmail}
              isRequired
            />
            <AppInput
              label="Пароль"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={setPassword}
              isRequired
            />
            {error && <div className="text-sm text-danger">{error}</div>}
            <Button
              variant="primary"
              type="submit"
              isPending={loading}
              fullWidth
            >
              Войти
            </Button>
          </form>
        </Card.Content>
      </Card>
    </div>
  );
}
