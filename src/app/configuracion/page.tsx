import { SearchPhotosSetting } from "@/components/SearchPhotosSetting";

export default function SettingsPage() {
  return (
    <section className="flex max-w-lg flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Configuración</h1>
        <p className="mt-1 text-sm text-zinc-500">Opciones de la aplicación.</p>
      </div>
      <SearchPhotosSetting />
    </section>
  );
}
