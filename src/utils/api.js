import { HttpClient, TokenManager } from "@forgerock/javascript-sdk";

/**
 * Make authenticated API requests
 * The HttpClient automatically includes the access token in the Authorization header
 */

export const apiClient = {
  /**
   * GET request
   * @param {string} url - The API endpoint URL
   * @returns {Promise<Response>}
   */
  async get(url) {
    try {
      const response = await HttpClient.request({
        url,
        init: {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        },
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status} ${response.statusText}`);
      }

      return response;
    } catch (err) {
      console.error("GET request failed:", err);
      throw err;
    }
  },

  /**
   * POST request
   * @param {string} url - The API endpoint URL
   * @param {object} data - The request body data
   * @returns {Promise<Response>}
   */
  async post(url, data) {
    try {
      const response = await HttpClient.request({
        url,
        init: {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(data),
        },
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status} ${response.statusText}`);
      }

      return response;
    } catch (err) {
      console.error("POST request failed:", err);
      throw err;
    }
  },

  /**
   * PUT request
   * @param {string} url - The API endpoint URL
   * @param {object} data - The request body data
   * @returns {Promise<Response>}
   */
  async put(url, data) {
    try {
      const response = await HttpClient.request({
        url,
        init: {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(data),
        },
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status} ${response.statusText}`);
      }

      return response;
    } catch (err) {
      console.error("PUT request failed:", err);
      throw err;
    }
  },

  /**
   * DELETE request
   * @param {string} url - The API endpoint URL
   * @returns {Promise<Response>}
   */
  async delete(url) {
    try {
      const response = await HttpClient.request({
        url,
        init: {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
          },
        },
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status} ${response.statusText}`);
      }

      return response;
    } catch (err) {
      console.error("DELETE request failed:", err);
      throw err;
    }
  },

  /**
   * PATCH request
   * @param {string} url - The API endpoint URL
   * @param {object} data - The request body data
   * @returns {Promise<Response>}
   */
  async patch(url, data) {
    try {
      const response = await HttpClient.request({
        url,
        init: {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(data),
        },
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status} ${response.statusText}`);
      }

      return response;
    } catch (err) {
      console.error("PATCH request failed:", err);
      throw err;
    }
  },
};

// Helper function to parse JSON response
export const parseResponse = async (response) => {
  const contentType = response.headers.get("content-type");
  if (contentType?.includes("application/json")) {
    return response.json();
  }
  return response.text();
};
