const TOKEN_STORAGE_KEY =
  "smart_h2s_auth_token";

let memoryToken: string | null = null;

function hasLocalStorage(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof window.localStorage !== "undefined"
  );
}

export function getStoredToken():
string | null {
  if (hasLocalStorage()) {
    return window.localStorage.getItem(
      TOKEN_STORAGE_KEY,
    );
  }

  return memoryToken;
}

export function setStoredToken(
  token: string,
): void {
  if (hasLocalStorage()) {
    window.localStorage.setItem(
      TOKEN_STORAGE_KEY,
      token,
    );
    return;
  }

  memoryToken = token;
}

export function clearStoredToken():
void {
  if (hasLocalStorage()) {
    window.localStorage.removeItem(
      TOKEN_STORAGE_KEY,
    );
  }

  memoryToken = null;
}

export function hasStoredToken():
boolean {
  return Boolean(
    getStoredToken(),
  );
}

export {
  TOKEN_STORAGE_KEY,
};