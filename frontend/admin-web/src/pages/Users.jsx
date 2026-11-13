import { useMemo } from "react";
import { Link, useSearchParams } from "react-router";
import { Plus, RefreshCw, Search } from "lucide-react";
import { ROLE_LABELS, STAFF_ROLES } from "../auth/staffNavigation";
import StaffDataState from "../components/StaffDataState";
import StaffUserResult from "../components/StaffUserResult";
import { useStaffData } from "../hooks/useStaffData";
import useStaffUserChange from "../hooks/useStaffUserChange";
import {
  listStaffUsers,
  STAFF_STATUSES,
  STATUS_LABELS,
} from "../services/staffUsersApi";
import "../styles/staff-users.css";

function readFilters(search) {
  const params = new URLSearchParams(search);
  const requestedPage = Number(params.get("page"));

  return {
    q: (params.get("q") ?? "").trim().slice(0, 100),
    role: STAFF_ROLES.includes(params.get("role")) ? params.get("role") : "",
    status: STAFF_STATUSES.includes(params.get("status"))
      ? params.get("status")
      : "",
    page:
      Number.isInteger(requestedPage) &&
      requestedPage >= 1 &&
      requestedPage <= 10_000
        ? requestedPage
        : 1,
    limit: params.get("limit") === "50" ? 50 : 20,
  };
}

export default function Users() {
  const [searchParams, setSearchParams] = useSearchParams();
  const search = searchParams.toString();
  const filters = useMemo(() => readFilters(search), [search]);

  const loader = useMemo(
    () => (signal) =>
      listStaffUsers(
        {
          ...filters,
          role: filters.role || undefined,
          status: filters.status || undefined,
          q: filters.q || undefined,
        },
        signal,
      ),
    [filters],
  );

  const directory = useStaffData(loader);
  const change = useStaffUserChange();
  const data = directory.data;

  function applyFilters(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const next = new URLSearchParams();

    for (const field of ["q", "role", "status", "limit"]) {
      const value = String(form.get(field) ?? "").trim();
      if (value) next.set(field, value);
    }

    setSearchParams(next);
  }

  function goToPage(page) {
    const next = new URLSearchParams(searchParams);
    next.set("page", String(page));
    setSearchParams(next);
  }

  return (
    <section className="staff-users">
      <header className="staff-users__heading">
        <div>
          <h1>Users &amp; Roles</h1>
          <p>Manage staff accounts and access roles.</p>
        </div>

        <div className="staff-users__actions">
          <button
            type="button"
            className="staff-users__secondary"
            onClick={directory.reload}
            disabled={directory.loading}
          >
            <RefreshCw size={16} aria-hidden="true" />
            Refresh
          </button>

          {!change.blocked && (
            <Link className="staff-users__primary" to="/users/new">
              <Plus size={16} aria-hidden="true" />
              Add User
            </Link>
          )}
        </div>
      </header>

      <StaffUserResult onReviewed={directory.reload} />

      <form key={search} className="staff-users__filters" onSubmit={applyFilters}>
        <label>
          Search staff
          <input
            name="q"
            type="search"
            maxLength={100}
            defaultValue={filters.q}
            placeholder="Name or email"
          />
        </label>

        <label>
          Role
          <select name="role" defaultValue={filters.role}>
            <option value="">All roles</option>
            {STAFF_ROLES.map((role) => (
              <option key={role} value={role}>{ROLE_LABELS[role]}</option>
            ))}
          </select>
        </label>

        <label>
          Status
          <select name="status" defaultValue={filters.status}>
            <option value="">All statuses</option>
            {STAFF_STATUSES.map((status) => (
              <option key={status} value={status}>{STATUS_LABELS[status]}</option>
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

        <button type="submit">
          <Search size={16} aria-hidden="true" />
          Search
        </button>
      </form>

      <StaffDataState state={directory} label="staff accounts" />

      {directory.status === "ready" && (
        <>
          <div
            className="staff-users__table"
            role="region"
            aria-label="Staff accounts"
            tabIndex={0}
          >
            <table>
              <caption>
                {data.total} staff {data.total === 1 ? "account" : "accounts"}
              </caption>
              <thead>
                <tr>
                  <th scope="col">Name</th>
                  <th scope="col">Email</th>
                  <th scope="col">Role</th>
                  <th scope="col">Status</th>
                  <th scope="col">Password setup</th>
                  <th scope="col">Actions</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((account) => (
                  <tr key={account.id}>
                    <th scope="row">{account.name || "Unnamed staff"}</th>
                    <td>{account.email}</td>
                    <td>{ROLE_LABELS[account.role]}</td>
                    <td>
                      <span
                        className={
                          "staff-users__badge staff-users__badge--" +
                          account.status.toLowerCase()
                        }
                      >
                        {STATUS_LABELS[account.status]}
                      </span>
                    </td>
                    <td>{account.mustChangePassword ? "Required" : "Completed"}</td>
                    <td>
                      <Link
                        to={"/users/" + encodeURIComponent(account.id)}
                        aria-label={"Manage " + account.email}
                      >
                        Manage
                      </Link>
                    </td>
                  </tr>
                ))}

                {data.items.length === 0 && (
                  <tr>
                    <td colSpan={6}>No staff accounts match these filters.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <nav className="staff-users__pagination" aria-label="Staff directory pages">
            <span>Page {data.page} of {Math.max(1, data.totalPages)}</span>
            <button
              type="button"
              disabled={data.page <= 1}
              onClick={() => goToPage(data.page - 1)}
            >
              Previous
            </button>
            <button
              type="button"
              disabled={data.page >= data.totalPages || data.page >= 10_000}
              onClick={() => goToPage(data.page + 1)}
            >
              Next
            </button>
          </nav>
        </>
      )}
    </section>
  );
}
