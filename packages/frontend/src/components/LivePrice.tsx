'use client';

import { useEffect, useRef, useState } from 'react';
import { formatPrice } from '@/lib/format';

type Flash = 'up' | 'down' | null;

/** Flashes green or red for a moment whenever the price moves, so a streaming
 * table reads as live rather than as a number that happens to differ on reload. */
export function LivePrice({ value }: { value: number | null }) {
  const previous = useRef<number | null>(null);
  const [flash, setFlash] = useState<Flash>(null);

  useEffect(() => {
    if (value === null) return;

    const last = previous.current;
    previous.current = value;
    if (last === null || last === value) return;

    setFlash(value > last ? 'up' : 'down');
    const timer = setTimeout(() => setFlash(null), 450);
    return () => clearTimeout(timer);
  }, [value]);

  return (
    <span className="price" data-flash={flash ?? undefined}>
      {formatPrice(value)}
    </span>
  );
}
