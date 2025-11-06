const storagePrefix = "Forge_app_";
const storage = {
  getUnlockAuthorization: () => {
    return JSON.parse(
      window.sessionStorage.getItem(`${storagePrefix}isUnlockable`)
    );
  },
  setUnlockAuthorization: (isUnlockable) => {
    window.sessionStorage.setItem(
      `${storagePrefix}isUnlockable`,
      JSON.stringify(isUnlockable)
    );
  },
  getToken: () => {
    const token = window.sessionStorage.getItem(`${storagePrefix}token`);
    if (!token) return null;
    try {
      return JSON.parse(token);
    } catch (e) {
      // If parsing fails, return the raw token (might be stored as plain string)
      return token;
    }
  },
  setToken: (token) => {
    window.sessionStorage.setItem(
      `${storagePrefix}token`,
      JSON.stringify(token)
    );
  },
  clearToken: () => {
    window.sessionStorage.removeItem(`${storagePrefix}token`);
  },
  set(key, payload) {
    if (key) {
      window.sessionStorage.setItem(
        `${storagePrefix}${key}`,
        JSON.stringify(payload)
      );
    }
  },
  get(key) {
    return JSON.parse(window.sessionStorage.getItem(`${storagePrefix}${key}`));
  },
  clear: (key) => {
    if (key) {
      window.sessionStorage.removeItem(`${storagePrefix}${key}`);
    }
  },
  clearAll: () => {
    window.sessionStorage.clear();
  },
};
export default storage;
