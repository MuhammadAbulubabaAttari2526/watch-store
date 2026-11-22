'use client';
import { createContext, useContext } from 'react';
const Ctx = createContext(null);
export const useAuth = () => useContext(Ctx); // the signed-in customer, or null
export default function AuthProvider({ customer, children }) { return <Ctx.Provider value={customer}>{children}</Ctx.Provider>; }
