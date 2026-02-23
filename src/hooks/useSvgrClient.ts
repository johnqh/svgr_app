import { useMemo } from 'react';
import { SvgrClient } from '@sudobility/svgr_client';
import { useApiSafe } from '@sudobility/building_blocks/firebase';
import { useFirebaseAuthNetworkClient } from '@sudobility/auth_lib';
import { API_URL } from '../config/constants';

export function useSvgrClient() {
  const api = useApiSafe();
  const fallbackNetworkClient = useFirebaseAuthNetworkClient();
  const networkClient = api?.networkClient ?? fallbackNetworkClient;

  return useMemo(
    () => new SvgrClient({ baseUrl: API_URL, networkClient }),
    [networkClient],
  );
}
