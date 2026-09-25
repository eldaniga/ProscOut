"use client";

import { useEffect, useState } from "react";

export const SEARCH_PHOTOS_KEY = "search-photos";

export function searchPhotosEnabled() {
  try {
    return localStorage.getItem(SEARCH_PHOTOS_KEY) !== "0";
  } catch {
    return true;
  }
}

export function SearchPhotosSetting() {
  const [photos, setPhotos] = useState(true);

  useEffect(() => {
    setPhotos(searchPhotosEnabled());
  }, []);

  function change(checked: boolean) {
    setPhotos(checked);
    localStorage.setItem(SEARCH_PHOTOS_KEY, checked ? "1" : "0");
  }

  return (
    <label className="flex items-center justify-between gap-4 rounded-xl border border-zinc-200 px-4 py-3 text-sm dark:border-zinc-800">
      <span>Fotos en la búsqueda de alimentos</span>
      <input
        type="checkbox"
        checked={photos}
        onChange={(event) => change(event.target.checked)}
        className="h-4 w-4"
      />
    </label>
  );
}
