import { HttpClient } from "@forgerock/javascript-sdk";

/**
 * Make an API request with automatic token attachment
 * @param {string} url - The API endpoint URL
 * @param {object} options - Request options (method, body, headers, etc.)
 * @returns {Promise<Response>} - Fetch Response object
 */
export const apiRequest = async (url, options = {}) => {
  const { method = "GET", body, headers = {}, ...restOptions } = options;

  try {
    const response = await HttpClient.request({
      url,
      init: {
        method,
        headers: {
          "Content-Type": "application/json",
          ...headers,
        },
        body: body ? JSON.stringify(body) : undefined,
        ...restOptions,
      },
    });

    return response;
  } catch (error) {
    console.error("API request error:", error);
    throw error;
  }
};

/**
 * Convenience methods for common HTTP verbs
 */
export const get = (url, options = {}) => apiRequest(url, { ...options, method: "GET" });
export const post = (url, body, options = {}) => apiRequest(url, { ...options, method: "POST", body });
export const put = (url, body, options = {}) => apiRequest(url, { ...options, method: "PUT", body });
export const del = (url, options = {}) => apiRequest(url, { ...options, method: "DELETE" });

export default {
  request: apiRequest,
  get,
  post,
  put,
  delete: del,
};

