import { useAuth } from "../auth/useAuth";

import {
  useDashboardSummary,
} from "../hooks/useDashboardSummary";

import SummaryCard from "../components/SummaryCard";

const money = new Intl.NumberFormat("en-PH", {
  style: "currency",
  currency: "PHP",
});

const timestamp = new Intl.DateTimeFormat("en-PH", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Asia/Manila",
});

const cards = [
  [
    "totalRooms",
    "Total rooms",
    "All configured physical rooms, including inactive rooms.",
  ],
  [
    "occupiedRooms",
    "Occupied rooms",
    "Distinct rooms assigned to checked-in stays, including overdue stays.",
  ],
  [
    "activeReservations",
    "Active reservations",
    "Confirmed and checked-in reservations, plus unexpired pending holds.",
  ],
  [
    "expectedArrivals",
    "Expected arrivals today",
    "Confirmed reservations scheduled to arrive today.",
  ],
  [
    "expectedDepartures",
    "Expected departures today",
    "Checked-in reservations scheduled to leave today.",
  ],
];

export default function Dashboard() {
  const { user } = useAuth();

  const {
    operations,
    financial,
    loading,
    refresh,
  } = useDashboardSummary(user.role);

  const finance = financial.data;

  const empty =
    operations.status === "ready" &&
    cards.every(
      ([key]) => operations.data[key] === 0,
    );

  return (
    <section aria-labelledby="dashboard-title">
      <div className="dashboard-heading">
        <div>
          <p className="eyebrow">
            Staff workspace
          </p>

          <h1 id="dashboard-title">
            Dashboard
          </h1>
        </div>

        <button
          type="button"
          onClick={refresh}
          disabled={loading}
        >
          {loading
            ? "Refreshing…"
            : "Refresh summaries"}
        </button>
      </div>

      <p className="dashboard-context">
        Today uses Philippine time (Asia/Manila).
      </p>

      {loading && (
        <p role="status">
          Loading summaries…
        </p>
      )}

      {operations.status === "error" && (
        <p role="alert" className="feedback">
          Operational summaries could not be loaded.
          Try Refresh summaries.
        </p>
      )}

      {operations.status === "ready" && (
        <p className="summary-updated">
          Operational figures as of{" "}
          {timestamp.format(
            new Date(operations.data.asOf),
          )}
          .
        </p>
      )}

      {empty && (
        <p role="status">
          No operational records currently match
          these summaries.
        </p>
      )}

      <div className="summary-grid">
        {cards.map(
          ([key, title, description]) => (
            <SummaryCard
              key={key}
              title={title}
              value={
                operations.status === "ready"
                  ? operations.data[key].toLocaleString(
                      "en-PH",
                    )
                  : operations.status === "error"
                    ? "Unavailable"
                    : "Loading…"
              }
              description={description}
            />
          ),
        )}

        {financial.status !== "hidden" && (
          <SummaryCard
            title="Net collections today"
            value={
              financial.status === "loading"
                ? "Loading…"
                : financial.status === "error"
                  ? "Unavailable"
                  : finance.status === "REVIEW_REQUIRED"
                    ? "Review required"
                    : money.format(
                        finance.netCollectionsCentavos /
                          100,
                      )
            }
            description="Verified receipts minus completed refunds today, before provider fees."
          >
            {financial.status === "error" && (
              <p role="alert">
                Financial summary could not be loaded.
                Try Refresh summaries.
              </p>
            )}

            {finance?.status === "REVIEW_REQUIRED" && (
              <p role="alert">
                Relevant payment records require
                financial review. Totals are unavailable.
              </p>
            )}

            {finance?.status === "READY" && (
              <dl className="summary-breakdown">
                <div>
                  <dt>Verified receipts</dt>
                  <dd>
                    {money.format(
                      finance.collectionsCentavos / 100,
                    )}
                  </dd>
                </div>

                <div>
                  <dt>Completed refunds</dt>
                  <dd>
                    {money.format(
                      finance.refundsCentavos / 100,
                    )}
                  </dd>
                </div>
              </dl>
            )}

            {finance && (
              <p className="summary-updated">
                Financial figures as of{" "}
                {timestamp.format(
                  new Date(finance.asOf),
                )}
                .
              </p>
            )}
          </SummaryCard>
        )}
      </div>
    </section>
  );
}