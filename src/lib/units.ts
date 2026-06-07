/**
 * Converte quantità da metrico (g, ml) a imperiale (oz, fl oz).
 * @param qty Quantità numerica in metrico.
 * @param unit Unità in metrico ("g", "ml").
 */
export function convertToImperial(qty: number, unit: string): { quantity: number; unit: string } {
  const normalizedUnit = unit.toLowerCase().trim();
  if (normalizedUnit === "g") {
    // 1 oz = 28.34952 g
    const oz = qty / 28.34952;
    return { quantity: Number(oz.toFixed(1)), unit: "oz" };
  }
  if (normalizedUnit === "ml") {
    // 1 fl oz = 29.57353 ml
    const flOz = qty / 29.57353;
    return { quantity: Number(flOz.toFixed(1)), unit: "fl oz" };
  }
  return { quantity: qty, unit };
}
