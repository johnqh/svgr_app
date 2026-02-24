/**
 * Consumables (credit system) configuration and initialization.
 *
 * Integrates RevenueCat for in-app credit purchases and the Sudobility
 * consumables API for balance tracking and usage recording.
 *
 * Downloads (SVG and PDF) cost 1 credit each; the conversion itself is free.
 */

import {
  initializeConsumables,
  configureConsumablesWebAdapter,
  createConsumablesWebAdapter,
  ConsumablesApiClient,
} from "@sudobility/consumables_client";
import type { NetworkClient } from "@sudobility/types";
import { API_URL } from "./constants";

/** RevenueCat web API key for credit purchases. Empty string disables consumables. */
export const REVENUECAT_API_KEY =
  import.meta.env.VITE_REVENUECAT_API_KEY || "";

/** RevenueCat offering ID that contains the credit packages to display in the store. */
export const CONSUMABLES_OFFERING_ID =
  import.meta.env.VITE_CONSUMABLES_OFFERING_ID || "credits";

let initialized = false;

/**
 * Initializes the consumables service with RevenueCat and the API client.
 *
 * This is idempotent -- subsequent calls after the first are no-ops. If the
 * `VITE_REVENUECAT_API_KEY` environment variable is not set, consumables
 * are disabled and all downloads become free.
 *
 * Called from `AuthProviderWrapper` once Firebase Auth is ready, since
 * the consumables API client requires an authenticated network client.
 *
 * @param networkClient - Authenticated HTTP client (typically Firebase Auth-based)
 */
export function initializeConsumablesService(networkClient: NetworkClient) {
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
    apiClient: new ConsumablesApiClient({ baseUrl: API_URL, networkClient }),
  });

  initialized = true;
}
