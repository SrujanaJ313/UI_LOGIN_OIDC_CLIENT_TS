import { passwordPatterns } from "./constants";

export const validatePassword = (password) => {
  const errors = [];
  for (const key in passwordPatterns) {
    if (!passwordPatterns[key].pattern.test(password)) {
      errors.push({
        description: passwordPatterns[key].message,
        errorCode: "red",
      });
    } else {
      errors.push({
        description: passwordPatterns[key].message,
        errorCode: "green",
      });
    }
  }

  return errors;
};

export const encodeBase64 = (str) => {
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
  let result = "";
  let i = 0;
  while (i < str.length) {
    const a = str.charCodeAt(i++);
    const b = i < str.length ? str.charCodeAt(i++) : 0;
    const c = i < str.length ? str.charCodeAt(i++) : 0;
    const bitmap = (a << 16) | (b << 8) | c;
    result +=
      chars.charAt((bitmap >> 18) & 63) +
      chars.charAt((bitmap >> 12) & 63) +
      (i - 2 < str.length ? chars.charAt((bitmap >> 6) & 63) : "=") +
      (i - 1 < str.length ? chars.charAt(bitmap & 63) : "=");
  }
  return result;
};
