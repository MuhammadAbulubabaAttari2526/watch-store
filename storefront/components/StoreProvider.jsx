'use client';

import { createContext, useContext } from 'react';

const StoreContext = createContext('PKR');

export const useStoreCurrency = () => useContext(StoreContext);

export default function StoreProvider({ currency, children }) {
  const value = /^[A-Z]{3}$/.test(String(currency || '').toUpperCase())
    ? String(currency).toUpperCase()
    : 'PKR';
  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}
