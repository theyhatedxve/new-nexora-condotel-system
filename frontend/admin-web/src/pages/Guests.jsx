import { Link } from "react-router";
import { ArrowRight } from "lucide-react";

import { useAuth } from "../auth/useAuth";
import useGuestsPage from "../hooks/useGuestsPage.js";
import { GuestFilters } from "../components/guests/GuestFilters.jsx";
import { GuestResults } from "../components/guests/GuestResults.jsx";

import "../styles/guests.css";
import "../styles/guest-workspace.css";

export default function Guests() {
  const { user } = useAuth();

  const {
    queryKey,
    parsed,
    changePage,
    clearFilters,
    changeSearchParams,
  } = useGuestsPage();

  const canViewAccounts = ["SUPER_ADMIN", "ADMIN"].includes(
    user?.role,
  );

  return (
    <section
      className="guests-screen guest-ui"
      aria-labelledby="guests-title"
    >
      <header className="guest-ui__toolbar">
        <div>
          <h1 id="guests-title" className="guest-ui__sr-only">
            Guests
          </h1>

          <p className="guest-ui__intro">
            Find guests with reservations at this property.
          </p>
        </div>

        {canViewAccounts && (
          <Link
            className="guest-ui__outline-link"
            to="/guest-accounts"
          >
            Guest Accounts
            <ArrowRight size={17} aria-hidden="true" />
          </Link>
        )}
      </header>

      {parsed.error ? (
        <div className="feedback">
          <p role="alert">{parsed.error}</p>

          <button
            type="button"
            className="guests-screen__secondary"
            onClick={clearFilters}
          >
            Clear invalid search
          </button>
        </div>
      ) : (
        <>
          <GuestFilters
            key={queryKey}
            query={parsed.query}
            onApply={changeSearchParams}
            onClear={clearFilters}
          />

          <GuestResults
            query={parsed.query}
            onPage={changePage}
          />
        </>
      )}
    </section>
  );
}