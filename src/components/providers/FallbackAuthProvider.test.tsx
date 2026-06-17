import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, act } from '@testing-library/react';

const mockUseAuthStatus = vi.fn();
const mockGetFirebaseAuth = vi.fn();

vi.mock('@sudobility/auth-components', () => ({
  useAuthStatus: () => mockUseAuthStatus(),
}));
vi.mock('@sudobility/auth_lib', () => ({
  getFirebaseAuth: () => mockGetFirebaseAuth(),
}));

import { FallbackAuthProvider } from './FallbackAuthProvider';
import { useFallbackIdentity } from './fallback-identity-context';

function Probe() {
  const { isFallback, fallbackUid } = useFallbackIdentity();
  return (
    <div>
      <span data-testid="isFallback">{String(isFallback)}</span>
      <span data-testid="uid">{fallbackUid ?? ''}</span>
    </div>
  );
}

function renderProvider() {
  return render(
    <FallbackAuthProvider>
      <Probe />
    </FallbackAuthProvider>
  );
}

describe('FallbackAuthProvider', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    localStorage.clear();
    mockGetFirebaseAuth.mockReturnValue({}); // configured by default
  });
  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it('stays out of fallback while a Firebase user exists', () => {
    mockUseAuthStatus.mockReturnValue({ user: { uid: 'real' }, loading: false });
    renderProvider();
    expect(screen.getByTestId('isFallback').textContent).toBe('false');
  });

  it('enters fallback immediately when Firebase is not configured', () => {
    mockGetFirebaseAuth.mockReturnValue(null);
    mockUseAuthStatus.mockReturnValue({ user: null, loading: true });
    renderProvider();
    expect(screen.getByTestId('isFallback').textContent).toBe('true');
    expect(screen.getByTestId('uid').textContent).toMatch(/^nofb_/);
  });

  it('enters fallback after the grace period when no user appears', () => {
    mockUseAuthStatus.mockReturnValue({ user: null, loading: false });
    renderProvider();
    expect(screen.getByTestId('isFallback').textContent).toBe('false');
    act(() => {
      vi.advanceTimersByTime(8000);
    });
    expect(screen.getByTestId('isFallback').textContent).toBe('true');
    expect(screen.getByTestId('uid').textContent).toMatch(/^nofb_/);
  });
});
