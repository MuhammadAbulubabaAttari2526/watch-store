'use client';

import { useFormState } from 'react-dom';
import { deleteTaxonomyAction, saveTaxonomyAction } from '@/lib/admin/actions';
import { Notice, Submit } from '@/components/account/Field';

function TaxonomyForm({ type, item, availableParents = [] }) {
  const [state, action] = useFormState(saveTaxonomyAction, {});
  return (
    <form action={action} className="stack">
      <input type="hidden" name="type" value={type} />
      {item && <input type="hidden" name="id" value={item.id} />}
      <div className="two">
        <label className="field">{type === 'category' ? 'Category' : 'Collection'} name
          <input className="input" name="name" defaultValue={item?.name || ''} required minLength={2} />
        </label>
        <label className="field">URL handle
          <input className="input" name="slug" defaultValue={item?.slug || ''} required pattern="[a-z0-9]+(?:-[a-z0-9]+)*" />
        </label>
      </div>
      <label className="field">Description
        <input className="input" name="description" defaultValue={item?.description || ''} />
      </label>
      {type === 'category' && <label className="field">Parent category
        <select className="input" name="parent_id" defaultValue={item?.parent_id || ''}>
          <option value="">None</option>
          {availableParents.filter((category) => category.id !== item?.id).map((category) => (
            <option key={category.id} value={category.id}>{category.name}</option>
          ))}
        </select>
      </label>}
      <Notice state={state} />
      <Submit>{item ? 'Save changes' : `Add ${type}`}</Submit>
    </form>
  );
}

function TaxonomyDelete({ type, item }) {
  const [state, action] = useFormState(deleteTaxonomyAction, {});
  return (
    <form action={action} className="row" onSubmit={(event) => {
      if (!window.confirm(`Delete ${type} "${item.name}"?`)) event.preventDefault();
    }}>
      <input type="hidden" name="type" value={type} />
      <input type="hidden" name="id" value={item.id} />
      <strong>{item.name}</strong><span>/{item.slug}</span>
      <button className="link-btn" type="submit">Delete</button>
      <Notice state={state} />
    </form>
  );
}

export default function TaxonomyManager({ categories = [], collections = [] }) {
  const categoryItems = categories.map((item) => ({ ...item, availableParents: categories }));
  return (
    <section className="admin-panel stack">
      <div className="admin-panel__head"><h2>Categories and collections</h2></div>
      <div className="admin-grid">
        <div className="stack">
          <h3>Add category</h3><TaxonomyForm type="category" availableParents={categories} />
          {categoryItems.map((item) => <TaxonomyDelete key={item.id} type="category" item={item} />)}
        </div>
        <div className="stack">
          <h3>Add collection</h3><TaxonomyForm type="collection" />
          {collections.map((item) => <TaxonomyDelete key={item.id} type="collection" item={item} />)}
        </div>
      </div>
    </section>
  );
}
