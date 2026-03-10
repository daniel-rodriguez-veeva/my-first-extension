import dotenv from "dotenv";
import path from "path";
import os from "os";
import { fileURLToPath } from "url";
import defaults from "./defaults.json";
import logger from "./tools/logger";


// In ES modules, __dirname is not available by default.
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


logger.debug({__filename}, " is __filename in config.ts");
logger.debug({__dirname}, " is __dirname in config.ts");

// Clear all VAULT_ placeholders that might block dotenv from loading.
// Gemini CLI passes these if they are defined in gemini-extension.json but not set in the host environment.
for (const key in process.env) {
  if (key.startsWith("VAULT_") && process.env[key]?.startsWith("${")) {
    delete process.env[key];
  }
}

// 1. Try to load from the current working directory (user's project context override).
// This WILL take precedence over variables loaded in subsequent steps, but not over system environment variables.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
dotenv.config({ quiet: true } as any);

// 2. Try to load from the global Gemini extensions directory ('link' mode).
// When using 'gemini extensions link', the code runs from source but settings are in ~/.gemini/extensions/my-first-extension/.env
const geminiExtensionEnv = path.join(os.homedir(), ".gemini", "extensions", "my-first-extension", ".env");
logger.debug({geminiExtensionEnv}, "is geminiExtensionEnv in config.ts")
// eslint-disable-next-line @typescript-eslint/no-explicit-any
dotenv.config({ path: geminiExtensionEnv, quiet: true } as any);

// 3. Try to load from the extension's root directory (standard install).
// We assume this code runs from 'dist/', so we go up one level to find the project root.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
dotenv.config({ path: path.join(__dirname, "..", ".env"), quiet: true } as any);

export interface VaultConfig {
  dns: string;
  username: string;
  password?: string;
  sessionId?: string;
  apiVersion: string;
  authType: "BASIC" | "OAUTH";
  oauthClientId?: string;
  oauthIdpUrl?: string;
  oidcProfileId?: string;
  oauthRedirectUri?: string;
  vaultApiClientId?: string;
  missingFields: string[];
}

export function getConfig(): VaultConfig {
  // Helper to sanitize env vars
  const sanitize = (val: string | undefined) => {
    if (!val) return undefined;
    if (val.startsWith("${")) return undefined; // Placeholder
    let sanitized = val;
    if (sanitized.startsWith("'") && sanitized.endsWith("'")) sanitized = sanitized.slice(1, -1); // Strip single quotes
    if (sanitized.startsWith('"') && sanitized.endsWith('"')) sanitized = sanitized.slice(1, -1); // Strip double quotes
    // Remove protocol if present
    sanitized = sanitized.replace(/^https?:\/\//, "");
    // Remove trailing slash
    sanitized = sanitized.replace(/\/$/, "");
    return sanitized;
  };

  const dnsRaw = process.env.VAULT_DNS;
  console.error(`DEBUG: process.env.VAULT_DNS = "${dnsRaw}"`);
  const dns = sanitize(dnsRaw);
  const username = sanitize(process.env.VAULT_USERNAME);
  const password = sanitize(process.env.VAULT_PASSWORD);
  const sessionId = sanitize(process.env.VAULT_SESSION_ID);
  const authType = (sanitize(process.env.VAULT_AUTH_TYPE) || "OAUTH").toUpperCase() as "BASIC" | "OAUTH";

  // Use defaults if env vars are missing
  const oauthClientId = sanitize(process.env.VAULT_OAUTH_CLIENT_ID) || defaults.VAULT_OAUTH_CLIENT_ID;
  const oauthIdpUrl = sanitize(process.env.VAULT_OAUTH_IDP_URL) || defaults.VAULT_OAUTH_IDP_URL;
  const oidcProfileId = sanitize(process.env.VAULT_OIDC_PROFILE_ID) || defaults.VAULT_OIDC_PROFILE_ID;
  const oauthRedirectUri = sanitize(process.env.VAULT_OAUTH_REDIRECT_URI) || defaults.VAULT_OAUTH_REDIRECT_URI;
  const vaultApiClientId = sanitize(process.env.VAULT_API_CLIENT_ID) || defaults.VAULT_API_CLIENT_ID;

  const missingFields: string[] = [];
  if (!dns) missingFields.push("VAULT_DNS");

  if (!sessionId) {
    if (authType === "BASIC") {
      if (!username) missingFields.push("VAULT_USERNAME");
      if (!password) missingFields.push("VAULT_PASSWORD");
    } else {
      if (!oauthClientId) missingFields.push("VAULT_OAUTH_CLIENT_ID");
      if (!oauthIdpUrl) missingFields.push("VAULT_OAUTH_IDP_URL");
      if (!oidcProfileId) missingFields.push("VAULT_OIDC_PROFILE_ID");
    }
  }

  return {
    dns: dns || "",
    username: username || "",
    password: password || "",
    sessionId: sessionId,
    apiVersion: "v25.3",
    authType,
    oauthClientId,
    oauthIdpUrl,
    oidcProfileId,
    oauthRedirectUri,
    vaultApiClientId,
    missingFields,
  };
}

