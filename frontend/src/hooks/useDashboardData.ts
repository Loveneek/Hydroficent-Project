import { useEffect, useState } from "react";
import { buildDashboardData, type DashboardData } from "../data/buildDashboardData";
import { loadPropertyData } from "../data/propertyData";

export function useDashboardData() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    loadPropertyData()
      .then(({ raw, source }) => {
        if (isMounted) {
          setData(buildDashboardData(raw, source));
        }
      })
      .catch((reason: unknown) => {
        if (isMounted) {
          setError(reason instanceof Error ? reason.message : "Unable to load dashboard data.");
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  return { data, error };
}
