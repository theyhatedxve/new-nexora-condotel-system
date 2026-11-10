import useGuestFilters from "../../hooks/useGuestFilters.js";

export function GuestFilters({ query, onApply, onClear }) {
  const { draft, error, submit, changeSearch, changePageSize } = useGuestFilters({
    query,
    onApply,
  });

  return (
    <form className="guest-filters" onSubmit={submit}>
      {error && <p role="alert">{error}</p>}

      <fieldset className="guest-filter-fields">
        <legend>Search guests</legend>

        <div>
          <label htmlFor="guest-name-search">Guest name</label>
          <input
            id="guest-name-search"
            type="search"
            maxLength={100}
            value={draft.q}
            onChange={changeSearch}
          />
        </div>

        <div>
          <label htmlFor="guest-page-size">Records per page</label>
          <select id="guest-page-size" value={draft.limit} onChange={changePageSize}>
            <option value="20">20</option>
            <option value="50">50</option>
          </select>
        </div>

        <p className="guest-filter-help">
          All search words must match the guest’s first or last name. Select Apply search
          to update results.
        </p>

        <div className="actions guest-filter-actions">
          <button type="submit">Apply search</button>

          <button type="button" onClick={onClear}>
            Clear search
          </button>
        </div>
      </fieldset>
    </form>
  );
}
