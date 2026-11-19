import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

const PAGE_SIZE = 3;

export default function RoomBrowser({
  headingId,
  title,
  description,
  items,
  priceKey,
  priceLabel,
  renderRoom,
  headingLevel = 2,
}) {
  const [selectedId, setSelectedId] = useState("");
  const [sort, setSort] = useState("price-asc");
  const [page, setPage] = useState(0);

  const Heading = headingLevel === 3 ? "h3" : "h2";

  const filterId = items.some((item) => item.id === selectedId)
    ? selectedId
    : "";

  const options = [...items].sort(
    (first, second) =>
      first.name.localeCompare(second.name, "en") ||
      first.id.localeCompare(second.id, "en"),
  );

  const filtered = filterId
    ? items.filter((item) => item.id === filterId)
    : items;

  const sorted = [...filtered].sort((first, second) => {
    const nameOrder =
      first.name.localeCompare(second.name, "en") ||
      first.id.localeCompare(second.id, "en");

    if (sort === "name") return nameOrder;

    const firstPrice = first[priceKey];
    const secondPrice = second[priceKey];

    const firstValid =
      Number.isSafeInteger(firstPrice) && firstPrice >= 0;
    const secondValid =
      Number.isSafeInteger(secondPrice) && secondPrice >= 0;

    if (!firstValid || !secondValid) {
      if (firstValid !== secondValid) return firstValid ? -1 : 1;
      return nameOrder;
    }

    const direction = sort === "price-desc" ? -1 : 1;

    return direction * (firstPrice - secondPrice) || nameOrder;
  });

  const pageCount = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount - 1);
  const start = currentPage * PAGE_SIZE;
  const visible = sorted.slice(start, start + PAGE_SIZE);

  function changeFilter(id) {
    setSelectedId(id);
    setPage(0);
  }

  function changeSort(event) {
    setSort(event.target.value);
    setPage(0);
  }

  return (
    <section
      className="rooms-browser"
      aria-labelledby={headingId}
    >
      <div className="rooms-browser__toolbar">
        <div className="rooms-browser__heading">
          <Heading id={headingId} className="rooms-browser__title">
            {title}
          </Heading>
          <p>{description}</p>
        </div>

        <div className="rooms-browser__controls">
          <div
            className="rooms-browser__filters"
            role="group"
            aria-label="Filter by room type"
          >
            <button
              type="button"
              aria-pressed={filterId === ""}
              onClick={() => changeFilter("")}
            >
              All Rooms
            </button>

            {options.map((item) => (
              <button
                key={item.id}
                type="button"
                aria-pressed={filterId === item.id}
                onClick={() => changeFilter(item.id)}
              >
                {item.name}
              </button>
            ))}
          </div>

          <label
            className="rooms-browser__sort"
            htmlFor={`${headingId}-sort`}
          >
            Sort by
            <select
              id={`${headingId}-sort`}
              value={sort}
              onChange={changeSort}
            >
              <option value="price-asc">
                {priceLabel}: low to high
              </option>
              <option value="price-desc">
                {priceLabel}: high to low
              </option>
              <option value="name">Name: A to Z</option>
            </select>
          </label>
        </div>
      </div>

      <div className="rooms-browser__grid">
        {visible.map((room) => (
          <div className="rooms-browser__slot" key={room.id}>
            {renderRoom(room)}
          </div>
        ))}
      </div>

      <p className="rooms-browser__count" aria-live="polite">
        Showing {sorted.length === 0 ? 0 : start + 1}
        –{Math.min(start + PAGE_SIZE, sorted.length)} of{" "}
        {sorted.length} room {sorted.length === 1 ? "type" : "types"}.
      </p>

      {pageCount > 1 && (
        <nav
          className="rooms-browser__pager"
          aria-label={`${title} pages`}
        >
          <button
            type="button"
            aria-label="Previous room page"
            disabled={currentPage === 0}
            onClick={() => setPage(currentPage - 1)}
          >
            <ChevronLeft size={21} aria-hidden="true" />
          </button>

          {Array.from({ length: pageCount }, (_, index) => (
            <button
              key={index}
              type="button"
              className="rooms-browser__dot"
              aria-label={`Show room page ${index + 1}`}
              aria-current={currentPage === index ? "page" : undefined}
              onClick={() => setPage(index)}
            >
              <span aria-hidden="true" />
            </button>
          ))}

          <button
            type="button"
            aria-label="Next room page"
            disabled={currentPage === pageCount - 1}
            onClick={() => setPage(currentPage + 1)}
          >
            <ChevronRight size={21} aria-hidden="true" />
          </button>
        </nav>
      )}
    </section>
  );
}