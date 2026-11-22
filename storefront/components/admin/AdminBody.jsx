'use client';

import { useEffect } from 'react';

export default function AdminBody({ children }) {
  useEffect(() => {
    document.body.classList.add('admin-ui');
    return () => document.body.classList.remove('admin-ui');
  }, []);

  return <>{children}</>;
}
