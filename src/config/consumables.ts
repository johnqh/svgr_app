import {
  initializeConsumables,
  configureConsumablesWebAdapter,
  createConsumablesWebAdapter,
  ConsumablesApiClient,
} from "@sudobility/consumables_client";
import { API_URL } from "./constants";

export const REVENUECAT_API_KEY =
  import.meta.env.VITE_REVENUECAT_API_KEY || "";
export const CONSUMABLES_OFFERING_ID =
  import.meta.env.VITE_CONSUMABLES_OFFERING_ID || "credits";

let initialized = false;

export function initializeConsumablesService(
  getToken: () => Promise<string | null>,
) {
  if (initialized) return;
  if (!REVENUECAT_API_KEY) {
    console.warn(
      "[consumables] VITE_REVENUECAT_API_KEY not set, consumables disabled",
    );
    return;
  }

  configureConsumablesWebAdapter(REVENUECAT_API_KEY);

  initializeConsumables({
    adapter: createConsumablesWebAdapter(),
    apiClient: new ConsumablesApiClient({ baseUrl: API_URL, getToken }),
  });

  initialized = true;
}
