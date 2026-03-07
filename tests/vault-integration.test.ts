import { describe, it, expect, beforeEach, vi } from 'vitest';
import dotenv from 'dotenv';
import path from 'path';
import { getConfig } from '../src/config.js';
import { VaultClient } from '../src/vault-client.js';

/**
 * Vault Integration Test
 * 
 * This test verifies that the VaultClient can successfully authenticate
 * using the credentials provided in the .env file.
 */
describe('Vault Integration', () => {
  beforeEach(() => {
    // Clear VAULT_ environment variables to ensure they are loaded from the .env file
    // instead of the host machine's environment.
    Object.keys(process.env).forEach(key => {
      if (key.startsWith('VAULT_')) {
        delete process.env[key];
      }
    });

    // Manually load .env with override to ensure it's available in the test process
    const envPath = path.resolve(process.cwd(), '.env');
    dotenv.config({ path: envPath, override: true });
    
    // console.log('DEBUG: CWD:', process.cwd());
    // console.log('DEBUG: envPath:', envPath);
    // console.log('DEBUG: dns from env:', process.env.VAULT_DNS);
  });

  it('should successfully authenticate and retrieve object metadata', async () => {
    // 1. Load configuration from environment variables (loaded via .env)
    const config = getConfig();
    
    // Verify config is loaded correctly
    expect(config.dns).toBe('vaultsystemintegration-daniel.veevavault.com');
    expect(config.username).toBe('drtest@vaultsystemintegration.com');
    expect(config.authType).toBe('BASIC');
    expect(config.missingFields).toHaveLength(0);

    // 2. Initialize VaultClient
    const vaultClient = new VaultClient(config);

    try {
      // 3. Perform a request that triggers authentication.
      const response = await vaultClient.get<any>('/metadata/objects');

      // 4. Assert that the response is successful
      expect(response).toBeDefined();
      
      if (response.responseStatus !== 'SUCCESS') {
        console.error('Request failed with details:', JSON.stringify(response, null, 2));
      }

      expect(response.responseStatus).toBe('SUCCESS');
      expect(response.values).toBeDefined();
      
      const endpointCount = Object.keys(response.values).length;
      console.log('Successfully authenticated and retrieved metadata for ' + endpointCount + ' endpoints.');
    } catch (error: any) {
      // If authentication fails, VaultClient.request should throw an error.
      // We catch it here to provide a better failure message.
      console.error('Integration test failed with error:', error.message);
      throw error;
    }
  }, 10000); // Set timeout to 10s for network request
});
