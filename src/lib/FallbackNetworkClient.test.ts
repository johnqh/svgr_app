import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createFallbackNetworkClient } from './FallbackNetworkClient';

const UID = 'nofb_0123456789abcdef0123';

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

describe('createFallbackNetworkClient', () => {
  beforeEach(() => vi.restoreAllMocks());
  afterEach(() => vi.restoreAllMocks());

  it('attaches the fallback bearer token on GET and parses JSON', async () => {
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(jsonResponse({ hello: 'world' }));
    const client = createFallbackNetworkClient(() => UID);

    const res = await client.get('https://api.example/x');

    expect(fetchSpy).toHaveBeenCalledWith(
      'https://api.example/x',
      expect.objectContaining({
        method: 'GET',
        headers: expect.objectContaining({ Authorization: `Bearer ${UID}` }),
      })
    );
    expect(res.ok).toBe(true);
    expect(res.status).toBe(200);
    expect(res.data).toEqual({ hello: 'world' });
  });

  it('serializes plain-object POST bodies as JSON with a content-type header', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(jsonResponse({ ok: true }));
    const client = createFallbackNetworkClient(() => UID);

    await client.post('https://api.example/jobs', { imageId: 'abc' });

    const init = fetchSpy.mock.calls[0][1] as RequestInit;
    expect(init.method).toBe('POST');
    expect(init.body).toBe(JSON.stringify({ imageId: 'abc' }));
    expect((init.headers as Record<string, string>)['Content-Type']).toBe('application/json');
  });

  it('passes FormData through without JSON-stringifying or forcing content-type', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(jsonResponse({ ok: true }));
    const client = createFallbackNetworkClient(() => UID);

    const form = new FormData();
    form.append('image', new Blob(['x']), 'a.png');
    await client.post('https://api.example/images/upload', form);

    const init = fetchSpy.mock.calls[0][1] as RequestInit;
    expect(init.body).toBe(form);
    const headers = init.headers as Record<string, string>;
    expect(headers['Content-Type']).toBeUndefined();
    expect(headers.Authorization).toBe(`Bearer ${UID}`);
  });

  it('returns a Blob as data for non-JSON responses (file downloads)', async () => {
    // jsdom cannot construct `new Response(blob)` (Blob lacks .stream()), so
    // hand-roll a minimal fetch Response with a non-JSON content-type.
    const blob = new Blob(['<svg/>'], { type: 'image/svg+xml' });
    const fakeResponse = {
      ok: true,
      status: 200,
      statusText: 'OK',
      headers: new Headers({ 'content-type': 'image/svg+xml' }),
      blob: async () => blob,
      json: async () => {
        throw new Error('not json');
      },
    } as unknown as Response;
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(fakeResponse);
    const client = createFallbackNetworkClient(() => UID);

    const res = await client.get('https://api.example/files/x.svg');
    expect(res.ok).toBe(true);
    expect(res.data).toBeInstanceOf(Blob);
  });
});
