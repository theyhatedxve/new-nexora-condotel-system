import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
} from "react";

import {
  Link,
  useSearchParams,
} from "react-router";

import { useStaffData } from "../hooks/useStaffData";

import {
  listReconciliationPage,
  parseReconciliationPagesQuery,
  reconciliationPagesSearch,
} from "../services/reconciliationApi";

import StaffDataState from "../components/StaffDataState";
import ReconciliationActions from "../components/ReconciliationActions";

import {
  formatPesos,
  formatStatus,
  formatTimestamp,
} from "../utils/formatters";

function QueueTable({
  label,
  caption,
  headings,
  children,
}) {
  return (
    <div
      className="records-scroll"
      role="region"
      aria-label={label}
      tabIndex={0}
    >
      <table className="records-table">
        <caption>{caption}</caption>

        <thead>
          <tr>
            {headings.map((heading) => (
              <th key={heading} scope="col">
                {heading}
              </th>
            ))}
          </tr>
        </thead>

        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

function QueueSection({
  name,
  title,
  headingRef,
  meta,
  onPage,
  children,
}) {
  const start = meta.total === 0
    ? 0
    : (meta.page - 1) * meta.limit + 1;

  const end = Math.min(
    meta.page * meta.limit,
    meta.total,
  );

  return (
    <section
      className="record-section"
      aria-labelledby={name + "-queue-title"}
    >
      <h2
        id={name + "-queue-title"}
        ref={headingRef}
        tabIndex={-1}
      >
        {title}
      </h2>

      <p role="status">
        {meta.total === 0
          ? "No records in this queue."
          : (
              "Showing " +
              start +
              "–" +
              end +
              " of " +
              meta.total +
              " records."
            )}
      </p>

      {meta.total > 0 && (
        <>
          {children}

          <nav
            className="reconciliation-pagination"
            aria-label={title + " pages"}
          >
            <button
              type="button"
              disabled={meta.page <= 1}
              onClick={() =>
                onPage(name, meta.page - 1)
              }
            >
              Previous
            </button>

            <span>
              Page {meta.page} of {meta.totalPages}
            </span>

            <button
              type="button"
              disabled={
                meta.page >=
                Math.min(meta.totalPages, 10000)
              }
              onClick={() =>
                onPage(name, meta.page + 1)
              }
            >
              Next
            </button>
          </nav>

          {meta.totalPages > 10000 && (
            <p>
              Pages beyond 10,000 are unavailable in this view.
            </p>
          )}
        </>
      )}
    </section>
  );
}

function ReconciliationQueues({
  query,
  onPage,
  onNormalize,
  onLimit,
}) {
  const state = useStaffData(
    listReconciliationPage,
    query,
  );

  const paymentHeading = useRef(null);
  const refundHeading = useRef(null);
  const eventHeading = useRef(null);
  const focusQueue = useRef(null);

  const data =
    state.status === "ready" ? state.data : null;

  const pagesCurrent = Boolean(
    data &&
    data.pagination.payments.page === query.paymentPage &&
    data.pagination.refunds.page === query.refundPage &&
    data.pagination.events.page === query.eventPage,
  );

  useEffect(() => {
    if (data && !pagesCurrent) {
      onNormalize({
        paymentPage: data.pagination.payments.page,
        refundPage: data.pagination.refunds.page,
        eventPage: data.pagination.events.page,
      });
    }
  }, [data, pagesCurrent, onNormalize]);

  useEffect(() => {
    if (!data || !pagesCurrent || !focusQueue.current) {
      return;
    }

    const headings = {
      payments: paymentHeading,
      refunds: refundHeading,
      events: eventHeading,
    };

    headings[focusQueue.current]?.current?.focus();
    focusQueue.current = null;
  }, [data, pagesCurrent]);

  function navigate(name, page) {
    focusQueue.current = name;
    onPage(name, page);
  }

  return (
    <>
      <div className="records-heading">
        <button
          type="button"
          onClick={state.reload}
          disabled={state.loading}
        >
          Refresh review queues
        </button>

        <div className="reconciliation-page-size">
          <label htmlFor="reconciliation-page-size">
            Records per queue page
          </label>
          <select
            id="reconciliation-page-size"
            value={String(query.limit)}
            onChange={(event) =>
              onLimit(Number(event.target.value))
            }
          >
            <option value="20">20</option>
            <option value="50">50</option>
          </select>
        </div>
      </div>

      <p>
        Older records appear first. Each queue has its
        own page selection.
      </p>

      <StaffDataState
        state={state}
        label="Reconciliation queues"
      />

      {data && (
        <>
          <QueueSection
            name="payments"
            title="Payment records for review"
            headingRef={paymentHeading}
            meta={data.pagination.payments}
            onPage={navigate}
          >
            <QueueTable
              label="Payment review table"
              caption="PayMongo payment records selected for review"
              headings={[
                "Payment record",
                "Reservation",
                "Stored status",
                "Checkout state",
                "Stored amount",
                "Created",
              ]}
            >
              {data.payments.map((item) => (
                <tr key={item.id}>
                  <td>
                    <Link
                      to={
                        "/payments/" +
                        encodeURIComponent(item.id)
                      }
                    >
                      {item.id}
                    </Link>
                  </td>

                  <td>
                    <Link
                      to={
                        "/reservations/" +
                        encodeURIComponent(item.reservationId)
                      }
                    >
                      View reservation
                    </Link>
                  </td>

                  <td>{formatStatus(item.status)}</td>

                  <td>
                    {item.checkoutState
                      ? formatStatus(item.checkoutState)
                      : "Not recorded"}
                  </td>

                  <td>
                    {item.currency === "PHP"
                      ? formatPesos(item.amountCentavos)
                      : item.currency + " — review required"}
                  </td>

                  <td>{formatTimestamp(item.createdAt)}</td>
                </tr>
              ))}
            </QueueTable>
          </QueueSection>

          <QueueSection
            name="refunds"
            title="Pending PayMongo refunds"
            headingRef={refundHeading}
            meta={data.pagination.refunds}
            onPage={navigate}
          >
            <QueueTable
              label="Pending refund review table"
              caption="Pending refunds awaiting review"
              headings={[
                "Refund record",
                "Related payment",
                "Provider refund reference",
                "Stored status",
                "Stored amount, centavos",
                "Requested",
              ]}
            >
              {data.refunds.map((item) => (
                <tr key={item.id}>
                  <td>{item.id}</td>

                  <td>
                    <Link
                      to={
                        "/payments/" +
                        encodeURIComponent(item.paymentId)
                      }
                    >
                      View payment
                    </Link>
                  </td>

                  <td>
                    {item.providerRefundId || "Not recorded"}
                  </td>

                  <td>{formatStatus(item.status)}</td>

                  <td>
                    {item.amountCentavos.toLocaleString(
                      "en-PH",
                    )}
                  </td>

                  <td>{formatTimestamp(item.requestedAt)}</td>
                </tr>
              ))}
            </QueueTable>
          </QueueSection>

          <QueueSection
            name="events"
            title="Event records for review"
            headingRef={eventHeading}
            meta={data.pagination.events}
            onPage={navigate}
          >
            <QueueTable
              label="Event review table"
              caption="Payment and refund events selected for review"
              headings={[
                "Event reference",
                "Related payment",
                "Event type",
                "Stored status",
                "Review note",
                "Created",
              ]}
            >
              {data.events.map((item) => (
                <tr key={item.providerEventId}>
                  <td>{item.providerEventId}</td>

                  <td>
                    {item.paymentId ? (
                      <Link
                        to={
                          "/payments/" +
                          encodeURIComponent(item.paymentId)
                        }
                      >
                        View payment
                      </Link>
                    ) : (
                      "Not linked to a payment"
                    )}
                  </td>

                  <td>{item.eventType}</td>
                  <td>{formatStatus(item.status)}</td>
                  <td>{item.reviewReason}</td>
                  <td>{formatTimestamp(item.createdAt)}</td>
                </tr>
              ))}
            </QueueTable>
          </QueueSection>
        </>
      )}

      <ReconciliationActions queue={state} />
    </>
  );
}

export default function PaymentReconciliation() {
  const [searchParams, setSearchParams] =
    useSearchParams();

  const queryKey = searchParams.toString();

  const parsed = useMemo(() => {
    try {
      return {
        query: parseReconciliationPagesQuery(queryKey),
        error: "",
      };
    } catch (failure) {
      return {
        query: null,
        error: failure.message,
      };
    }
  }, [queryKey]);

  const changePage = useCallback(
    (name, page) => {
      if (!parsed.query) return;

      const fields = {
        payments: "paymentPage",
        refunds: "refundPage",
        events: "eventPage",
      };

      const field = fields[name];

      if (!field) return;

      setSearchParams(
        reconciliationPagesSearch({
          ...parsed.query,
          [field]: page,
        }),
      );
    },
    [parsed.query, setSearchParams],
  );

  const normalizePages = useCallback(
    (pages) => {
      if (!parsed.query) return;

      setSearchParams(
        reconciliationPagesSearch({
          ...parsed.query,
          ...pages,
        }),
        { replace: true },
      );
    },
    [parsed.query, setSearchParams],
  );

  function changeLimit(limit) {
    setSearchParams(
      reconciliationPagesSearch({
        paymentPage: 1,
        refundPage: 1,
        eventPage: 1,
        limit,
      }),
    );
  }

  return (
    <section aria-labelledby="reconciliation-title">
      <Link to="/payments">Return to payments</Link>

      <h1 id="reconciliation-title">
        Payment reconciliation
      </h1>

      <p>
        Review existing payment attempts, pending refunds,
        and event records. Queue membership does not
        establish payment or refund completion.
      </p>

      {parsed.error ? (
        <div className="feedback">
          <p role="alert">{parsed.error}</p>

          <button
            type="button"
            onClick={() => setSearchParams("")}
          >
            Clear invalid pagination
          </button>
        </div>
      ) : (
        <ReconciliationQueues
          query={parsed.query}
          onPage={changePage}
          onNormalize={normalizePages}
          onLimit={changeLimit}
        />
      )}
    </section>
  );
}