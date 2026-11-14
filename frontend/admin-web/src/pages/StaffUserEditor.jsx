import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router";
import { useAuth } from "../auth/useAuth";
import { ROLE_LABELS, STAFF_ROLES } from "../auth/staffNavigation";
import StaffDataState from "../components/StaffDataState";
import StaffUserResult from "../components/StaffUserResult";
import { useStaffData } from "../hooks/useStaffData";
import useStaffUserChange from "../hooks/useStaffUserChange";
import { getStaffUser, STATUS_LABELS } from "../services/staffUsersApi";
import "../styles/staff-users.css";

function StaffUserForm({ record }) {
  const { user } = useAuth();
  const change = useStaffUserChange();
  const [name, setName] = useState(record?.name ?? "");
  const [email, setEmail] = useState(record?.email ?? "");
  const [role, setRole] = useState(record?.role ?? "RECEPTIONIST");
  const [status, setStatus] = useState(record?.status ?? "ACTIVE");
  const [setupMethod, setSetupMethod] = useState("INVITATION");
  const [temporaryPassword, setTemporaryPassword] = useState("");
  const [review, setReview] = useState(null);
  const [message, setMessage] = useState("");
  const reviewHeading = useRef(null);
  const reviewButton = useRef(null);
  const creating = !record;
  const ownAccount = record?.id === user?.id;

  useEffect(() => {
    if (review) reviewHeading.current?.focus();
  }, [review]);

  function prepare(event) {
    event.preventDefault();
    setMessage("");

    if (!name.trim()) {
      setMessage("Enter the staff member’s name.");
      return;
    }

    if (change.blocked) return;

    if (creating) {
      const input = {
        name: name.trim(),
        email: email.trim().toLowerCase(),
        role,
        setupMethod,
      };

      if (setupMethod === "TEMPORARY_PASSWORD") {
        input.temporaryPassword = temporaryPassword;
      }

      setReview({ kind: "create", email: input.email, input });
      return;
    }

    setReview({
      kind: "update",
      id: record.id,
      email: record.email,
      input: {
        name: name.trim(),
        role,
        status,
        updatedAt: record.updatedAt,
      },
    });
  }

  function prepareInvitation() {
    if (change.blocked) return;

    setReview({
      kind: "invitation",
      id: record.id,
      email: record.email,
      input: { updatedAt: record.updatedAt },
    });
  }

  function cancelReview() {
    setReview(null);
    requestAnimationFrame(() => reviewButton.current?.focus());
  }

  function confirm() {
    if (!review || change.blocked) return;

    const request = review;
    setReview(null);
    setTemporaryPassword("");
    void change.run(request);
  }

  return (
    <>
      <form className="staff-users__form" onSubmit={prepare}>
        <fieldset disabled={change.blocked || Boolean(review)}>
          <legend>{creating ? "New staff account" : "Account details"}</legend>

          <label>
            Name
            <input
              required
              maxLength={100}
              autoComplete="name"
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
          </label>

          <label>
            Email
            <input
              required
              type="email"
              maxLength={254}
              autoComplete="email"
              readOnly={!creating}
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </label>

          <label>
            Role
            <select
              value={role}
              disabled={ownAccount}
              onChange={(event) => setRole(event.target.value)}
            >
              {STAFF_ROLES.map((value) => (
                <option key={value} value={value}>{ROLE_LABELS[value]}</option>
              ))}
            </select>
          </label>

          {!creating && (
            <label>
              Status
              <select
                value={status}
                disabled={ownAccount}
                onChange={(event) => setStatus(event.target.value)}
              >
                {record.status === "PENDING" && (
                  <option value="PENDING">Pending</option>
                )}
                <option value="ACTIVE">Active</option>
                <option value="DISABLED">Disabled</option>
              </select>
            </label>
          )}

          {creating && (
            <>
              <label>
                Password setup
                <select
                  value={setupMethod}
                  onChange={(event) => {
                    setSetupMethod(event.target.value);
                    setTemporaryPassword("");
                  }}
                >
                  <option value="INVITATION">Email invitation</option>
                  <option value="TEMPORARY_PASSWORD">Temporary password</option>
                </select>
              </label>

              {setupMethod === "TEMPORARY_PASSWORD" && (
                <label>
                  Temporary password
                  <input
                    required
                    type="password"
                    minLength={12}
                    maxLength={128}
                    autoComplete="new-password"
                    aria-describedby="temporary-password-help"
                    value={temporaryPassword}
                    onChange={(event) => setTemporaryPassword(event.target.value)}
                  />
                  <small id="temporary-password-help">
                    Use 12–128 characters. Share it securely with the staff
                    member. They must replace it before signing in.
                  </small>
                </label>
              )}
            </>
          )}

          {ownAccount && (
            <p>Your account must remain an active administrator.</p>
          )}

          {!creating && (
            <p>
              Role or status changes end existing sessions and invalidate
              outstanding setup links.
            </p>
          )}

          <button ref={reviewButton} type="submit">
            Review {creating ? "new account" : "changes"}
          </button>

          {!creating && record.mustChangePassword && record.status !== "DISABLED" && (
            <button
              type="button"
              className="staff-users__secondary"
              onClick={prepareInvitation}
            >
              Review new invitation
            </button>
          )}
        </fieldset>
      </form>

      {message && <p role="alert">{message}</p>}

      {review && (
        <section className="staff-users__notice" aria-labelledby="staff-account-review">
          <h2 id="staff-account-review" ref={reviewHeading} tabIndex={-1}>
            Confirm account operation
          </h2>
          <p>{review.email}</p>

          {review.kind !== "invitation" && (
            <dl>
              <dt>Name</dt>
              <dd>{review.input.name}</dd>
              <dt>Role</dt>
              <dd>{ROLE_LABELS[review.input.role]}</dd>
              <dt>Status</dt>
              <dd>
                {review.kind === "create"
                  ? review.input.setupMethod === "INVITATION"
                    ? "Pending password setup"
                    : "Active with required password change"
                  : STATUS_LABELS[review.input.status]}
              </dd>
            </dl>
          )}

          {review.kind === "create" && (
            <p>
              {review.input.setupMethod === "INVITATION"
                ? "An invitation valid for 30 minutes will be requested."
                : "The staff member must replace their temporary password before signing in."}
            </p>
          )}

          {review.kind === "invitation" && (
            <p>
              This replaces earlier setup links and any temporary password.
              The account returns to Pending. A new invitation valid for
              30 minutes will be requested.
            </p>
          )}

          <div className="staff-users__actions">
            <button type="button" onClick={confirm}>Confirm</button>
            <button
              type="button"
              className="staff-users__secondary"
              onClick={cancelReview}
            >
              Back to form
            </button>
          </div>
        </section>
      )}
    </>
  );
}

function ExistingStaffUser({ id }) {
  const account = useStaffData(getStaffUser, id);

  return (
    <>
      <StaffUserResult onReviewed={account.reload} />
      <StaffDataState state={account} label="staff account" />
      {account.status === "ready" && (
        <StaffUserForm key={account.data.id + account.data.updatedAt} record={account.data} />
      )}
    </>
  );
}

export default function StaffUserEditor() {
  const { userId } = useParams();
  const [revision, setRevision] = useState(0);

  return (
    <section className="staff-users">
      <Link to="/users">Back to Users &amp; Roles</Link>
      <header className="staff-users__heading">
        <h1>{userId ? "Manage staff account" : "Add User"}</h1>
      </header>

      {userId ? (
        <ExistingStaffUser key={userId} id={userId} />
      ) : (
        <>
          <StaffUserResult onReviewed={() => setRevision((value) => value + 1)} />
          <StaffUserForm key={revision} record={null} />
        </>
      )}
    </section>
  );
}
