import { createHash, randomBytes } from "crypto";
import http from "http";
import { exec } from "child_process";
import axios from "axios";
import { URL } from "url";

export interface PkceAuthOptions {
  clientId: string;
  idpUrl: string; // e.g. https://veevasys.okta.com/oauth2/v1
  redirectUri?: string;
  scopes?: string[];
  state?: string;
  timeoutMs?: number;
}

export interface IdpTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  scope: string;
  id_token?: string;
}

/**
 * Base64URL encode
 */
export function base64URLEncode(str: Buffer): string {
  return str.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}

/**
 * Generates a random code verifier
 */
export function generateCodeVerifier(): string {
  return base64URLEncode(randomBytes(32));
}

/**
 * Generates a code challenge from the verifier
 */
export function generateCodeChallenge(verifier: string): string {
  const hash = createHash("sha256").update(verifier).digest();
  return base64URLEncode(hash);
}

/**
 * Open URL in default browser
 */
function openBrowser(url: string) {
  const start = process.platform == "darwin" ? "open" : process.platform == "win32" ? "start" : "xdg-open";
  exec(`${start} "${url}"`);
}

/**
 * Main flow to get IDP Access Token
 */
export async function authenticateWithPkce(options: PkceAuthOptions): Promise<IdpTokenResponse> {
  const redirectUri = options.redirectUri || "http://localhost:8080/callback";
  const port = new URL(redirectUri).port || "8080";
  const codeVerifier = generateCodeVerifier();
  const codeChallenge = generateCodeChallenge(codeVerifier);
  const state = options.state || base64URLEncode(randomBytes(16));
  const timeoutMs = options.timeoutMs || 300000; // Default 5 minutes

  // Construct Auth URL
  const authUrl = new URL(`${options.idpUrl}/authorize`);
  authUrl.searchParams.append("client_id", options.clientId);
  authUrl.searchParams.append("response_type", "code");
  authUrl.searchParams.append("scope", (options.scopes || ["openid", "profile", "email"]).join(" "));
  authUrl.searchParams.append("redirect_uri", redirectUri);
  authUrl.searchParams.append("state", state);
  authUrl.searchParams.append("code_challenge_method", "S256");
  authUrl.searchParams.append("code_challenge", codeChallenge);

  return new Promise((resolve, reject) => {
    let timeoutTimer: NodeJS.Timeout;

    const server = http.createServer(async (req, res) => {
      try {
        if (!req.url) return;
        const reqUrl = new URL(req.url, `http://localhost:${port}`);

        if (reqUrl.pathname === new URL(redirectUri).pathname) {
          const code = reqUrl.searchParams.get("code");
          const returnedState = reqUrl.searchParams.get("state");
          const error = reqUrl.searchParams.get("error");

          if (error) {
            res.writeHead(400, { "Content-Type": "text/html" });
            res.end(`<h1>Authentication Failed</h1><p>${error}</p>`);
            cleanup();
            reject(new Error(`Auth error: ${error}`));
            return;
          }

          if (returnedState !== state) {
            res.writeHead(400, { "Content-Type": "text/html" });
            res.end(`<h1>Authentication Failed</h1><p>State mismatch</p>`);
            cleanup();
            reject(new Error("State mismatch"));
            return;
          }

          if (code) {
            res.writeHead(200, { "Content-Type": "text/html" });
            res.end("<h1>Authentication Successful</h1><p>You can close this window now.</p>");

            // Exchange code for token
            try {
              const tokenResponse = await axios.post(
                `${options.idpUrl}/token`,
                new URLSearchParams({
                  grant_type: "authorization_code",
                  client_id: options.clientId,
                  redirect_uri: redirectUri,
                  code: code,
                  code_verifier: codeVerifier,
                }),
                {
                  headers: { "Content-Type": "application/x-www-form-urlencoded" },
                },
              );

              resolve(tokenResponse.data);
            } catch (err: unknown) {
              const message = err instanceof Error ? err.message : String(err);
              reject(new Error(`Token exchange failed: ${message}`));
            } finally {
              cleanup();
            }
          }
        }
      } catch (e: unknown) {
        reject(e instanceof Error ? e : new Error(String(e)));
        cleanup();
      }
    });

    const cleanup = () => {
      clearTimeout(timeoutTimer);
      server.closeAllConnections();
      server.close();
    };

    timeoutTimer = setTimeout(() => {
      cleanup();
      reject(new Error("Authentication timed out after 5 minutes."));
    }, timeoutMs);

    server.listen(parseInt(port), () => {
      console.error(`Please authenticate in your browser: ${authUrl.toString()}`);
      openBrowser(authUrl.toString());
    });

    server.on("error", (err: any) => {
      clearTimeout(timeoutTimer);
      if (err.code === "EADDRINUSE") {
        reject(new Error(`Failed to start local server: Port ${port} is already in use. Please close any other processes using this port or use VAULT_SESSION_ID.`));
      } else {
        reject(new Error(`Failed to start local server: ${err.message}`));
      }
    });
  });
}
