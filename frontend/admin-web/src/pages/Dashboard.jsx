export default function Dashboard() {
  return (
    <section aria-labelledby="dashboard-title">
      <p className="eyebrow">
        Staff workspace
      </p>

      <h1 id="dashboard-title">
        Dashboard
      </h1>

      <div className="content-card">
        <h2>Welcome to NEXORA</h2>

        <p>
          Choose an area from the navigation to view
          its current availability.
        </p>

        <p>
          Operational summaries are not available yet.
        </p>
      </div>
    </section>
  );
}