import { useAuth } from "../../auth/useAuth";
import StaffDataState from "../StaffDataState";
import {
  formatPesos,
  formatStatus,
  formatTimestamp,
} from "../../utils/formatters";
import {
  depositStaffRoles,
  depositManagerRoles,
} from "../../services/reservationDepositsApi";
import useReservationDepositForm from "../../hooks/useReservationDepositForm.js";

function Workspace({ user, reservationId, bookingStatus, onReload }) {
  const {
    history, page, setPage, draft, busy, message, blocked, heading,
    back, submit, reason, setReason, review, collect,
  } = useReservationDepositForm({ actorId: user.id, reservationId, onReload });

  const data = history.status === "ready" ? history.data : null;
  const manager = depositManagerRoles.includes(user.role);
  const locked = Boolean(draft) || busy || blocked;
  const returnEligible =
    ["CHECKED_OUT", "CANCELLED", "EXPIRED"].includes(bookingStatus);

  return (
    <section
      className="record-section deposit-workspace"
      aria-labelledby="reservation-deposits-title"
      aria-busy={busy}
    >
      <header className="deposit-workspace__header">
        <div>
          <h2 id="reservation-deposits-title">Deposit overview</h2>
          <p className="deposit-workspace__muted">
            Held funds are separate from accommodation revenue.
          </p>
        </div>

        <button
          type="button"
          onClick={history.reload}
          disabled={history.loading}
        >
          Refresh records
        </button>
      </header>

      <StaffDataState state={history} label="Deposit records" />

      {message && (
        <p className="deposit-workspace__message" role="status">
          {message}
        </p>
      )}

      {data && (
        <dl className="deposit-workspace__balances">
          <div className="deposit-workspace__balance">
            <dt>Deposit still held</dt>
            <dd>{formatPesos(data.summary.balanceCentavos)}</dd>
          </div>

          <div className="deposit-workspace__balance">
            <dt>Available for deduction or return approval</dt>
            <dd>{formatPesos(data.summary.availableCentavos)}</dd>
          </div>

          <div>
            <dt>Cash collected</dt>
            <dd>{formatPesos(data.summary.collectedCentavos)}</dd>
          </div>

          <div>
            <dt>Cash returned</dt>
            <dd>{formatPesos(data.summary.returnedCentavos)}</dd>
          </div>

          <div>
            <dt>Net approved deductions</dt>
            <dd>{formatPesos(data.summary.deductedCentavos)}</dd>
          </div>

          <div>
            <dt>Reserved for approved returns</dt>
            <dd>{formatPesos(data.summary.reservedReturnCentavos)}</dd>
          </div>
        </dl>
      )}

      <div className="deposit-workspace__reason">
        <label htmlFor="deposit-reason">
          Reason for the next deposit action
        </label>

        <textarea
          id="deposit-reason"
          rows={3}
          value={reason}
          minLength={3}
          maxLength={500}
          disabled={locked}
          aria-describedby="deposit-reason-help"
          onChange={(event) => setReason(event.target.value)}
        />

        <p
          id="deposit-reason-help"
          className="deposit-workspace__muted"
        >
          Enter 3–500 characters. This reason is included in the action
          you review.
        </p>
      </div>

      {data && (
        <>
          <form onSubmit={collect} hidden={Boolean(draft)}>
            <fieldset className="action-fields" disabled={locked}>
              <legend>Record cash actually received</legend>

              <div className="deposit-workspace__receipt">
                <div className="deposit-workspace__field">
                  <label htmlFor="deposit-amount">Amount, PHP</label>
                  <input
                    id="deposit-amount"
                    name="amount"
                    inputMode="decimal"
                    required
                  />
                </div>

                <button type="submit">Review deposit receipt</button>
              </div>
            </fieldset>
          </form>

          <section
            className="deposit-workspace__pending"
            aria-labelledby="deposit-pending-title"
          >
            <h3 id="deposit-pending-title">Pending actions</h3>

            <p className="deposit-workspace__muted">
              Approval reserves a return; it does not record cash
              handover. Deductions settle an approved charge in full.
              Each list shows up to 20 records.
            </p>

            {manager && (
              <section className="deposit-workspace__queue">
                <h4>
                  Approved charges for full deduction
                  <span>{data.eligibleCharges.length} shown</span>
                </h4>

                {data.eligibleCharges.length === 0 ? (
                  <p className="deposit-workspace__muted">
                    No eligible charges.
                  </p>
                ) : (
                  <ul className="deposit-workspace__list">
                    {data.eligibleCharges.map((charge) => (
                      <li key={charge.id}>
                        <div>
                          <strong>{charge.description}</strong>
                          <p>{formatPesos(charge.amountCentavos)}</p>
                        </div>

                        <button
                          type="button"
                          disabled={
                            locked ||
                            charge.amountCentavos >
                              data.summary.availableCentavos
                          }
                          onClick={() =>
                            review(
                              "DEDUCT",
                              { chargeId: charge.id },
                              `Settle ${charge.description} from deposit: ${
                                formatPesos(charge.amountCentavos)
                              }`,
                            )
                          }
                        >
                          Review full deduction
                        </button>
                      </li>
                    ))}
                  </ul>
                )}

                {returnEligible && (
                  <button
                    type="button"
                    disabled={
                      locked || data.summary.availableCentavos <= 0
                    }
                    onClick={() =>
                      review(
                        "AUTHORIZE_RETURN",
                        {
                          amountCentavos:
                            data.summary.availableCentavos,
                        },
                        `Authorize remaining available cash return: ${
                          formatPesos(data.summary.availableCentavos)
                        }`,
                      )
                    }
                  >
                    Review return authorization
                  </button>
                )}
              </section>
            )}

            <section className="deposit-workspace__queue">
              <h4>
                Approved returns awaiting cash handover
                <span>{data.pendingReturns.length} shown</span>
              </h4>

              {data.pendingReturns.length === 0 ? (
                <p className="deposit-workspace__muted">
                  No approved returns awaiting handover.
                </p>
              ) : (
                <ul className="deposit-workspace__list">
                  {data.pendingReturns.map((authorization) => (
                    <li key={authorization.id}>
                      <div>
                        <strong>
                          {formatPesos(authorization.amountCentavos)}
                        </strong>
                        <p>
                          Approved by {authorization.approvedBy.name}
                        </p>
                        <p>{authorization.reason}</p>
                      </div>

                      <button
                        type="button"
                        disabled={locked}
                        onClick={() =>
                          review(
                            "RETURN_CASH",
                            {
                              authorizationId: authorization.id,
                              moneyReturned: true,
                            },
                            `Record actual cash returned: ${
                              formatPesos(authorization.amountCentavos)
                            }`,
                          )
                        }
                      >
                        Record actual cash return
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            {user.role === "SUPER_ADMIN" && (
              <section className="deposit-workspace__queue">
                <h4>
                  Unfulfilled deposit-funded extensions
                  <span>{data.restorableCharges.length} shown</span>
                </h4>

                {data.restorableCharges.length === 0 ? (
                  <p className="deposit-workspace__muted">
                    No extensions awaiting deposit restoration.
                  </p>
                ) : (
                  <ul className="deposit-workspace__list">
                    {data.restorableCharges.map((charge) => (
                      <li key={charge.id}>
                        <div>
                          <strong>{charge.description}</strong>
                          <p>{formatPesos(charge.amountCentavos)}</p>
                        </div>

                        <button
                          type="button"
                          disabled={locked}
                          onClick={() =>
                            review(
                              "RESTORE_EXTENSION",
                              { chargeId: charge.id },
                              "Restore held deposit for unfulfilled " +
                                `extension: ${
                                  formatPesos(charge.amountCentavos)
                                }. No cash is returned by this action`,
                            )
                          }
                        >
                          Review deposit restoration
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            )}

            <p className="deposit-workspace__muted">
              Completing records reveals the next available items.
            </p>
          </section>

          <details className="deposit-workspace__history">
            <summary>
              Deposit movement history · {data.total} movements
            </summary>

            <div className="deposit-workspace__history-body">
              {data.items.length === 0 ? (
                <p className="deposit-workspace__muted">
                  No deposit movements on this page.
                </p>
              ) : (
                <ol className="deposit-workspace__movements">
                  {data.items.map((item) => (
                    <li key={item.id}>
                      <p>
                        <strong>{formatStatus(item.kind)}</strong>
                        {" — "}
                        {formatPesos(item.amountCentavos)}
                      </p>
                      <p>{item.reason}</p>
                      <p className="deposit-workspace__muted">
                        {item.recordedBy.name}
                        {" · "}
                        {formatTimestamp(item.createdAt)}
                      </p>
                    </li>
                  ))}
                </ol>
              )}

              <nav
                className="actions deposit-workspace__pagination"
                aria-label="Deposit history pages"
              >
                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() => setPage(page - 1)}
                >
                  Previous
                </button>

                <span>
                  Page {page} · {data.total} movements
                </span>

                <button
                  type="button"
                  disabled={
                    page >= 10000 || page * 20 >= data.total
                  }
                  onClick={() => setPage(page + 1)}
                >
                  Next
                </button>
              </nav>
            </div>
          </details>
        </>
      )}

      {draft && (
        <section
          className="action-review"
          aria-label="Review deposit action"
        >
          <h3 ref={heading} tabIndex={-1}>
            Review deposit action
          </h3>

          <p>{draft.label}</p>
          <p className="deposit-workspace__request">
            Request: {draft.command.requestId}
          </p>

          {draft.phase === "rejected" ? (
            <button type="button" onClick={back} disabled={busy}>
              Acknowledge rejection and start over
            </button>
          ) : (
            <form
              onSubmit={(event) => {
                event.preventDefault();
                void submit();
              }}
            >
              {["COLLECT", "RETURN_CASH"].includes(
                draft.command.action,
              ) && (
                <label className="action-checkbox">
                  <input type="checkbox" required />
                  <span>
                    {draft.command.action === "COLLECT"
                      ? "I have actually received the cash amount shown."
                      : "I have actually returned the authorized cash amount."}
                  </span>
                </label>
              )}

              <div className="actions">
                {draft.phase === "review" && (
                  <button
                    type="button"
                    onClick={back}
                    disabled={busy}
                  >
                    Back
                  </button>
                )}

                <button
                  type="submit"
                  disabled={busy || blocked}
                >
                  {busy
                    ? "Saving…"
                    : draft.phase === "pending"
                      ? "Retry original request"
                      : "Confirm deposit action"}
                </button>
              </div>
            </form>
          )}
        </section>
      )}
    </section>
  );
}

export default function ReservationDeposits({
  reservationId,
  bookingStatus,
  onReload,
}) {
  const { status, user } = useAuth();

  if (
    status !== "authenticated" ||
    !depositStaffRoles.includes(user?.role)
  ) {
    return null;
  }

  return (
    <Workspace
      key={`${user.id}:${reservationId}:${bookingStatus}`}
      user={user}
      reservationId={reservationId}
      bookingStatus={bookingStatus}
      onReload={onReload}
    />
  );
}