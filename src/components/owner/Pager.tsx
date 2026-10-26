"use client";

type Props = {
  page: number;
  size: number;
  total: number;
  onPage: (p: number) => void;
  onSize: (s: number) => void;
  sizes?: number[];
};

/* 1 … 4 5 6 … 20 */
function windowed(page: number, pages: number): (number | "…")[] {
  const keep = [...new Set([0, pages - 1, page - 1, page, page + 1])]
    .filter((n) => n >= 0 && n < pages)
    .sort((a, b) => a - b);
  const out: (number | "…")[] = [];
  let prev = -1;
  keep.forEach((n) => {
    if (prev >= 0 && n - prev > 1) out.push("…");
    out.push(n);
    prev = n;
  });
  return out;
}

export default function Pager({ page, size, total, onPage, onSize, sizes = [10, 25, 50, 100] }: Props) {
  if (total === 0) return null;
  const pages = Math.max(1, Math.ceil(total / size));
  const p = Math.min(page, pages - 1);
  const from = p * size + 1;
  const to = Math.min(total, (p + 1) * size);

  return (
    <nav className="pager" aria-label="Pagination">
      <span className="pager__info">
        Showing {from} to {to} of {total}
      </span>
      <div className="pager__pages">
        <button disabled={p === 0} onClick={() => onPage(0)} aria-label="First page">«</button>
        <button disabled={p === 0} onClick={() => onPage(p - 1)}>‹ Prev</button>
        {windowed(p, pages).map((n, i) =>
          n === "…" ? (
            <span key={`gap${i}`} className="pager__gap">…</span>
          ) : (
            <button key={n} className={n === p ? "is-on" : ""} aria-current={n === p ? "page" : undefined} onClick={() => onPage(n)}>
              {n + 1}
            </button>
          )
        )}
        <button disabled={p >= pages - 1} onClick={() => onPage(p + 1)}>Next ›</button>
        <button disabled={p >= pages - 1} onClick={() => onPage(pages - 1)} aria-label="Last page">»</button>
      </div>
      <label className="pager__size">
        Rows
        <select value={size} onChange={(e) => onSize(Number(e.target.value))}>
          {sizes.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </label>
    </nav>
  );
}
