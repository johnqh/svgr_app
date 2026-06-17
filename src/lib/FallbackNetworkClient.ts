/**
 * A `fetch`-based NetworkClient used when Firebase Auth is unreachable.
 *
 * It attaches the unverified fallback identity (`Authorization: Bearer nofb_…`)
 * to every request. Unlike the Firebase network client it returns a `Blob` for
 * non-JSON responses, which the SVGR client's `fetchFile` relies on to download
 * SVG/PDF previews.
 */

import type { NetworkClient, NetworkRequestOptions, NetworkResponse } from '@sudobility/types';

export function createFallbackNetworkClient(getUid: () => string): NetworkClient {
  const withAuth = (extra?: Record<string, string> | null): Record<string, string> => ({
    ...(extra ?? {}),
    Authorization: `Bearer ${getUid()}`,
  });

  async function parse<T>(response: Response): Promise<NetworkResponse<T>> {
    const headers: Record<string, string> = {};
    response.headers.forEach((value, key) => {
      headers[key] = value;
    });
    const contentType = response.headers.get('content-type') ?? '';
    let data: unknown;
    if (contentType.includes('application/json')) {
      try {
        data = await response.json();
      } catch {
        /* empty/invalid JSON body */
      }
    } else {
      data = await response.blob();
    }
    return {
      ok: response.ok,
      status: response.status,
      statusText: response.statusText,
      headers,
      data: data as T,
      success: response.ok,
      timestamp: new Date().toISOString(),
    };
  }

  async function exec<T>(url: string, init: RequestInit): Promise<NetworkResponse<T>> {
    const response = await fetch(url, init);
    return parse<T>(response);
  }

  function buildBody(body: unknown, headers: Record<string, string>): BodyInit | undefined {
    if (body == null) return undefined;
    if (typeof FormData !== 'undefined' && body instanceof FormData) {
      return body; // let the browser set the multipart boundary
    }
    if (typeof body === 'string' || body instanceof Blob) {
      return body as BodyInit;
    }
    if (!headers['Content-Type'] && !headers['content-type']) {
      headers['Content-Type'] = 'application/json';
    }
    return JSON.stringify(body);
  }

  return {
    request<T = unknown>(url: string, options?: NetworkRequestOptions | null) {
      const headers = withAuth(options?.headers);
      return exec<T>(url, {
        method: options?.method ?? 'GET',
        headers,
        body: options?.body ?? undefined,
        signal: options?.signal ?? undefined,
      });
    },
    get<T = unknown>(url: string, options?: Omit<NetworkRequestOptions, 'method' | 'body'> | null) {
      return exec<T>(url, {
        method: 'GET',
        headers: withAuth(options?.headers),
        signal: options?.signal ?? undefined,
      });
    },
    post<T = unknown>(
      url: string,
      body?: unknown,
      options?: Omit<NetworkRequestOptions, 'method'> | null
    ) {
      const headers = withAuth(options?.headers);
      return exec<T>(url, {
        method: 'POST',
        headers,
        body: buildBody(body, headers),
        signal: options?.signal ?? undefined,
      });
    },
    put<T = unknown>(
      url: string,
      body?: unknown,
      options?: Omit<NetworkRequestOptions, 'method'> | null
    ) {
      const headers = withAuth(options?.headers);
      return exec<T>(url, {
        method: 'PUT',
        headers,
        body: buildBody(body, headers),
        signal: options?.signal ?? undefined,
      });
    },
    delete<T = unknown>(
      url: string,
      options?: Omit<NetworkRequestOptions, 'method' | 'body'> | null
    ) {
      return exec<T>(url, {
        method: 'DELETE',
        headers: withAuth(options?.headers),
        signal: options?.signal ?? undefined,
      });
    },
  };
}
