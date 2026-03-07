import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { getConfig } from '../src/config.js';

describe('Config Authentication', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
    // Clear relevant VAULT_ env vars to start fresh for each test
    Object.keys(process.env).forEach(key => {
      if (key.startsWith('VAULT_')) {
        delete process.env[key];
      }
    });
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('BASIC Authentication', () => {
    it('should identify missing username and password for BASIC auth', () => {
      process.env.VAULT_DNS = 'https://test.vault.com';
      process.env.VAULT_AUTH_TYPE = 'BASIC';
      
      const config = getConfig();
      
      expect(config.authType).toBe('BASIC');
      expect(config.missingFields).toContain('VAULT_USERNAME');
      expect(config.missingFields).toContain('VAULT_PASSWORD');
    });

    it('should be valid when username and password are provided for BASIC auth', () => {
      process.env.VAULT_DNS = 'https://test.vault.com';
      process.env.VAULT_AUTH_TYPE = 'BASIC';
      process.env.VAULT_USERNAME = 'test-user';
      process.env.VAULT_PASSWORD = 'test-password';
      
      const config = getConfig();
      
      expect(config.authType).toBe('BASIC');
      expect(config.missingFields).not.toContain('VAULT_USERNAME');
      expect(config.missingFields).not.toContain('VAULT_PASSWORD');
      expect(config.username).toBe('test-user');
      expect(config.password).toBe('test-password');
    });
  });

  describe('OAUTH Authentication', () => {
    it('should default to OAUTH auth type', () => {
      process.env.VAULT_DNS = 'https://test.vault.com';
      
      const config = getConfig();
      
      expect(config.authType).toBe('OAUTH');
    });

    it('should use default OAuth values if not provided in env', () => {
      process.env.VAULT_DNS = 'https://test.vault.com';
      process.env.VAULT_AUTH_TYPE = 'OAUTH';
      
      const config = getConfig();
      
      expect(config.authType).toBe('OAUTH');
      expect(config.oauthClientId).toBeDefined();
      expect(config.oauthIdpUrl).toBeDefined();
      expect(config.missingFields).not.toContain('VAULT_OAUTH_CLIENT_ID');
    });

    it('should not require other credentials if sessionId is provided', () => {
      process.env.VAULT_DNS = 'https://test.vault.com';
      process.env.VAULT_SESSION_ID = 'test-session';
      process.env.VAULT_AUTH_TYPE = 'BASIC';
      
      const config = getConfig();
      
      expect(config.sessionId).toBe('test-session');
      expect(config.missingFields).not.toContain('VAULT_USERNAME');
      expect(config.missingFields).not.toContain('VAULT_PASSWORD');
    });
  });

  describe('Sanitization', () => {
    it('should strip quotes from environment variables', () => {
      process.env.VAULT_DNS = '"https://test.vault.com"';
      process.env.VAULT_USERNAME = "'test-user'";
      
      const config = getConfig();
      
      expect(config.dns).toBe('https://test.vault.com');
      expect(config.username).toBe('test-user');
    });

    it('should handle placeholder values as undefined', () => {
      process.env.VAULT_DNS = 'https://test.vault.com';
      process.env.VAULT_AUTH_TYPE = 'BASIC';
      process.env.VAULT_USERNAME = '${VAULT_USERNAME}';
      
      const config = getConfig();
      
      expect(config.username).toBe('');
      expect(config.missingFields).toContain('VAULT_USERNAME');
    });
  });
});
