import Link from 'next/link';

// A plain GET form: works without JavaScript and keeps every filter in the URL.
export default function ProductFilters({ filters, current }) {
  const { collections, categories, colors = [], straps = [] } = filters;
  return (
    <form className="filters" method="get" action="/products">
      {current.q && <input type="hidden" name="q" value={current.q} />}
      <div className="field"><label htmlFor="f-col">Collection</label>
        <select id="f-col" name="collection" className="input" defaultValue={current.collection || ''}>
          <option value="">All collections</option>
          {collections.map((c) => <option key={c.id} value={c.handle}>{c.title}</option>)}
        </select></div>
      {categories.length > 0 && <div className="field"><label htmlFor="f-cat">Category</label>
        <select id="f-cat" name="category" className="input" defaultValue={current.category || ''}>
          <option value="">All categories</option>
          {categories.map((c) => <option key={c.id} value={c.handle}>{c.name}</option>)}
        </select></div>}
      {colors.length > 0 && <div className="field"><label htmlFor="f-color">Colour</label>
        <select id="f-color" name="color" className="input" defaultValue={current.color || ''}>
          <option value="">Any colour</option>{colors.map((c) => <option key={c} value={c}>{c}</option>)}
        </select></div>}
      {straps.length > 0 && <div className="field"><label htmlFor="f-strap">Strap</label>
        <select id="f-strap" name="strap" className="input" defaultValue={current.strap || ''}>
          <option value="">Any strap</option>{straps.map((c) => <option key={c} value={c}>{c}</option>)}
        </select></div>}
      <div className="field"><label htmlFor="f-min">Min price (Rs)</label>
        <input id="f-min" name="min" type="number" min="0" inputMode="numeric" className="input" defaultValue={current.min ?? ''} /></div>
      <div className="field"><label htmlFor="f-max">Max price (Rs)</label>
        <input id="f-max" name="max" type="number" min="0" inputMode="numeric" className="input" defaultValue={current.max ?? ''} /></div>
      <div className="field"><label htmlFor="f-sort">Sort by</label>
        <select id="f-sort" name="sort" className="input" defaultValue={current.sort || 'newest'}>
          <option value="newest">Newest first</option>
          <option value="price-asc">Price: low to high</option>
          <option value="price-desc">Price: high to low</option>
          <option value="name">Name A to Z</option>
          <option value="oldest">Oldest first</option>
        </select></div>
      <div className="filters__actions"><button className="btn" type="submit">Apply</button><Link className="btn btn--ghost" href="/products">Reset</Link></div>
    </form>
  );
}
