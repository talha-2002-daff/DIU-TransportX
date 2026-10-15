
import { apiRequest } from "./api.js";

async function getStudentBusInformation() {
    const result = await apiRequest("/buses/student/information", {
        method: "GET"
    });

    if (!result.success) {
        throw new Error(
            result.message || "Failed to retrieve bus information."
        );
    }

    return result.buses;
}

export { getStudentBusInformation };
