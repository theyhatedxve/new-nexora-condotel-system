import {
  useMemo,
  useState,
} from "react";

import {
  useSearchParams,
} from "react-router";

import SummaryCard from "../components/SummaryCard";

import StaffDataState from "../components/StaffDataState";

import {
  useStaffData,
} from "../hooks/useStaffData";

import {
  getDashboardSummary,
} from "../services/dashboardApi";

import {
  getCollectionsReport,
  parseReportQuery,
  reportSearch,
  reportToday,
  validateReportRange,
} from "../services/reportsApi";

import "../styles/reports.css";

const money = new Intl.NumberFormat("en-PH", {
  style: "currency",
  currency: "PHP",
});

const timestamp = new Intl.DateTimeFormat("en-PH", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Asia/Manila",
});

const operationalCards = [
  [
    "totalRooms",
    "Total rooms",
    "All configured physical rooms, including inactive rooms.",
  ],
  [
    "occupiedRooms",
    "Occupied rooms",
    "Distinct current assignments for checked-in stays, including overdue stays.",
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

const financialCards = [
  [
    "collectionsCentavos",
    "Verified collections",
    "Verified or recorded receipts paid within the selected dates.",
  ],
  [
    "refundsCentavos",
    "Completed refunds",
    "Refunds completed within the selected dates, including refunds of older receipts.",
  ],
  [
    "netCollectionsCentavos",
    "Net collections",
    "Verified collections minus completed refunds, before provider fees.",
  ],
];

function CurrentOccupancy() {
  const state = useStaffData(
    getDashboardSummary,
  );

  return (
    <section
      className="reports-section"
      aria-labelledby="occupancy-report-title"
    >
      <div className="reports-heading">
        <div>
          <h2 id="occupancy-report-title">
            Current occupancy snapshot
          </h2>

          <p>
            These figures describe the current
            state. The financial date filters
            below do not change this snapshot.
          </p>
        </div>

        <button
          type="button"
          onClick={state.reload}
          disabled={state.loading}
        >
          Refresh snapshot
        </button>
      </div>

      <StaffDataState
        state={state}
        label="the current occupancy snapshot"
      />

      {state.status === "ready" && (
        <>
          <p>
            Philippine date: {state.data.date}.
            {" "}Updated{" "}
            {timestamp.format(
              new Date(state.data.asOf),
            )}
            .
          </p>

          <div className="summary-grid">
            {operationalCards.map(
              ([key, title, description]) => (
                <SummaryCard
                  key={key}
                  title={title}
                  value={state.data[key].toLocaleString(
                    "en-PH",
                  )}
                  description={description}
                />
              ),
            )}
          </div>
        </>
      )}
    </section>
  );
}

function ReportFilters({
  query,
  onApply,
}) {
  const [error, setError] = useState("");

  function submit(event) {
    event.preventDefault();
    setError("");

    const form = new FormData(
      event.currentTarget,
    );

    try {
      const range = validateReportRange(
        form.get("from"),
        form.get("to"),
      );

      onApply(range);
    } catch (failure) {
      setError(
        failure instanceof Error
          ? failure.message
          : "Check the selected dates.",
      );
    }
  }

  return (
    <form
      className="reports-filters"
      onSubmit={submit}
    >
      <div className="reports-date-field">
        <label htmlFor="report-from">
          From
        </label>

        <input
          id="report-from"
          name="from"
          type="date"
          required
          defaultValue={query.from}
          max={reportToday()}
          aria-describedby="report-range-help"
        />
      </div>

      <div className="reports-date-field">
        <label htmlFor="report-to">
          To
        </label>

        <input
          id="report-to"
          name="to"
          type="date"
          required
          defaultValue={query.to}
          max={reportToday()}
          aria-describedby="report-range-help"
        />
      </div>

      <button type="submit">
        Apply dates
      </button>

      <p
        id="report-range-help"
        className="reports-filter-help"
      >
        Select up to 31 calendar days.
        Both dates are included and use
        Philippine time.
      </p>

      {error && (
        <p
          role="alert"
          className="reports-filter-help feedback"
        >
          {error}
        </p>
      )}
    </form>
  );
}

function CollectionsReport({
  query,
  onApply,
}) {
  const state = useStaffData(
    getCollectionsReport,
    query,
  );

  const data =
    state.status === "ready"
      ? state.data
      : null;

  return (
    <>
      <ReportFilters
        key={`${query.from}:${query.to}`}
        query={query}
        onApply={onApply}
      />

      <div className="reports-heading">
        <p>
          Applied range:{" "}
          <strong>
            {query.from} through {query.to}
          </strong>
          {" "}({query.days}{" "}
          {query.days === 1 ? "day" : "days"}).
        </p>

        <button
          type="button"
          onClick={state.reload}
          disabled={state.loading}
        >
          Refresh collections
        </button>
      </div>

      <StaffDataState
        state={state}
        label="the collections report"
      />

      {data && (
        <>
          <p>
            Calculated{" "}
            {timestamp.format(
              new Date(data.asOf),
            )}
            {" "}(Asia/Manila).
          </p>

          {data.status === "REVIEW_REQUIRED" ? (
            <div
              className="feedback"
              role="alert"
            >
              <h3>Review required</h3>

              <p>
                Relevant financial records
                require review. Totals are
                unavailable and must not be
                interpreted as zero.
              </p>
            </div>
          ) : (
            <>
              <div className="summary-grid">
                {financialCards.map(
                  ([key, title, description]) => (
                    <SummaryCard
                      key={key}
                      title={title}
                      value={money.format(
                        data[key] / 100,
                      )}
                      description={description}
                    />
                  ),
                )}
              </div>

              {data.collectionsCentavos === 0 &&
                data.refundsCentavos === 0 && (
                  <p role="status">
                    No completed collections or
                    refunds match this range.
                  </p>
                )}
            </>
          )}
        </>
      )}
    </>
  );
}

export default function Reports() {
  const [params, setParams] =
    useSearchParams();

  const search = params.toString();
  const today = reportToday();

  const parsed = useMemo(() => {
    try {
      return {
        query: parseReportQuery(search, today),
        error: "",
      };
    } catch (failure) {
      return {
        query: null,
        error:
          failure instanceof Error
            ? failure.message
            : "The report URL is invalid.",
      };
    }
  }, [search, today]);

  function applyRange(query) {
    setParams(reportSearch(query));
  }

  function resetRange() {
    setParams(
      reportSearch({
        from: today,
        to: today,
      }),
      { replace: true },
    );
  }

  return (
    <section className="reports-page">
      <p className="eyebrow">
        Staff workspace
      </p>

      <h1>Reports</h1>

      <p>
        Reports use authorized backend records.
        All calendar dates use Asia/Manila.
      </p>

      <CurrentOccupancy />

      <section
        className="reports-section"
        aria-labelledby="collections-report-title"
      >
        <h2 id="collections-report-title">
          Collections and refunds
        </h2>

        <p>
          Cash movement during the selected
          period, before provider fees.
          These totals do not represent earned
          revenue.
        </p>

        {parsed.query ? (
          <CollectionsReport
            query={parsed.query}
            onApply={applyRange}
          />
        ) : (
          <div className="feedback">
            <p role="alert">
              {parsed.error}
            </p>

            <button
              type="button"
              onClick={resetRange}
            >
              Use today
            </button>
          </div>
        )}
      </section>
    </section>
  );
}