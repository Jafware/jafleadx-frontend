export const AUTH_TOKEN_STORAGE_KEY = "jafleadx-auth-token";

function isDevelopmentMode() {
  return Boolean(import.meta.env.DEV);
}

function getProcessEnvApiBaseUrl() {
  if (typeof globalThis === "undefined") {
    return "";
  }

  const processEnv = (globalThis as typeof globalThis & { process?: { env?: Record<string, string | undefined> } }).process?.env;
  return processEnv?.VITE_API_BASE_URL || "";
}

function sanitizeApiBaseUrl(value: string | undefined) {
  const trimmedValue = value?.trim() || "";

  if (!trimmedValue || /\$\{[^}]+\}/.test(trimmedValue)) {
    return "";
  }

  try {
    const parsedUrl = new URL(trimmedValue);

    if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") {
      return "";
    }

    const normalizedPath = parsedUrl.pathname.replace(/\/+$/, "");
    return `${parsedUrl.origin}${normalizedPath === "/" ? "" : normalizedPath}`;
  } catch {
    return "";
  }
}

function getConfiguredApiBaseUrlCandidate() {
  return import.meta.env.VITE_API_BASE_URL || getProcessEnvApiBaseUrl();
}

export function getApiBaseUrl() {
  const configuredBaseUrlCandidate = getConfiguredApiBaseUrlCandidate();
  const configuredBaseUrl = sanitizeApiBaseUrl(configuredBaseUrlCandidate);

  if (configuredBaseUrl) {
    return configuredBaseUrl;
  }

  if (configuredBaseUrlCandidate?.trim() && isDevelopmentMode()) {
    console.warn("Ignoring invalid VITE_API_BASE_URL. Falling back to current origin.", {
      value: configuredBaseUrlCandidate,
    });
  }

  if (typeof window !== "undefined") {
    return window.location.origin.replace(/\/+$/, "");
  }

  return "";
}

export function buildApiUrl(path: string) {
  if (/^https?:\/\//i.test(path)) {
    return path;
  }

  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${getApiBaseUrl()}${normalizedPath}`;
}

function getNetworkErrorMessage(url: string) {
  if (typeof window !== "undefined") {
    const pageProtocol = window.location.protocol;

    if (pageProtocol === "https:" && url.startsWith("http://")) {
      return "Unable to reach the API because the app is using HTTPS but the backend URL is HTTP. Please use an HTTPS backend URL.";
    }
  }

  return "Unable to reach the API. Please check your internet connection and make sure the backend URL is available.";
}

function logApiFetchFailure(error: unknown, url: string) {
  if (!isDevelopmentMode()) {
    return;
  }

  console.warn("API request failed before receiving a response.", {
    url,
    apiBaseUrl: getApiBaseUrl(),
    error,
  });
}

export function getAuthToken() {
  if (typeof window === "undefined") {
    return null;
  }

  return window.localStorage.getItem(AUTH_TOKEN_STORAGE_KEY);
}

export function setAuthToken(token: string) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, token);
}

export function clearAuthToken() {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY);
}

export async function apiFetch(path: string, init: RequestInit = {}) {
  const headers = new Headers(init.headers || {});
  const token = getAuthToken();
  const url = buildApiUrl(path);

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  try {
    return await fetch(url, {
      ...init,
      headers,
    });
  } catch (error) {
    logApiFetchFailure(error, url);
    throw new Error(getNetworkErrorMessage(url));
  }
}

export async function parseApiJson<T>(response: Response): Promise<T> {
  const contentType = response.headers.get("content-type") || "";
  const rawText = await response.text();

  if (!rawText) {
    return {} as T;
  }

  if (!contentType.includes("application/json")) {
    const preview = rawText.slice(0, 120).trim();
    throw new Error(preview.startsWith("<") ? "API returned HTML instead of JSON." : "API returned a non-JSON response.");
  }

  try {
    return JSON.parse(rawText) as T;
  } catch {
    throw new Error("API returned invalid JSON.");
  }
}
