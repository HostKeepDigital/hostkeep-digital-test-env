import { logout } from "./logout";

export async function api(path, body = {}) {
  try {
    const res = await fetch(path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    let data;
    try {
      data = await res.json();
    } catch (err) {
      console.error("API JSON parse error:", err);
      throw err;
    }

    // Auto‑logout if backend reports expired session
    if (data?.error === "session_expired") {
      logout();
      return;
    }

    return data;
  } catch (err) {
    console.error("API error:", err);
    throw err;
  }
}