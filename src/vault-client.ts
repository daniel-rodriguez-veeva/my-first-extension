import axios, { type AxiosInstance, type AxiosRequestConfig } from "axios";
import { VaultConfig } from "./config.js";
import { authenticateWithPkce } from "./auth-pkce.js";

export class VaultClient {
  private axiosInstance: AxiosInstance;
  private config: VaultConfig;
  private sessionId: string | null = null;

  constructor(config: VaultConfig) {
    this.config = config;
    this.axiosInstance = axios.create({
      baseURL: `https://${config.dns}/api/${config.apiVersion}`,
      validateStatus: (status) => status < 500, // Handle 4xx errors manually
    });

    // If sessionId is provided in config, use it immediately
    if (this.config.sessionId) {
      this.sessionId = this.config.sessionId;
      this.axiosInstance.defaults.headers.common["Authorization"] = this.sessionId;
      console.error("Using provided VAULT_SESSION_ID for authentication.");
    }

  }

  /**
   * authenticates with Vault to obtain a Session ID.
   */
  private async authenticate(): Promise<void> {
    if (this.config.missingFields.length > 0) {
      throw new Error(
        `Cannot authenticate: Missing required configuration fields: ${this.config.missingFields.join(", ")}. Please use 'gemini extensions config my-first-extension' to set them.`,
      );
    }

    if (this.config.authType === "OAUTH") {
      await this.authenticateOAuth();
    } else {
      await this.authenticateBasic();
    }
  }

  private async authenticateBasic(): Promise<void> {
    if (!this.config.password) {
      throw new Error("Cannot authenticate: Password is missing.");
    }

    try {
      // Form-encoded data is standard for Vault auth, but JSON works on newer APIs.
      // We will use standard URLSearchParams for x-www-form-urlencoded compatibility just in case.
      const params = new URLSearchParams();
      params.append("username", this.config.username);
      params.append("password", this.config.password);

      const response = await this.axiosInstance.post("/auth", params, {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
      });

      if (response.data.responseStatus === "SUCCESS") {
        this.sessionId = response.data.sessionId;
        // Set default header for future requests
        this.axiosInstance.defaults.headers.common["Authorization"] = this.sessionId;
        console.error("Successfully authenticated with Veeva Vault (Basic).");
      } else {
        throw new Error(`Authentication failed: ${JSON.stringify(response.data)}`);
      }
    } catch (error) {
      console.error("Authentication error details:", error);
      throw error;
    }
  }

  private async authenticateOAuth(): Promise<void> {
    try {
      console.error("Starting OAuth 2.0 PKCE flow...");

      if (!this.config.oauthClientId || !this.config.oauthIdpUrl || !this.config.oidcProfileId) {
        throw new Error("Missing OAuth configuration (ClientId, IdpUrl, or ProfileId).");
      }

      // 1. Get IdP Token via PKCE
      const idpToken = await authenticateWithPkce({
        clientId: this.config.oauthClientId,
        idpUrl: this.config.oauthIdpUrl,
        redirectUri: this.config.oauthRedirectUri,
        scopes: ["openid"],
      });

      console.error("IdP authentication successful. Exchanging for Vault Session...");

      // 2. Exchange IdP Token for Vault Session ID
      // Note: We use a raw axios call here because the domain is different (login.veevavault.com)
      const vaultLoginUrl = `https://login.veevavault.com/auth/oauth/session/${this.config.oidcProfileId}`;
      const params = new URLSearchParams();
      params.append("vaultDNS", this.config.dns);
      params.append("client_id", this.config.vaultApiClientId || "VeevaVaultApi");

      const response = await axios.post(vaultLoginUrl, params, {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Authorization: `Bearer ${idpToken.access_token}`,
          Accept: "application/json",
        },
        validateStatus: (status) => status < 500,
      });

      if (response.data.responseStatus === "SUCCESS") {
        this.sessionId = response.data.sessionId;
        this.axiosInstance.defaults.headers.common["Authorization"] = this.sessionId;
        console.error("Successfully authenticated with Veeva Vault (OAuth).");
      } else {
        throw new Error(`Vault Session Exchange failed: ${JSON.stringify(response.data)}`);
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      console.error("OAuth error details:", message);
      throw error;
    }
  }

  /**
   * Generic request wrapper that handles authentication and session refresh.
   */
  public async request<T = unknown>(config: AxiosRequestConfig): Promise<T> {
    // If no session, authenticate first
    if (!this.sessionId) {
      await this.authenticate();
    }

    // Prepare headers (Authorization is already in defaults if session exists)
    const requestConfig = {
      ...config,
      headers: {
        ...config.headers,
        Accept: "application/json",
      },
    };

    // Fix for next_page URLs which might be root-relative (/api/vXX/...)
    // If it starts with /api/, it's likely root-relative to the DNS, bypassing the /api/vXX baseURL.
    if (requestConfig.url && requestConfig.url.startsWith("/api/")) {
      requestConfig.baseURL = `https://${this.config.dns}`;
    }

    try {
      const response = await this.axiosInstance.request(requestConfig);

      // Check for Invalid Session error (Response Status "FAILURE" with specific error types if payload exists)
      // Or 401 status code
      const isSessionExpired =
        response.status === 401 ||
        (response.data &&
          response.data.responseStatus === "FAILURE" &&
          (response.data.errors as Array<{ type: string }> | undefined)?.[0]?.type === "INVALID_SESSION_ID");

      if (isSessionExpired) {
        console.error("Session expired. Re-authenticating...");
        this.sessionId = null;
        delete this.axiosInstance.defaults.headers.common["Authorization"];

        await this.authenticate();

        // Retry original request
        return (await this.axiosInstance.request(config)).data as T;
      }

      return response.data as T;
    } catch (error) {
      // Check if it's an Axios error that wasn't caught by validateStatus
      if (axios.isAxiosError(error)) {
        throw new Error(`Request failed: ${error.message} (BaseURL: ${this.axiosInstance.defaults.baseURL})`);
      }
      // Handle generic errors (like "Invalid URL" from Node internals)
      if (error instanceof Error) {
        throw new Error(`Request failed: ${error.message} (BaseURL: ${this.axiosInstance.defaults.baseURL})`);
      }
      throw error;
    }
  }

  /**
   * Helper for GET requests
   */
  public async get<T = unknown>(path: string, params?: unknown): Promise<T> {
    return this.request<T>({ method: "GET", url: path, params });
  }

  /**
   * Helper for POST requests
   */
  public async post<T = unknown>(path: string, data?: unknown): Promise<T> {
    return this.request<T>({ method: "POST", url: path, data });
  }

  /**
   * Helper for PUT requests
   */
  public async put<T = unknown>(path: string, data?: unknown): Promise<T> {
    return this.request<T>({ method: "PUT", url: path, data });
  }

  /**
   * Helper for DELETE requests
   */
  public async delete<T = unknown>(path: string, config?: AxiosRequestConfig): Promise<T> {
    return this.request<T>({ method: "DELETE", url: path, ...config });
  }
}
