export function QueueTable({ label, caption, headings, children }) {
  return (
    <div className="records-scroll" role="region" aria-label={label} tabIndex={0}>
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
