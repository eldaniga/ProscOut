import { login } from "@/actions/auth";
import { AuthForm } from "@/components/AuthForm";
import {
  DEFAULT_EMAIL,
  DEFAULT_PASSWORD,
  ensureDefaultUser,
} from "@/lib/default-user";

export default async function LoginPage() {
  await ensureDefaultUser();

  return (
    <AuthForm
      action={login}
      title="Entrar"
      submitLabel="Entrar"
      alternate={{ href: "/registro", label: "Crear una cuenta" }}
      defaults={{ email: DEFAULT_EMAIL, password: DEFAULT_PASSWORD }}
    />
  );
}
