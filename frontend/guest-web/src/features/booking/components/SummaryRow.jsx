export function SummaryRow({ label, children }) {
  return (
    <div className="my-booking__row">
      <dt>{label}</dt>
      <dd>{children}</dd>
    </div>
  );
}
