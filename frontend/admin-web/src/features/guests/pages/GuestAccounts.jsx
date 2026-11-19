import { useEffect, useMemo, useRef } from "react";
import { Link, useSearchParams } from "react-router";
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Search,
} from "lucide-react";

import StaffDataState from "../../../shared/components/StaffDataState.jsx";
import { useStaffData } from "../../../shared/hooks/useStaffData.js";
import {
  GUEST_ACCOUNT_STATUSES,
  GUEST_ACCOUNT_STATUS_LABELS,
  listGuestAccounts,
} from "../services/guestAccountsApi.js";

import "../../users/styles/staff-users.css";
import "../styles/guest-accounts.css";
import "../styles/guest-workspace.css";

const registrationDate = new Intl.DateTimeFormat("en-PH", {
  dateStyle: "medium",
  timeStyle: "short",
});

function readFilters(search) {
  const params = new URLSearchParams(search);
  const pageText = params.get("page") ?? "1";
  const requestedPage = /^\d+$/.test(pageText)
    ? Number(pageText)
    : 1;

  return {
    q: (params.get("q") ?? "").trim().slice(0, 100),
    status: GUEST_ACCOUNT_STATUSES.includes(params.get("status"))
      ? params.get("status")
      : "",
    page:
      Number.isSafeInteger(requestedPage) &&
      requestedPage >= 1 &&
      requestedPage <= 10000
        ? requestedPage
        : 1,
    limit: params.get("limit") === "50" ? 50 : 20,
  };
}

export default function GuestAccounts() {
  const [searchParams, setSearchParams] = useSearchParams();
  const search = searchParams.toString();
  const filters = useMemo(() => readFilters(search), [search]);

  const loader = useMemo(
    () => (signal) => listGuestAccounts(filters, signal),
    [filters],
  );

  const directory = useStaffData(loader);
  const data = directory.status === "ready" ? directory.data : null;

  const resultSummary = useRef(null);
  const focusResults = useRef(false);

  useEffect(() => {
    if (directory.status === "ready" && focusResults.current) {
      resultSummary.current?.focus();
      focusResults.current = false;
    }
  }, [directory.status, directory.data]);

  function applyFilters(event) {
    event.preventDefault();

    const form = new FormData(event.currentTarget);
    const next = new URLSearchParams();

    const q = String(form.get("q") ?? "").trim();
    const status = String(form.get("status") ?? "");

    if (q) next.set("q", q);
    if (status) next.set("status", status);

    next.set("limit", String(form.get("limit") ?? "20"));
    next.set("page", "1");

    focusResults.current = true;
    setSearchParams(next);
  }

  function clearFilters() {
    focusResults.current = true;
    setSearchParams("");
  }

  function refreshResults() {
    focusResults.current = true;
    directory.reload();
  }

  function changePage(page) {
    const next = new URLSearchParams();

    if (filters.q) next.set("q", filters.q);
    if (filters.status) next.set("status", filters.status);

    next.set("limit", String(filters.limit));
    next.set("page", String(page));

    focusResults.current = true;
    setSearchParams(next);
  }

  const start = data?.items.length
    ? (data.page - 1) * data.limit + 1
    : 0;
  const end = data?.items.length
    ? start + data.items.length - 1
    : 0;

  return (
    <section
      className="staff-users guest-accounts guest-ui"
      aria-labelledby="guest-accounts-title"
    >
            <header className="guest-ui__toolbar">
        <div>
          <h1
            id="guest-accounts-title"
            className="guest-ui__sr-only"
          >
            Guest Accounts
          </h1>

          <p className="guest-ui__intro">
            All registered guest accounts, including accounts without bookings.
          </p>
        </div>

        <div className="guest-ui__actions">
          <Link className="guest-ui__outline-link" to="/guests">
            <ArrowLeft size={17} aria-hidden="true" />
            Guest Directory
          </Link>

          <button
            type="button"
            className="staff-users__secondary"
            disabled={directory.loading}
            onClick={refreshResults}
          >
            <RefreshCw size={16} aria-hidden="true" />
            {directory.loading ? "Refreshing…" : "Refresh"}
          </button>
        </div>
      </header>

      <form
        key={search}
        className="staff-users__filters guest-accounts__filters"
        aria-label="Filter guest accounts"
        onSubmit={applyFilters}
      >
        <label>
          Search accounts
          <input
            name="q"
            type="search"
            maxLength={100}
            defaultValue={filters.q}
            placeholder="Name or email"
          />
        </label>

        <label>
          Status
          <select name="status" defaultValue={filters.status}>
            <option value="">All statuses</option>
            {GUEST_ACCOUNT_STATUSES.map((status) => (
              <option key={status} value={status}>
                {GUEST_ACCOUNT_STATUS_LABELS[status]}
              </option>
            ))}
          </select>
        </label>

        <label>
          Rows
          <select name="limit" defaultValue={filters.limit}>
            <option value="20">20</option>
            <option value="50">50</option>
          </select>
        </label>

        <div className="staff-users__actions">
          <button type="submit" className="staff-users__primary">
            <Search size={16} aria-hidden="true" />
            Search
          </button>

          <button
            type="button"
            className="staff-users__secondary"
            onClick={clearFilters}
          >
            Clear
          </button>
        </div>
      </form>

      <StaffDataState state={directory} label="Guest accounts" />

      {data && (
        <>
          <p
            ref={resultSummary}
            role="status"
            tabIndex={-1}
            className="guest-accounts__summary"
          >
            {data.total === 0
              ? "No guest accounts match the applied filters."
              : `Showing ${start}-${end} of ${data.total} guest accounts.`}
          </p>

          {data.items.length > 0 && (
            <>
              <div
                className="staff-users__table"
                role="region"
                aria-label="Guest accounts table"
                tabIndex={0}
              >
                <table>
                  <caption>
                    Registered guest accounts, newest first.
                    Registration times use your browser's time zone.
                  </caption>

                  <thead>
                    <tr>
                      <th scope="col">Name</th>
                      <th scope="col">Email</th>
                      <th scope="col">Status</th>
                      <th scope="col">Registered</th>
                    </tr>
                  </thead>

                  <tbody>
                    {data.items.map((account) => (
                      <tr key={account.id}>
                        <th scope="row">
                          {account.name || "Name unavailable"}
                        </th>

                        <td>{account.email}</td>

                        <td>
                          <span
                            className={
                              "staff-users__badge staff-users__badge--" +
                              account.status.toLowerCase()
                            }
                          >
                            {GUEST_ACCOUNT_STATUS_LABELS[account.status]}
                          </span>
                        </td>

                        <td>
                          <time dateTime={account.createdAt}>
                            {registrationDate.format(
                              new Date(account.createdAt),
                            )}
                          </time>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <nav
                className="staff-users__pagination"
                aria-label="Guest account pages"
              >
                <button
                  type="button"
                  className="staff-users__secondary"
                  disabled={data.page <= 1}
                  onClick={() => changePage(data.page - 1)}
                >
                  <ChevronLeft size={16} aria-hidden="true" />
                  Previous
                </button>

                <span>
                  Page {data.page} of {data.totalPages}
                </span>

                <button
                  type="button"
                  className="staff-users__secondary"
                  disabled={
                    data.page >= Math.min(data.totalPages, 10000)
                  }
                  onClick={() => changePage(data.page + 1)}
                >
                  Next
                  <ChevronRight size={16} aria-hidden="true" />
                </button>
              </nav>

              {data.totalPages > 10000 && (
                <p>
                  Narrow the search to access results beyond page 10000.
                </p>
              )}
            </>
          )}
        </>
      )}
    </section>
  );
}