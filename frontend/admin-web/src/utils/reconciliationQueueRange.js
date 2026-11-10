export default function reconciliationQueueRange({ meta, onPage, name }) {
  const start = meta.total === 0 ? 0 : (meta.page - 1) * meta.limit + 1;

  const end = Math.min(meta.page * meta.limit, meta.total);

  function previousPage() {
    return onPage(name, meta.page - 1);
  }

  function nextPage() {
    return onPage(name, meta.page + 1);
  }

  return { start, end, previousPage, nextPage };
}
