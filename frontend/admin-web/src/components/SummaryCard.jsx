export default function SummaryCard({ title, value, description, children }) {
  return (
    <article className="summary-card">
      <h2>{title}</h2>

      <p className="summary-value">{value}</p>

      <p className="summary-description">{description}</p>

      {children}
    </article>
  );
}
