import { describe, it, expect } from 'vitest';
import { base64URLEncode, generateCodeVerifier, generateCodeChallenge } from '../src/auth-pkce.js';

describe('PKCE Helpers', () => {
  it('should base64URL encode correctly', () => {
    const buffer = Buffer.from('Hello+World/Test=');
    const encoded = base64URLEncode(buffer);
    
    expect(encoded).not.toContain('+');
    expect(encoded).not.toContain('/');
    expect(encoded).not.toContain('=');
  });

  it('should generate a code verifier of correct length', () => {
    const verifier = generateCodeVerifier();
    // 32 bytes base64 encoded should be around 43 characters
    expect(verifier.length).toBeGreaterThanOrEqual(43);
  });

  it('should generate a deterministic code challenge from a verifier', () => {
    const verifier = 'test-verifier-string-that-is-long-enough-to-be-valid';
    const challenge1 = generateCodeChallenge(verifier);
    const challenge2 = generateCodeChallenge(verifier);
    
    expect(challenge1).toBe(challenge2);
    expect(challenge1).not.toBe(verifier);
  });
});
