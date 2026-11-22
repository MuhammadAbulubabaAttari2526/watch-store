import Link from 'next/link';

export default function Pagination({ page, pages, hrefFor }) {
  if (pages <= 1) return null;
  const nums = [];
  for (let i = Math.max(1, page - 2); i <= Math.min(pages, page + 2); i++) nums.push(i);
  return (
    <nav className="pagination" aria-label="Pagination">
      {page > 1 && <Link href={hrefFor(page - 1)} rel="prev">Previous</Link>}
      {nums.map((n) => n === page
        ? <span key={n} aria-current="page" className="is-current">{n}</span>
        : <Link key={n} href={hrefFor(n)}>{n}</Link>)}
      {page < pages && <Link href={hrefFor(page + 1)} rel="next">Next</Link>}
    </nav>
  );
}
