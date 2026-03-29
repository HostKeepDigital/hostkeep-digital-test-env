export async function logout() {
  const token = localStorage.getItem("session_token");

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

  localStorage.removeItem("session_token");
  localStorage.removeItem("session_expires_at");
  window.location.href = "/signin";
}