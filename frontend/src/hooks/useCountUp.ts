import { useEffect, useState } from "react";

export function useCountUp(target: number, duration = 850) {
  const [value, setValue] = useState(0);

  useEffect(() => {
    const started = performance.now();

    const tick = (now: number) => {
      const raw = Math.min((now - started) / duration, 1);
      const eased = 1 - Math.pow(1 - raw, 3);
      setValue(target * eased);

      if (raw < 1) requestAnimationFrame(tick);
    };

    requestAnimationFrame(tick);
  }, [target, duration]);

  return value;
}
