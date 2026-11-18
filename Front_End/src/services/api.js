
const API_BASE_URL = "/api"; //Send the API request to the same origin from which the frontend was loaded.

async function apiRequest(endpoint, options = {}) {
    const headers = {
        "Content-Type": "application/json",
        ...options.headers
    };

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        ...options,
        headers: headers,
        credentials: "include"
    });

    const result = await response.json();

    if (!response.ok) {
        throw new Error(
            result.message || "Something went wrong with the request"
        );
    }

    return result;
}

export { API_BASE_URL, apiRequest };
