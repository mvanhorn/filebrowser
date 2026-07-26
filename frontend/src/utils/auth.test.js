import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  setCurrentUser: vi.fn(),
}));

vi.mock('@/store', () => ({
  getters: {},
  mutations: {
    setCurrentUser: mocks.setCurrentUser,
  },
  state: {},
}));

vi.mock('@/utils/constants', () => ({
  globalVars: {
    baseURL: '/fbq/',
  },
}));

vi.mock('@/utils/url.js', () => ({
  getApiPath: vi.fn(() => '/fbq/api/auth/logout'),
}));

import { logout } from './auth.js';

describe('logout', () => {
  let fetchMock;

  beforeEach(() => {
    vi.useFakeTimers();
    fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    vi.stubGlobal('window', {
      location: {
        href: '',
      },
    });
    mocks.setCurrentUser.mockReset();
    document.cookie = 'filebrowser_quantum_jwt=session; path=/';
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('uses an explicit share redirect and clears local authentication', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({
        logoutUrl: 'https://identity.example/logout',
      }),
    });

    await logout('/public/share/hash/folder%20name');

    expect(document.cookie).not.toContain('filebrowser_quantum_jwt');
    expect(mocks.setCurrentUser).toHaveBeenCalledWith(null);
    expect(vi.getTimerCount()).toBe(1);

    await vi.runAllTimersAsync();

    expect(window.location.href).toBe('/public/share/hash/folder%20name');
  });

  it('preserves the backend logout URL without an override', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({
        logoutUrl: 'https://identity.example/logout',
      }),
    });

    await logout();
    await vi.runAllTimersAsync();

    expect(window.location.href).toBe('https://identity.example/logout');
  });

  it('falls back to the configured base URL', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({}),
    });

    await logout();
    await vi.runAllTimersAsync();

    expect(window.location.href).toBe('/fbq/login');
  });

  it('does not redirect when the logout response is unsuccessful', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    fetchMock.mockResolvedValue({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
    });

    await logout();

    expect(vi.getTimerCount()).toBe(0);
    expect(window.location.href).toBe('');
    expect(error).toHaveBeenCalledWith(
      'Logout API call failed:',
      500,
      'Internal Server Error',
    );
  });

  it('does not redirect when the logout request is rejected', async () => {
    const requestError = new Error('network unavailable');
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    fetchMock.mockRejectedValue(requestError);

    await logout();

    expect(vi.getTimerCount()).toBe(0);
    expect(window.location.href).toBe('');
    expect(error).toHaveBeenCalledWith(
      'An error occurred during logout:',
      requestError,
    );
  });

  it('does not redirect when the successful response is malformed', async () => {
    const parseError = new SyntaxError('invalid JSON');
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    fetchMock.mockResolvedValue({
      ok: true,
      json: vi.fn().mockRejectedValue(parseError),
    });

    await logout();

    expect(vi.getTimerCount()).toBe(0);
    expect(window.location.href).toBe('');
    expect(error).toHaveBeenCalledWith(
      'An error occurred during logout:',
      parseError,
    );
  });
});
