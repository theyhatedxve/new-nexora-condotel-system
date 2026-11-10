import reconciliationQueueRange from "../../../utils/reconciliationQueueRange.js";

export function QueueSection({ name, title, headingRef, meta, onPage, children }) {
  const { start, end, previousPage, nextPage } = reconciliationQueueRange({
    meta,
    onPage,
    name,
  });

  return (
    <section className="record-section" aria-labelledby={name + "-queue-title"}>
      <h2 id={name + "-queue-title"} ref={headingRef} tabIndex={-1}>
        {title}
      </h2>

      <p role="status">
        {meta.total === 0
          ? "No records in this queue."
          : "Showing " + start + "–" + end + " of " + meta.total + " records."}
      </p>

      {meta.total > 0 && (
        <>
          {children}

          <nav className="reconciliation-pagination" aria-label={title + " pages"}>
            <button type="button" disabled={meta.page <= 1} onClick={previousPage}>
              Previous
            </button>

            <span>
              Page {meta.page} of {meta.totalPages}
            </span>

            <button
              type="button"
              disabled={meta.page >= Math.min(meta.totalPages, 10000)}
              onClick={nextPage}
            >
              Next
            </button>
          </nav>

          {meta.totalPages > 10000 && (
            <p>Pages beyond 10,000 are unavailable in this view.</p>
          )}
        </>
      )}
    </section>
  );
}
