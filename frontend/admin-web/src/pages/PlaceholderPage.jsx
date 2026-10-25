function PlaceholderPage({ title }) {
  return (
    <div className="placeholder-page">
      <h1>{title}</h1>

      <div className="notice">
        <h2>{title} Management</h2>

        <p>
          This module will be developed
          in its scheduled NEXORA phase.
        </p>
      </div>
    </div>
  );
}

export default PlaceholderPage;
