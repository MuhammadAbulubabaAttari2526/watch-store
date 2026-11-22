'use client';
import { useRouter } from 'next/navigation';

export default function RetryButton() {
  const router = useRouter();
  return <button className="btn btn--ghost" onClick={() => router.refresh()}>Try again</button>;
}
