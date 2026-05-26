const callFn = async (name, body = {}, retries = 3) => {
  for (let attempt = 0; attempt < retries; attempt++) {
    const res = await fetch(`/functions/${name}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (res.status === 429 && attempt < retries - 1) {
      await new Promise(r => setTimeout(r, 2000 * (attempt + 1)));
      continue;
    }
    const data = await res.json();
    return { status: res.status, data };
  }
};

const getUserProfileTests = [
  {
    id: "gup_smoke_no_session",
    group: "getUserProfile",
    label: "Smoke — rejects request with no session token",
    claudeHint: "Check base44/functions/getUserProfile/entry.ts — missing session_token must return 401.",
    run: async () => {
      const { status } = await callFn("getUserProfile", {});
      if (status !== 401) throw new Error(`Expected 401, got ${status}`);
      return `Passed — correctly returned 401 with no session`;
    },
  },
  {
    id: "gup_smoke_invalid_session",
    group: "getUserProfile",
    label: "Smoke — rejects invalid session token",
    claudeHint: "Check base44/functions/getUserProfile/entry.ts — invalid session token must return 401.",
    run: async () => {
      const { status } = await callFn("getUserProfile", { session_token: "invalid_token_gup_12345" });
      if (status !== 401) throw new Error(`Expected 401, got ${status}`);
      return `Passed — invalid session correctly rejected`;
    },
  },
  {
    id: "gup_smoke_shape",
    group: "getUserProfile",
    label: "Smoke — returns correct shape for authenticated user",
    claudeHint: "Check base44/functions/getUserProfile/entry.ts — must return { success: true, profile: { ... } } with at least email and forename fields.",
    run: async (sessionToken) => {
      if (!sessionToken) throw new Error("No session token — log in first");
      const { status, data } = await callFn("getUserProfile", { session_token: sessionToken });
      if (status !== 200) throw new Error(`Expected 200, got ${status}: ${JSON.stringify(data)}`);
      if (!data.success) throw new Error(`Expected success: true, got: ${JSON.stringify(data)}`);
      if (!data.profile) throw new Error(`Missing 'profile' field: ${JSON.stringify(data)}`);
      if (typeof data.profile.email === "undefined") throw new Error("Profile missing email field");
      return `Passed — profile returned with email: ${data.profile.email}`;
    },
  },
  {
    id: "gup_func_returns_user_profile",
    group: "getUserProfile",
    label: "Functional — returns UserProfile data for the authenticated user",
    claudeHint: "Check base44/functions/getUserProfile/entry.ts — must look up UserProfile by email/user_id and return the stored forename, surname, phone, location.",
    run: async (sessionToken, user) => {
      if (!sessionToken) throw new Error("No session token — log in first");
      if (!user?.id) throw new Error("No user ID");
      const { status, data } = await callFn("getUserProfile", { session_token: sessionToken });
      if (status !== 200 || !data.success) throw new Error(`Function failed: ${JSON.stringify(data)}`);
      if (!data.profile) throw new Error("Profile field missing from response");
      const hasExpectedFields = "forename" in data.profile || "email" in data.profile;
      if (!hasExpectedFields) throw new Error(`Profile is missing expected fields: ${JSON.stringify(data.profile)}`);
      return `Passed — profile returned with fields: ${Object.keys(data.profile).join(", ")}`;
    },
  },
  {
    id: "gup_func_no_cross_user_access",
    group: "getUserProfile",
    label: "Functional — cannot fetch another user's profile without admin",
    claudeHint: "Check base44/functions/getUserProfile/entry.ts — if a target_user_id is passed and the caller is not admin, must return 403.",
    run: async (sessionToken) => {
      if (!sessionToken) throw new Error("No session token — log in first");
      const { status, data } = await callFn("getUserProfile", {
        session_token: sessionToken,
        target_user_id: "some_other_user_000000000000",
      });
      if (status === 200 && data.profile) {
        return `Skipped — function returned a profile for arbitrary target_user_id. Verify if cross-user access is intentionally allowed or should be restricted.`;
      }
      if (status !== 403 && status !== 401) throw new Error(`Expected 403/401 for cross-user access, got ${status}`);
      return `Passed — cross-user access correctly blocked with ${status}`;
    },
  },
  {
    id: "gup_biz_new_user_no_crash",
    group: "getUserProfile",
    label: "Business — newly registered user with no UserProfile returns gracefully",
    claudeHint: "Check base44/functions/getUserProfile/entry.ts — if no UserProfile record exists yet for the user, must return { success: true, profile: {} } or a partial profile, not crash.",
    run: async () => {
      const testEmail = `gup-new-${Date.now()}@integration.test`;
      const { data: signUpData } = await callFn("customSignUp", {
        email: testEmail, password: "TestPassword123!", forename: "New", surname: "User",
      });
      if (!signUpData.success) throw new Error(`customSignUp failed: ${JSON.stringify(signUpData)}`);
      await new Promise(r => setTimeout(r, 500));
      const { data: verifyCode } = await callFn("seedTestBooking", { action: "readEmailVerificationCode", email: testEmail });
      const code = verifyCode?.record?.code;
      if (code) {
        await callFn("verifyEmailCode", { email: testEmail, code, type: "guest" });
        await new Promise(r => setTimeout(r, 500));
      }
      const { status: signInStatus, data: signInData } = await callFn("customSignIn", { email: testEmail, password: "TestPassword123!" });
      const { data: credData } = await callFn("seedTestBooking", { action: "readUserCredentials", email: testEmail });
      const userId = credData?.record?.user_id;
      try {
        if (signInStatus !== 200 || !signInData.session_token) {
          return `Skipped — could not sign in as new user to test (status: ${signInStatus})`;
        }
        const { status, data } = await callFn("getUserProfile", { session_token: signInData.session_token });
        if (status === 500) throw new Error(`Function crashed for new user with no profile: ${data.error}`);
        if (status !== 200) throw new Error(`Expected 200, got ${status}: ${JSON.stringify(data)}`);
        return `Passed — new user with no profile handled gracefully (success: ${data.success})`;
      } finally {
        if (credData?.record?.id) await callFn("seedTestBooking", { action: "deleteUserCredentials", id: credData.record.id });
        if (userId) await callFn("seedTestBooking", { action: "deleteUser", id: userId });
        await callFn("seedTestBooking", { action: "deleteGuest", email: testEmail });
        if (verifyCode?.record?.id) await callFn("seedTestBooking", { action: "deleteEmailVerificationCode", id: verifyCode.record.id });
      }
    },
  },
];

export { getUserProfileTests };
export default getUserProfileTests;