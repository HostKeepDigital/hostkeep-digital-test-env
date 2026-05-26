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

const setOnboardingPasswordTests = [
  {
    id: "sop_smoke_missing_token",
    group: "setOnboardingPassword",
    label: "Smoke — rejects request with missing onboarding_token",
    claudeHint: "Check base44/functions/setOnboardingPassword/entry.ts — missing onboarding_token must return 400 with { error: 'missing_fields' }.",
    run: async () => {
      const { status, data } = await callFn("setOnboardingPassword", { password: "TestPassword123!" });
      if (status !== 400) throw new Error(`Expected 400, got ${status}: ${JSON.stringify(data)}`);
      return `Passed — missing token correctly returned 400`;
    },
  },
  {
    id: "sop_smoke_missing_password",
    group: "setOnboardingPassword",
    label: "Smoke — rejects request with missing password",
    claudeHint: "Check base44/functions/setOnboardingPassword/entry.ts — missing password must return 400 with { error: 'missing_fields' }.",
    run: async () => {
      const { status, data } = await callFn("setOnboardingPassword", { onboarding_token: "test_token_smoke" });
      if (status !== 400) throw new Error(`Expected 400, got ${status}: ${JSON.stringify(data)}`);
      return `Passed — missing password correctly returned 400`;
    },
  },
  {
    id: "sop_smoke_invalid_token",
    group: "setOnboardingPassword",
    label: "Smoke — rejects invalid/expired token with 404",
    claudeHint: "Check base44/functions/setOnboardingPassword/entry.ts — a token that does not match any FoundingMember must return 404 with { error: 'token_not_found' } or similar.",
    run: async () => {
      const { status, data } = await callFn("setOnboardingPassword", {
        onboarding_token: "completely_fake_token_that_does_not_exist",
        password: "TestPassword123!",
      });
      if (status !== 404 && status !== 400) throw new Error(`Expected 404 or 400, got ${status}: ${JSON.stringify(data)}`);
      return `Passed — invalid token correctly rejected with ${status}`;
    },
  },
  {
    id: "sop_func_creates_user_and_credentials",
    group: "setOnboardingPassword",
    label: "Functional — valid token creates User, UserCredentials, and updates FoundingMember",
    claudeHint: "Check base44/functions/setOnboardingPassword/entry.ts — must create a User entity, a hashed UserCredentials record, and update FoundingMember.approval_status to 'password_protected'.",
    run: async () => {
      const testEmail = `sop-func-${Date.now()}@integration.test`;
      const fakeToken = `tok_integration_${Date.now()}`;
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();
      const { data: fmData } = await callFn("seedTestBooking", {
        action: "createFoundingMember",
        foundingMember: {
          forename: "Integration", surname: "Test", email: testEmail,
          role: "host", postcode: "TR1 1AA",
          approval_status: "invited",
          onboarding_token: fakeToken,
          onboarding_expires_at: expiresAt,
        },
      });
      if (!fmData?.id) throw new Error("Failed to seed FoundingMember");
      try {
        const { status, data } = await callFn("setOnboardingPassword", {
          onboarding_token: fakeToken,
          password: "TestPassword123!",
        });
        if (status !== 200 || !data.success) throw new Error(`Function failed: ${JSON.stringify(data)}`);
        await new Promise(r => setTimeout(r, 1000));
        const { data: credData } = await callFn("seedTestBooking", { action: "readUserCredentials", email: testEmail });
        if (!credData?.record) throw new Error("UserCredentials not created after setOnboardingPassword");
        const { data: fmCheck } = await callFn("seedTestBooking", { action: "readFoundingMemberByEmail", email: testEmail });
        if (fmCheck?.record?.approval_status !== "password_protected") throw new Error(`Expected approval_status 'password_protected', got '${fmCheck?.record?.approval_status}'`);
        return `Passed — User + UserCredentials created, FoundingMember set to password_protected`;
      } finally {
        const { data: credClean } = await callFn("seedTestBooking", { action: "readUserCredentials", email: testEmail });
        if (credClean?.record?.id) {
          const userId = credClean.record.user_id;
          await callFn("seedTestBooking", { action: "deleteUserCredentials", id: credClean.record.id });
          if (userId) await callFn("seedTestBooking", { action: "deleteUser", id: userId });
        }
        await callFn("seedTestBooking", { action: "deleteFoundingMember", id: fmData.id });
      }
    },
  },
  {
    id: "sop_func_expired_token_rejected",
    group: "setOnboardingPassword",
    label: "Functional — expired token is rejected even if it matches a FoundingMember",
    claudeHint: "Check base44/functions/setOnboardingPassword/entry.ts — onboarding_expires_at in the past must return 400 or 410 with { error: 'token_expired' }.",
    run: async () => {
      const testEmail = `sop-expired-${Date.now()}@integration.test`;
      const fakeToken = `tok_expired_${Date.now()}`;
      const expiredAt = new Date(Date.now() - 1000).toISOString();
      const { data: fmData } = await callFn("seedTestBooking", {
        action: "createFoundingMember",
        foundingMember: {
          forename: "Expired", surname: "Test", email: testEmail,
          role: "host", postcode: "TR1 1AA",
          approval_status: "invited",
          onboarding_token: fakeToken,
          onboarding_expires_at: expiredAt,
        },
      });
      if (!fmData?.id) throw new Error("Failed to seed FoundingMember");
      try {
        const { status, data } = await callFn("setOnboardingPassword", {
          onboarding_token: fakeToken,
          password: "TestPassword123!",
        });
        if (status === 200 && data.success) throw new Error("Expired token was accepted — must be rejected");
        return `Passed — expired token correctly rejected with ${status}`;
      } finally {
        await callFn("seedTestBooking", { action: "deleteFoundingMember", id: fmData.id });
      }
    },
  },
  {
    id: "sop_func_password_hashed",
    group: "setOnboardingPassword",
    label: "Functional — password is stored as a hash, not plaintext",
    claudeHint: "Check base44/functions/setOnboardingPassword/entry.ts — UserCredentials.password_hash must NOT equal the raw password.",
    run: async () => {
      const testEmail = `sop-hash-${Date.now()}@integration.test`;
      const fakeToken = `tok_hash_${Date.now()}`;
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();
      const rawPassword = "TestPassword123!";
      const { data: fmData } = await callFn("seedTestBooking", {
        action: "createFoundingMember",
        foundingMember: {
          forename: "Hash", surname: "Test", email: testEmail,
          role: "host", postcode: "TR1 1AA",
          approval_status: "invited",
          onboarding_token: fakeToken,
          onboarding_expires_at: expiresAt,
        },
      });
      if (!fmData?.id) throw new Error("Failed to seed FoundingMember");
      try {
        const { status, data } = await callFn("setOnboardingPassword", { onboarding_token: fakeToken, password: rawPassword });
        if (status !== 200 || !data.success) throw new Error(`Function failed: ${JSON.stringify(data)}`);
        await new Promise(r => setTimeout(r, 500));
        const { data: credData } = await callFn("seedTestBooking", { action: "readUserCredentials", email: testEmail });
        if (!credData?.record) throw new Error("UserCredentials not found");
        if (credData.record.password_hash === rawPassword) throw new Error("Password stored as plaintext — must be hashed");
        if (credData.record.password_hash.length < 16) throw new Error("password_hash suspiciously short — may not be a real hash");
        return `Passed — password stored as hash (length: ${credData.record.password_hash.length})`;
      } finally {
        const { data: credClean } = await callFn("seedTestBooking", { action: "readUserCredentials", email: testEmail });
        if (credClean?.record?.id) {
          const userId = credClean.record.user_id;
          await callFn("seedTestBooking", { action: "deleteUserCredentials", id: credClean.record.id });
          if (userId) await callFn("seedTestBooking", { action: "deleteUser", id: userId });
        }
        await callFn("seedTestBooking", { action: "deleteFoundingMember", id: fmData.id });
      }
    },
  },
  {
    id: "sop_biz_can_sign_in_after",
    group: "setOnboardingPassword",
    label: "Business — user can sign in immediately after setting password",
    claudeHint: "End-to-end regression: after setOnboardingPassword succeeds, customSignIn with the same email and password must return a valid session_token.",
    run: async () => {
      const testEmail = `sop-signin-${Date.now()}@integration.test`;
      const fakeToken = `tok_signin_${Date.now()}`;
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();
      const rawPassword = "TestPassword123!";
      const { data: fmData } = await callFn("seedTestBooking", {
        action: "createFoundingMember",
        foundingMember: {
          forename: "SignIn", surname: "Test", email: testEmail,
          role: "host", postcode: "TR1 1AA",
          approval_status: "invited",
          onboarding_token: fakeToken,
          onboarding_expires_at: expiresAt,
        },
      });
      if (!fmData?.id) throw new Error("Failed to seed FoundingMember");
      try {
        const { status, data } = await callFn("setOnboardingPassword", { onboarding_token: fakeToken, password: rawPassword });
        if (status !== 200 || !data.success) throw new Error(`setOnboardingPassword failed: ${JSON.stringify(data)}`);
        await new Promise(r => setTimeout(r, 500));
        const { status: signInStatus, data: signInData } = await callFn("customSignIn", { email: testEmail, password: rawPassword });
        if (signInStatus !== 200 || !signInData.success) throw new Error(`customSignIn failed: ${JSON.stringify(signInData)}`);
        if (!signInData.session_token) throw new Error("Sign in succeeded but no session_token returned");
        return `Passed — set password then signed in successfully`;
      } finally {
        const { data: credClean } = await callFn("seedTestBooking", { action: "readUserCredentials", email: testEmail });
        if (credClean?.record?.id) {
          const userId = credClean.record.user_id;
          await callFn("seedTestBooking", { action: "deleteUserCredentials", id: credClean.record.id });
          if (userId) await callFn("seedTestBooking", { action: "deleteUser", id: userId });
        }
        await callFn("seedTestBooking", { action: "deleteFoundingMember", id: fmData.id });
      }
    },
  },
];

export { setOnboardingPasswordTests };
export default setOnboardingPasswordTests;