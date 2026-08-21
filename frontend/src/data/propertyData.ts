import type {
  DashboardKpiRow,
  DataQualityRow,
  DailyUsageRow,
  GeneratedAlert,
  HourlyUsageRow,
  ModeTimelineRow,
  PropertyId,
  PropertyRawData,
} from "./buildDashboardData";

const requestedPropertyId = import.meta.env.VITE_PROPERTY_ID as PropertyId | undefined;
export const activePropertyId: PropertyId =
  requestedPropertyId === "save-on-foods-scottsdale-mall"
    ? requestedPropertyId
    : "pfaff-audi-newmarket";

const propertyNames: Record<PropertyId, string> = {
  "pfaff-audi-newmarket": "Audi Newmarket Water System",
  "save-on-foods-scottsdale-mall": "Save-On-Foods Scottsdale Mall Water System",
};

type SupabaseTable =
  | "alerts"
  | "daily_usage"
  | "dashboard_kpis"
  | "data_quality_daily"
  | "hourly_usage"
  | "mode_timeline";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabasePublishableKey = (
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ??
  import.meta.env.VITE_SUPABASE_ANON_KEY
) as string | undefined;

const hasSupabaseConfig = Boolean(supabaseUrl && supabasePublishableKey);

async function fetchTable<T>(table: SupabaseTable, propertyId: PropertyId, orderColumn?: string): Promise<T[]> {
  if (!supabaseUrl || !supabasePublishableKey) return [];

  const url = new URL(`${supabaseUrl.replace(/\/$/, "")}/rest/v1/${table}`);
  url.searchParams.set("property_id", `eq.${propertyId}`);
  url.searchParams.set("select", "*");
  if (orderColumn) url.searchParams.set("order", `${orderColumn}.asc`);

  const response = await fetch(url, {
    headers: {
      apikey: supabasePublishableKey,
      authorization: `Bearer ${supabasePublishableKey}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Supabase ${table} request failed with ${response.status}`);
  }

  return response.json() as Promise<T[]>;
}

export async function loadPropertyData(): Promise<{ raw: PropertyRawData; source: "Supabase" }> {
  if (!hasSupabaseConfig) {
    throw new Error("Missing Supabase frontend environment variables.");
  }

  const [alerts, dailyUsage, dashboardKpis, dataQuality, hourlyUsage, modeTimeline] = await Promise.all([
    fetchTable<GeneratedAlert>("alerts", activePropertyId, "local_date"),
    fetchTable<DailyUsageRow>("daily_usage", activePropertyId, "local_date"),
    fetchTable<DashboardKpiRow>("dashboard_kpis", activePropertyId),
    fetchTable<DataQualityRow>("data_quality_daily", activePropertyId, "local_date"),
    fetchTable<HourlyUsageRow>("hourly_usage", activePropertyId, "local_date"),
    fetchTable<ModeTimelineRow>("mode_timeline", activePropertyId, "local_date"),
  ]);

  if (!dashboardKpis.length || !dailyUsage.length || !hourlyUsage.length) {
    throw new Error("Supabase returned an incomplete dashboard dataset");
  }

  return {
    raw: {
      id: activePropertyId,
      name: propertyNames[activePropertyId],
      alerts,
      dailyUsage,
      dashboardKpis,
      dataQuality,
      hourlyUsage,
      manifest: {
        source_files: 0,
        built_at: dashboardKpis[0]?.latest_reading_at ?? new Date().toISOString(),
        tables: {
          alerts: alerts.length,
          daily_usage: dailyUsage.length,
          trend_15min: 0,
        },
      },
      modeTimeline,
    },
    source: "Supabase",
  };
}
