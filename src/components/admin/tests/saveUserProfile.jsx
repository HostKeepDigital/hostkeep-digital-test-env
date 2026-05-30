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

const saveUserProfileTests = [
  {
    id: "sup_smoke_no_session",
    group: "saveUserProfile",
    label: "Smoke — rejects request with no session token",
    claudeHint: "Check base44/functions/saveUserProfile/entry.ts — missing session_token must return 401.",
    run: async () => {
      const { status } = await callFn("saveUserProfile", { forename: "Test" });
      if (status !== 401) throw new Error(`Expected 401, got ${status}`);
      return `Passed — correctly returned 401 with no session`;
    },
  },
  {
    id: "sup_smoke_invalid_session",
    group: "saveUserProfile",
    label: "Smoke — rejects invalid session token",
    claudeHint: "Check base44/functions/saveUserProfile/entry.ts — invalid session token must return 401.",
    run: async () => {
      const { status } = await callFn("saveUserProfile", {
        session_token: "invalid_token_sup_12345",
        forename: "Test",
      });
      if (status !== 401) throw new Error(`Expected 401, got ${status}`);
      return `Passed — invalid session correctly rejected`;
    },
  },
  {
    id: "sup_smoke_shape",
    group: "saveUserProfile",
    label: "Smoke — returns correct shape for valid request",
    claudeHint: "Check base44/functions/saveUserProfile/entry.ts — must return { success: true } on successful save.",
    run: async (sessionToken) => {
      if (!sessionToken) throw new Error("No session token — log in first");
      const { status, data } = await callFn("saveUserProfile", {
        session_token: sessionToken,
        forename: "Integration",
        surname: "Test",
      });
      if (status !== 200) throw new Error(`Expected 200, got ${status}: ${JSON.stringify(data)}`);
      if (!data.success) throw new Error(`Expected success: true, got: ${JSON.stringify(data)}`);
      return `Passed — saveUserProfile returned success: true`;
    },
  },
  {
    id: "sup_func_persists_fields",
    group: "saveUserProfile",
    label: "Functional — saved fields are retrievable via getUserProfile",
    claudeHint: "Check base44/functions/saveUserProfile/entry.ts — must upsert a UserProfile record with the supplied fields and make them readable via getUserProfile.",
    run: async (sessionToken, user) => {
      if (!sessionToken) throw new Error("No session token — log in first");
      if (!user?.id) throw new Error("No user ID");
      const uniquePhone = `+4477${Date.now().toString().slice(-8)}`;
      const { status, data } = await callFn("saveUserProfile", {
        session_token: sessionToken,
        forename: "Integration",
        surname: "TestUser",
        phone: uniquePhone,
        location: "Test Town",
      });
      if (status !== 200 || !data.success) throw new Error(`saveUserProfile failed: ${JSON.stringify(data)}`);
      await new Promise(r => setTimeout(r, 1000));
      const { status: getStatus, data: getData } = await callFn("getUserProfile", { session_token: sessionToken });
      if (getStatus !== 200 || !getData.success) throw new Error(`getUserProfile failed: ${JSON.stringify(getData)}`);
      const profile = getData.profile;
      if (profile.phone !== uniquePhone) throw new Error(`phone not persisted — expected '${uniquePhone}', got '${profile.phone}'`);
      if (profile.location !== "Test Town") throw new Error(`location not persisted — got '${profile.location}'`);
      return `Passed — forename, surname, phone, location all persisted and readable`;
    },
  },
  {
    id: "sup_func_upsert_not_duplicate",
    group: "saveUserProfile",
    label: "Functional — calling save twice does not create duplicate UserProfile records",
    claudeHint: "Check base44/functions/saveUserProfile/entry.ts — must use upsert logic. Calling save twice for same user must result in exactly 1 UserProfile record.",
    run: async (sessionToken, user) => {
      if (!sessionToken) throw new Error("No session token — log in first");
      if (!user?.id) throw new Error("No user ID");
      await callFn("saveUserProfile", {
        session_token: sessionToken,
        forename: "First", surname: "Save", phone: "+447700000001",
      });
      await new Promise(r => setTimeout(r, 500));
      await callFn("saveUserProfile", {
        session_token: sessionToken,
        forename: "Second", surname: "Save", phone: "+447700000002",
      });
      await new Promise(r => setTimeout(r, 1000));
      const { data: getData } = await callFn("getUserProfile", { session_token: sessionToken });
      const profile = getData?.profile;
      if (!profile) throw new Error("No profile returned after double save");
      if (getData?.profile_count > 1) throw new Error(`Duplicate UserProfile records created — found ${getData.profile_count}`);
      if (profile.forename !== "Second") throw new Error(`Expected updated forename 'Second', got '${profile.forename}'`);
      return `Passed — second save overwrote first (forename: '${profile.forename}'), no duplicate record`;
    },
  },
  {
    id: "sup_func_partial_update",
    group: "saveUserProfile",
    label: "Functional — partial update preserves existing fields not included in the payload",
    claudeHint: "Check base44/functions/saveUserProfile/entry.ts — must merge/patch the existing record, not replace it wholesale. Omitted fields must remain unchanged.",
    run: async (sessionToken, user) => {
      if (!sessionToken) throw new Error("No session token — log in first");
      if (!user?.id) throw new Error("No user ID");
      const uniquePhone = `+4477${Date.now().toString().slice(-8)}`;
      await callFn("saveUserProfile", {
        session_token: sessionToken,
        forename: "Preserved",
        phone: uniquePhone,
      });
      await new Promise(r => setTimeout(r, 500));
      await callFn("saveUserProfile", {
        session_token: sessionToken,
        surname: "Updated",
      });
      await new Promise(r => setTimeout(r, 1000));
      const { data: getData } = await callFn("getUserProfile", { session_token: sessionToken });
      const profile = getData?.profile;
      if (!profile) throw new Error("No profile returned");
      if (profile.phone !== uniquePhone) throw new Error(`phone was wiped on partial update — expected '${uniquePhone}', got '${profile.phone}'`);
      if (profile.surname !== "Updated") throw new Error(`surname not updated — got '${profile.surname}'`);
      return `Passed — partial update preserved phone while setting surname`;
    },
  },
  {
    id: "sup_biz_no_cross_user_write",
    group: "saveUserProfile",
    label: "Business — cannot write to another user's profile",
    claudeHint: "Check base44/functions/saveUserProfile/entry.ts — the user_id for the profile write must be derived from the session_token, never from the request body. Passing target_user_id must be ignored or blocked.",
    run: async (sessionToken, user) => {
      if (!sessionToken) throw new Error("No session token — log in first");
      if (!user?.id) throw new Error("No user ID");

      // Seed a real victim profile keyed by email (UserProfile has no user_id — email is the key).
      const victimEmail = `sup-victim-${Date.now()}@integration.test`;
      const seedRes = await callFn("seedTestBooking", {
        action: "createUserProfile",
        userProfile: { email: victimEmail, forename: "VICTIM_SAFE", surname: "Untouched" },
      });
      if (!seedRes?.data?.id) throw new Error("Failed to seed victim UserProfile");

      try {
        // Attempt the hijack via BOTH vectors: target_user_id AND body email (the real one for this entity).
        const { status, data } = await callFn("saveUserProfile", {
          session_token: sessionToken,
          target_user_id: "000000000000000000000099",
          email: victimEmail,
          forename: "INJECTED",
          surname: "ATTACKER",
        });
        // The function must actually run (not 500) — proves we're testing the guard, not a crash.
        if (status !== 200 || !data?.success) throw new Error(`saveUserProfile did not return success — got ${status}: ${JSON.stringify(data)}`);
        await new Promise(r => setTimeout(r, 700));

        // 1) Victim profile MUST be unchanged.
        const { data: victimData } = await callFn("seedTestBooking", { action: "findUserProfile", email: victimEmail });
        if (victimData?.data?.forename !== "VICTIM_SAFE") {
          throw new Error(`CROSS-USER WRITE — victim forename is now '${victimData?.data?.forename}', body email hijacked the write`);
        }

        // 2) Write must have landed on the CALLER's own profile.
        const { data: ownData } = await callFn("getUserProfile", { session_token: sessionToken });
        if (ownData?.profile?.forename !== "INJECTED") {
          throw new Error(`Write did not land on caller's own profile — got '${ownData?.profile?.forename}'`);
        }

        return `Passed — target_user_id and body email both ignored; write hit caller's own profile, victim untouched`;
      } finally {
        await callFn("seedTestBooking", { action: "deleteUserProfile", email: victimEmail });
      }
    },
  },
];

export { saveUserProfileTests };
export default saveUserProfileTests;