import { useCountUp } from "../hooks/useCountUp";

export function CountUp({
  target,
  display,
  decimals,
}: {
  target: number;
  display?: string;
  decimals?: number;
}) {
  const value = useCountUp(target);

  if (display) return <>{display}</>;
  if (decimals !== undefined) return <>{value.toFixed(decimals)}</>;
  return <>{target < 10 ? value.toFixed(1) : Math.round(value)}</>;
}
