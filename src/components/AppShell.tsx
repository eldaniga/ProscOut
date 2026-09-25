"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { logout } from "@/actions/auth";

const links = [
  { href: "/", label: "Hoy" },
  { href: "/semana", label: "Semana" },
  { href: "/mes", label: "Mes" },
  { href: "/ano", label: "Año" },
];

const menuLinks = [
  { href: "/actividades/lista", label: "Mis actividades" },
  { href: "/alimentacion", label: "Alimentación" },
  { href: "/configuracion", label: "Configuración" },
];

export function AppShell({
  name,
  children,
}: {
  name: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <div className="mx-auto flex min-h-full w-full max-w-5xl flex-col overflow-x-hidden px-4 py-6">
      <header className="mb-8 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm font-medium text-zinc-500">ProscOut</p>
        <nav className="order-last flex w-full gap-1 overflow-x-auto sm:order-none sm:w-auto">
          {links.map((link) => {
            const active =
              link.href === "/"
                ? pathname === "/"
                : pathname.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`rounded-full px-3 py-1.5 text-sm ${
                  active
                    ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                    : "text-zinc-600 hover:bg-zinc-200/70 dark:text-zinc-300 dark:hover:bg-zinc-800"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>
        <button
          type="button"
          aria-label="Abrir menú"
          aria-expanded={open}
          onClick={() => setOpen((value) => !value)}
          className="flex h-10 w-10 flex-col items-center justify-center gap-1.5 rounded-full hover:bg-zinc-200/70 dark:hover:bg-zinc-800"
        >
          <span className="block h-0.5 w-5 bg-current" />
          <span className="block h-0.5 w-5 bg-current" />
          <span className="block h-0.5 w-5 bg-current" />
        </button>
      </header>
      {open ? (
        <div className="fixed inset-0 z-20" onClick={() => setOpen(false)}>
          <aside
            className="absolute top-0 right-0 flex h-full w-72 flex-col gap-2 border-l border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950"
            onClick={(event) => event.stopPropagation()}
          >
            <p className="text-sm text-zinc-500">ProscOut</p>
            <p className="mb-4 font-medium">{name}</p>
            {menuLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className="rounded-lg px-3 py-2 text-sm hover:bg-zinc-100 dark:hover:bg-zinc-900"
              >
                {link.label}
              </Link>
            ))}
            <form action={logout} className="mt-auto">
              <button
                type="submit"
                className="rounded-lg px-3 py-2 text-sm text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-900"
              >
                Salir
              </button>
            </form>
          </aside>
        </div>
      ) : null}
      <main className="min-w-0 flex-1">{children}</main>
    </div>
  );
}
