import { describe, it, expect, vi, beforeEach } from 'vitest';
import { VaultClient } from '../src/vault-client.js';
import axios from 'axios';

// Create a mock axios instance that we can control
const mockAxiosInstance = {
  defaults: { headers: { common: {} } },
  request: vi.fn(),
  post: vi.fn(),
  get: vi.fn(),
  put: vi.fn(),
  delete: vi.fn(),
};

vi.mock('axios', () => {
  return {
    default: {
      create: vi.fn(() => mockAxiosInstance),
      isAxiosError: vi.fn(() => false),
      post: vi.fn(), // for the OAuth login call
    },
  };
});

describe('VaultClient', () => {
  const mockConfig: any = {
    dns: 'test.vault.com',
    apiVersion: 'v25.3',
    missingFields: [],
    authType: 'BASIC',
    username: 'test-user',
    password: 'test-password',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockAxiosInstance.defaults.headers.common = {};
  });

  it('should use sessionId from config if provided', () => {
    const configWithSession = { ...mockConfig, sessionId: 'test-session-id' };
    const client = new VaultClient(configWithSession);
    
    expect(mockAxiosInstance.defaults.headers.common['Authorization']).toBe('test-session-id');
  });

  it('should throw error during authentication if missing fields exist', async () => {
    const configWithMissing = { ...mockConfig, missingFields: ['VAULT_DNS'] };
    const client = new VaultClient(configWithMissing);
    
    await expect(client.request({})).rejects.toThrow('Missing required configuration fields: VAULT_DNS');
  });

  it('should re-authenticate on 401 error', async () => {
    const client = new VaultClient({ ...mockConfig, sessionId: 'initial-session' });

    // 1. Initial request fails with 401
    mockAxiosInstance.request.mockResolvedValueOnce({ 
      status: 401, 
      data: { responseStatus: 'FAILURE' } 
    });

    // 2. Mock successful authentication (called within re-authentication flow)
    mockAxiosInstance.post.mockResolvedValueOnce({
      data: { responseStatus: 'SUCCESS', sessionId: 'new-session-id' }
    });

    // 3. Retry request succeeds
    mockAxiosInstance.request.mockResolvedValueOnce({ 
      status: 200, 
      data: { responseStatus: 'SUCCESS', value: 'data' } 
    });

    const result = await client.request({ method: 'GET', url: '/test' });

    expect(result).toEqual({ responseStatus: 'SUCCESS', value: 'data' });
    expect(mockAxiosInstance.post).toHaveBeenCalledWith('/auth', expect.any(URLSearchParams), expect.any(Object));
    expect(mockAxiosInstance.defaults.headers.common['Authorization']).toBe('new-session-id');
  });

  it('should handle INVALID_SESSION_ID failure in response data', async () => {
    const client = new VaultClient({ ...mockConfig, sessionId: 'initial-session' });

    // 1. Initial request returns INVALID_SESSION_ID error
    mockAxiosInstance.request.mockResolvedValueOnce({ 
      status: 200, 
      data: { 
        responseStatus: 'FAILURE', 
        errors: [{ type: 'INVALID_SESSION_ID' }] 
      } 
    });

    // 2. Mock successful authentication
    mockAxiosInstance.post.mockResolvedValueOnce({
      data: { responseStatus: 'SUCCESS', sessionId: 'new-session-id' }
    });

    // 3. Retry request succeeds
    mockAxiosInstance.request.mockResolvedValueOnce({ 
      status: 200, 
      data: { responseStatus: 'SUCCESS', value: 'data' } 
    });

    const result = await client.request({ method: 'GET', url: '/test' });

    expect(result).toEqual({ responseStatus: 'SUCCESS', value: 'data' });
    expect(mockAxiosInstance.defaults.headers.common['Authorization']).toBe('new-session-id');
  });
});
