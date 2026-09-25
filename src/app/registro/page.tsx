import { register } from "@/actions/auth";
import { AuthForm } from "@/components/AuthForm";

export default function RegisterPage() {
  return (
    <AuthForm
      action={register}
      title="Crear cuenta"
      submitLabel="Crear cuenta"
      alternate={{ href: "/login", label: "Ya tengo cuenta" }}
    />
  );
}
