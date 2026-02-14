import { useMemo, useCallback } from 'react';
import { SvgrClient } from '@sudobility/svgr_client';
import { useApiSafe } from '@sudobility/building_blocks/firebase';
import { API_URL } from '../config/constants';

export function useSvgrClient() {
  const api = useApiSafe();

  const getToken = useCallback(async () => {
    if (!api) return null;
    return api.token || (await api.refreshToken());
  }, [api]);

  return useMemo(
    () => new SvgrClient({ baseUrl: API_URL, getToken }),
    [getToken],
  );
}
