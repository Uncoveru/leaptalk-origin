import {hostAddr} from "@/config.js";

async function getUser() {
  const url = hostAddr + "/user";
  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data.user_id;
  } catch (error) {
    console.error("Failed to fetch user:", error);
    throw error;
  }
}

export {getUser};
