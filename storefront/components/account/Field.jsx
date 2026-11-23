'use client';
import { useFormStatus } from 'react-dom';

export default function Field({ name, label, error, hint, className = '', ...props }) {
  return (
    <div className={'field' + (error ? ' has-error' : '') + (className ? ` ${className}` : '')}>
      <label htmlFor={name}>{label}</label>
      <input id={name} name={name} className="input" aria-invalid={!!error} aria-describedby={`${name}-e`} {...props} />
      {hint && !error && <span className="field__hint">{hint}</span>}
      <span id={`${name}-e`} className="field__error" role="alert">{error}</span>
    </div>
  );
}
export function Submit({ children, className = '' }) {
  const { pending } = useFormStatus();
  return <button type="submit" className={`btn ${className}` + (pending ? ' is-loading' : '')} disabled={pending}>{children}</button>;
}
export const Notice = ({ state }) => (
  <>
    {state?.message && <div className="alert alert--error" role="alert">{state.message}</div>}
    {state?.ok && <div className="alert alert--success" role="status">{state.ok}</div>}
  </>
);
