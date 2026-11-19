// The backend stores money as whole centavos (PHP 2,500.00 = 250000).
// This only formats a backend value for display. It never calculates a price.
const pesoFormatter = new Intl.NumberFormat("en-PH", {
  style: "currency",
  currency: "PHP",
});

export function formatPesos(centavos) {
  return pesoFormatter.format(centavos / 100);
}