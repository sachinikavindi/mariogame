const COOKIE_NAME = "mario_virtual_identity";
const COOKIE_DAYS = 365;

export function getVirtualIdentityCookie() {
  if (typeof document === "undefined") return null;
  const parts = document.cookie.split(";");
  for (const part of parts) {
    const [key, value] = part.split("=").map((s) => s.trim());
    if (key === COOKIE_NAME && value) {
      try {
        return decodeURIComponent(value);
      } catch {
        return value;
      }
    }
  }
  return null;
}

export function setVirtualIdentityCookie(name) {
  if (typeof document === "undefined" || !name || typeof name !== "string") return;
  const value = encodeURIComponent(String(name).slice(0, 80));
  const expires = new Date();
  expires.setTime(expires.getTime() + COOKIE_DAYS * 24 * 60 * 60 * 1000);
  document.cookie = `${COOKIE_NAME}=${value}; path=/; expires=${expires.toUTCString()}; SameSite=Lax`;
}
