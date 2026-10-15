
/*we are generating API request frrom here also grab the res */

const API_BASE_URL = "http://localhost:3000/api"; // commoo part in the variable

async function apiRequest(endpoint, options = {}) { // which backend endpoint to call
    const headers = {
        "Content-Type": "application/json", // option: HTTP method and request body-details about the request
        ...options.headers //"The data I am sending in the request body is formatted as JSON."
    };

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        ...options,
        headers: headers,
        credentials: "include" // ask the brower to use the cookie in the req and res
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

