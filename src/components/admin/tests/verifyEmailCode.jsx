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

const verifyEmailCodeTests = [
  {
    id: "vec_smoke_missing_fields",
    group: "verifyEmailCode",
    label: "Smoke — returns valid: false when email and code are absent",
    claudeHint: "Check base44/functions/verifyEmailCode/entry.ts — missing email and code must return { valid: false } without crashing.",
    run: async () => {
      const { status, data } = await callFn("verifyEmailCode", {});
      if (status !== 200) throw new Error(`Expected 200, got ${status}`);
      if (data.valid !== false) throw new Error(`Expected valid: false, got: ${JSON.stringify(data)}`);
      return `Passed — missing fields correctly returns valid: false`;
    },
  },
  {
    id: "vec_smoke_unknown_email",
    group: "verifyEmailCode",
    label: "Smoke — returns valid: false for unknown email",
    claudeHint: "Check base44/functions/verifyEmailCode/entry.ts — unknown email must return { valid: false } without crashing.",
    run: async () => {
      const { status, data } = await callFn("verifyEmailCode", {
        email: `unknown-${Date.now()}@integration.test`,
        code: "000000",
      });
      if (status !== 200) throw new Error(`Expected 200, got ${status}`);
      if (data.valid !== false) throw new Error(`Expected valid: false, got: ${JSON.stringify(data)}`);
      return `Passed — unknown email correctly returns valid: false`;
    },
  },
  {
    id: "vec_func_correct_code",
    group: "verifyEmailCode",
    label: "Functional — correct code returns valid: true and deletes the record",
    claudeHint: "Check base44/functions/verifyEmailCode/entry.ts — correct code must return { valid: true } and delete the EmailVerificationCode record.",
    run: async () => {
      const testEmail = `vec-correct-${Date.now()}@integration.test`;
      const testCode = "847291";
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
      const { data: seedData } = await callFn("seedTestBooking", {
        action: "createEmailVerificationCode",
        email: testEmail, code: testCode, expires_at: expiresAt,
      });
      if (!seedData?.id) throw new Error("Failed to seed EmailVerificationCode");
      const { data } = await callFn("verifyEmailCode", { email: testEmail, code: testCode });
      if (!data.valid) throw new Error(`Expected valid: true, got: ${JSON.stringify(data)}`);
      const { data: checkData } = await callFn("seedTestBooking", { action: "readEmailVerificationCode", email: testEmail });
      if (checkData.record !== null) {
        await callFn("seedTestBooking", { action: "deleteEmailVerificationCode", id: checkData.record.id });
        throw new Error("Code record was not deleted after successful verification");
      }
      return `Passed — correct code verified and record deleted from DB`;
    },
  },
  {
    id: "vec_func_wrong_code",
    group: "verifyEmailCode",
    label: "Functional — wrong code returns valid: false and leaves record intact",
    claudeHint: "Check base44/functions/verifyEmailCode/entry.ts — wrong code must return { valid: false } and must NOT delete the record.",
    run: async () => {
      const testEmail = `vec-wrong-${Date.now()}@integration.test`;
      const testCode = "123456";
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
      const { data: seedData } = await callFn("seedTestBooking", {
        action: "createEmailVerificationCode",
        email: testEmail, code: testCode, expires_at: expiresAt,
      });
      if (!seedData?.id) throw new Error("Failed to seed EmailVerificationCode");
      try {
        const { data } = await callFn("verifyEmailCode", { email: testEmail, code: "999999" });
        if (data.valid !== false) throw new Error(`Expected valid: false for wrong code, got: ${JSON.stringify(data)}`);
        const { data: checkData } = await callFn("seedTestBooking", { action: "readEmailVerificationCode", email: testEmail });
        if (!checkData.record) throw new Error("Code record was deleted after a wrong guess — must remain intact");
        return `Passed — wrong code rejected, record still intact`;
      } finally {
        await callFn("seedTestBooking", { action: "deleteEmailVerificationCode", id: seedData.id });
      }
    },
  },
  {
    id: "vec_func_expired_code",
    group: "verifyEmailCode",
    label: "Functional — expired code returns valid: false",
    claudeHint: "Check base44/functions/verifyEmailCode/entry.ts — a code with expires_at in the past must return { valid: false }.",
    run: async () => {
      const testEmail = `vec-expired-${Date.now()}@integration.test`;
      const testCode = "654321";
      const expiresAt = new Date(Date.now() - 1000).toISOString();
      const { data: seedData } = await callFn("seedTestBooking", {
        action: "createEmailVerificationCode",
        email: testEmail, code: testCode, expires_at: expiresAt,
      });
      if (!seedData?.id) throw new Error("Failed to seed expired EmailVerificationCode");
      try {
        const { data } = await callFn("verifyEmailCode", { email: testEmail, code: testCode });
        if (data.valid !== false) throw new Error(`Expected valid: false for expired code, got: ${JSON.stringify(data)}`);
        return `Passed — expired code correctly rejected`;
      } finally {
        const { data: checkData } = await callFn("seedTestBooking", { action: "readEmailVerificationCode", email: testEmail });
        if (checkData.record) await callFn("seedTestBooking", { action: "deleteEmailVerificationCode", id: checkData.record.id });
      }
    },
  },
  {
    id: "vec_func_sets_email_verified",
    group: "verifyEmailCode",
    label: "Functional — successful verification sets email_verified: true on UserCredentials",
    claudeHint: "Check base44/functions/verifyEmailCode/entry.ts — after valid: true, UserCredentials.email_verified must be updated to true.",
    run: async () => {
      const testEmail = `vec-cred-${Date.now()}@integration.test`;
      const testCode = "112233";
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
      const { data: credData } = await callFn("seedTestBooking", {
        action: "createUserCredentials",
        userCredentials: { email: testEmail, password_hash: "test_hash_not_real", email_verified: false },
      });
      if (!credData?.id) throw new Error("Failed to seed UserCredentials");
      await callFn("seedTestBooking", { action: "createEmailVerificationCode", email: testEmail, code: testCode, expires_at: expiresAt });
      try {
        const { data } = await callFn("verifyEmailCode", { email: testEmail, code: testCode, type: "guest" });
        if (!data.valid) throw new Error(`Expected valid: true, got: ${JSON.stringify(data)}`);
        await new Promise(r => setTimeout(r, 1000));
        const { data: credCheck } = await callFn("seedTestBooking", { action: "readUserCredentials", email: testEmail });
        if (!credCheck.record) throw new Error("UserCredentials record not found after verification");
        if (credCheck.record.email_verified !== true) throw new Error(`email_verified not set to true — got: ${credCheck.record.email_verified}`);
        return `Passed — email_verified correctly set to true after successful verification`;
      } finally {
        await callFn("seedTestBooking", { action: "deleteUserCredentials", id: credData.id });
        const { data: codeCheck } = await callFn("seedTestBooking", { action: "readEmailVerificationCode", email: testEmail });
        if (codeCheck.record) await callFn("seedTestBooking", { action: "deleteEmailVerificationCode", id: codeCheck.record.id });
      }
    },
  },
  {
    id: "vec_biz_resend_invalidates_old",
    group: "verifyEmailCode",
    label: "Business — resending code makes old code invalid, new code works",
    claudeHint: "Check base44/functions/sendVerificationCode/entry.ts — old codes must be deleted on resend so only the latest code is valid.",
    run: async () => {
      const testEmail = "hello@hostkeepdigital.co.uk";
      const { data: existing } = await callFn("seedTestBooking", { action: "readEmailVerificationCode", email: testEmail });
      if (existing.record) await callFn("seedTestBooking", { action: "deleteEmailVerificationCode", id: existing.record.id });
      await callFn("sendVerificationCode", { email: testEmail, name: "Test", type: "guest" });
      await new Promise(r => setTimeout(r, 500));
      const { data: firstData } = await callFn("seedTestBooking", { action: "readEmailVerificationCode", email: testEmail });
      const firstCode = firstData.record?.code;
      if (!firstCode) throw new Error("First code not found in DB");
      await callFn("sendVerificationCode", { email: testEmail, name: "Test", type: "guest" });
      await new Promise(r => setTimeout(r, 500));
      const { data: secondData } = await callFn("seedTestBooking", { action: "readEmailVerificationCode", email: testEmail });
      const secondCode = secondData.record?.code;
      if (!secondCode) throw new Error("Second code not found in DB");
      if (secondData.count !== 1) throw new Error(`Expected 1 code after resend, found ${secondData.count} — old code not deleted`);
      const { data: firstVerify } = await callFn("verifyEmailCode", { email: testEmail, code: firstCode });
      if (firstVerify.valid !== false) throw new Error(`Old code should be invalid but returned valid: true`);
      const { data: secondVerify } = await callFn("verifyEmailCode", { email: testEmail, code: secondCode });
      if (!secondVerify.valid) throw new Error(`New code should be valid but returned valid: false`);
      const { data: finalClean } = await callFn("seedTestBooking", { action: "readEmailVerificationCode", email: testEmail });
      if (finalClean.record) await callFn("seedTestBooking", { action: "deleteEmailVerificationCode", id: finalClean.record.id });
      return `Passed — old code rejected after resend, new code accepted`;
    },
  },
];

export { verifyEmailCodeTests };
export default verifyEmailCodeTests;