export function unitGramsForName(name) {
  const folded = name.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
  const wholeEgg =
    folded.startsWith("huevo") &&
    !folded.includes("clara") &&
    !folded.includes("yema") &&
    !folded.includes("desecad");
  if (wholeEgg) return 50;
  if (folded === "manzana") return 180;
  if (folded === "platano") return 120;
  if (folded === "naranja") return 150;
  if (folded === "kiwi") return 75;
  if (folded === "pera") return 160;
  return null;
}
