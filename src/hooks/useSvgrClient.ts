import { useMemo } from 'react';
import { SvgrClient } from '@sudobility/svgr_client';
import { API_URL } from '../config/constants';

export function useSvgrClient() {
  return useMemo(() => new SvgrClient({ baseUrl: API_URL }), []);
}
