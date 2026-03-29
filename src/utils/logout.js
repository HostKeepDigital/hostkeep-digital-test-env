export async function logout() {
  const token = localStorage.getItem("session_token");

  // Attempt to invalidate the session on the backend
  if (token) {
    try {
      await fetch("/functions/logoutSession", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session_token: token }),
      });
    } catch (err) {
      console.error("Logout error:", err);
    }
  }

  // Clear all local session data
  localStorage.removeItem("session_token");
  localStorage.removeItem("session_expires_at");

  // Hard redirect to signin (clears React state)
  window.location.href = "/signin";
}