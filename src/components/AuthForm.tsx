"use client";

import { useActionState } from "react";
import type { AuthFormState } from "@/actions/auth";

export function AuthForm({
  action,
  title,
  submitLabel,
  alternate,
  defaults,
}: {
  action: (prev: AuthFormState, formData: FormData) => Promise<AuthFormState>;
  title: string;
  submitLabel: string;
  alternate: { href: string; label: string };
  defaults?: { email: string; password: string };
}) {
  const [state, formAction, pending] = useActionState(action, { error: "" });

  return (
    <main className="mx-auto flex min-h-full w-full max-w-md flex-col justify-center px-4 py-16">
      <p className="text-sm text-zinc-500">ProscOut</p>
      <h1 className="mt-1 text-2xl font-semibold">{title}</h1>
      <form action={formAction} className="mt-8 flex flex-col gap-4">
        {title === "Crear cuenta" ? (
          <label className="flex flex-col gap-1 text-sm">
            Nombre
            <input
              name="name"
              required
              autoComplete="name"
              className="rounded-lg border border-zinc-300 bg-transparent px-3 py-2 dark:border-zinc-700"
            />
          </label>
        ) : null}
        <label className="flex flex-col gap-1 text-sm">
          Email
          <input
            name="email"
            type="email"
            required
            autoComplete="email"
            defaultValue={defaults?.email}
            className="rounded-lg border border-zinc-300 bg-transparent px-3 py-2 dark:border-zinc-700"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Contraseña
          <input
            name="password"
            type="password"
            required
            minLength={title === "Crear cuenta" ? 8 : undefined}
            autoComplete={
              title === "Crear cuenta" ? "new-password" : "current-password"
            }
            defaultValue={defaults?.password}
            className="rounded-lg border border-zinc-300 bg-transparent px-3 py-2 dark:border-zinc-700"
          />
        </label>
        {state.error ? (
          <p className="text-sm text-red-600">{state.error}</p>
        ) : null}
        <button
          type="submit"
          disabled={pending}
          className="rounded-full bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900"
        >
          {pending ? "Espera…" : submitLabel}
        </button>
      </form>
      {defaults ? (
        <p className="mt-6 text-sm text-zinc-500">
          Cuenta de prueba: {defaults.email} / {defaults.password}
        </p>
      ) : null}
      <a href={alternate.href} className="mt-6 text-sm text-zinc-500 underline">
        {alternate.label}
      </a>
    </main>
  );
}
