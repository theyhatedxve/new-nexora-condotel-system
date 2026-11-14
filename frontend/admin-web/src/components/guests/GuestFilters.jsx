import { Search } from "lucide-react";
import useGuestFilters from "../../hooks/useGuestFilters.js";

export function GuestFilters({ query, onApply, onClear }) {
  const { draft, error, submit, changeSearch, changePageSize } = useGuestFilters({
    query,
    onApply,
  });

  return (
    <form className="guest-filters" onSubmit={submit}>
      <fieldset className="guest-filter-fields">
        <legend>Search guests</legend>

        {error && (
          <p className="guests-screen__filter-error" role="alert">
            {error}
          </p>
        )}

        <div>
          <label htmlFor="guest-name-search">Guest name</label>

          <div className="guests-screen__search-control">
            <Search size={18} aria-hidden="true" />

            <input
              id="guest-name-search"
              type="search"
              placeholder="Search first or last name"
              maxLength={100}
              aria-describedby="guest-search-help"
              value={draft.q}
              onChange={changeSearch}
            />
          </div>
        </div>

        <div>
          <label htmlFor="guest-page-size">Records per page</label>
          <select id="guest-page-size" value={draft.limit} onChange={changePageSize}>
            <option value="20">20</option>
            <option value="50">50</option>
          </select>
        </div>

        <p id="guest-search-help" className="guest-filter-help">
          All search words must match the guest’s first or last name. Select
          Apply search to update results.
        </p>

        <div className="actions guest-filter-actions">
          <button type="submit" className="guests-screen__primary">
            <Search size={16} aria-hidden="true" />
            Apply search
          </button>

          <button
            type="button"
            className="guests-screen__secondary"
            onClick={onClear}
          >
            Clear search
          </button>
        </div>
      </fieldset>
    </form>
  );
}
