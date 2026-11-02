import { Link } from "react-router";

export default function PlaceholderPage({ title }) {
  return (
    <section>
      <h1>{title}</h1>

      <div className="content-card">
        <h2>
          {title === "Page not found"
            ? "This page could not be found"
            : "This area is not available yet"}
        </h2>

        <p>
          No records or actions are available on this page.
        </p>

        <Link to="/">
          Return to dashboard
        </Link>
      </div>
    </section>
  );
}