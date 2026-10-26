/** one page of rows. If the list shrinks, the page is kept inside the range. */
export function slicePage<T>(rows: T[], page: number, size: number): T[] {
  const pages = Math.max(1, Math.ceil(rows.length / size));
  const p = Math.min(page, pages - 1);
  return rows.slice(p * size, p * size + size);
}
