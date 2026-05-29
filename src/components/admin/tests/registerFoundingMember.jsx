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

const registerFoundingMemberTests = [
  {
    id: "rfm_smoke_missing_fields",
    group: "registerFoundingMember",
    label: "Smoke — rejects request with missing required fields",
    claudeHint: "Check base44/functions/registerFoundingMember/entry.ts — missing forename, surname, email, role, or postcode must return 400 with { error: 'missing_fields' }.",
    run: async () => {
      const { status, data } = await callFn("registerFoundingMember", {});
      if (status !== 400) throw new Error(`Expected 400, got ${status}: ${JSON.stringify(data)}`);
      return `Passed — missing fields correctly returned 400`;
    },
  },
  {
    id: "rfm_smoke_invalid_role",
    group: "registerFoundingMember",
    label: "Smoke — rejects invalid role value",
    claudeHint: "Check base44/functions/registerFoundingMember/entry.ts — role must be 'host' or 'cleaner'. Any other value must return 400.",
    run: async () => {
      const { status, data } = await callFn("registerFoundingMember", {
        forename: "Test", surname: "User", email: "test@integration.test",
        role: "invalid_role", postcode: "TR1 1AA",
      });
      if (status !== 400) throw new Error(`Expected 400, got ${status}: ${JSON.stringify(data)}`);
      return `Passed — invalid role correctly rejected with 400`;
    },
  },
  {
    id: "rfm_smoke_duplicate_email",
    group: "registerFoundingMember",
    label: "Smoke — rejects duplicate email with appropriate error",
    claudeHint: "Check base44/functions/registerFoundingMember/entry.ts — if a FoundingMember with this email already exists, must return 409 or { error: 'already_registered' }.",
    run: async () => {
      const testEmail = `rfm-dupe-${Date.now()}@integration.test`;
      await callFn("registerFoundingMember", {
        forename: "First", surname: "User", email: testEmail,
        role: "host", postcode: "TR1 1AA",
      });
      await new Promise(r => setTimeout(r, 500));
      const { status, data } = await callFn("registerFoundingMember", {
        forename: "Second", surname: "User", email: testEmail,
        role: "host", postcode: "TR1 1AA",
      });
      if (data.error !== "duplicate_email") throw new Error(`Expected duplicate_email, got ${status}: ${JSON.stringify(data)}`);
      await callFn("seedTestBooking", { action: "deleteFoundingMemberByEmail", email: testEmail });
      return `Passed — duplicate email correctly returned duplicate_email`;
    },
  },
  {
    id: "rfm_func_creates_record",
    group: "registerFoundingMember",
    label: "Functional — creates FoundingMember record with approval_status: interest",
    claudeHint: "Check base44/functions/registerFoundingMember/entry.ts — must create a FoundingMember record with approval_status: 'interest' and signup_timestamp set.",
    run: async () => {
      const testEmail = `rfm-create-${Date.now()}@integration.test`;
      const { status, data } = await callFn("registerFoundingMember", {
        forename: "Integration", surname: "Test", email: testEmail,
        role: "host", postcode: "TR1 1AA",
      });
      if (status !== 200 && status !== 201) throw new Error(`Expected 200/201, got ${status}: ${JSON.stringify(data)}`);
      await new Promise(r => setTimeout(r, 500));
      const { data: readData } = await callFn("seedTestBooking", { action: "readFoundingMemberByEmail", email: testEmail });
      await callFn("seedTestBooking", { action: "deleteFoundingMemberByEmail", email: testEmail });
      if (!readData?.record) throw new Error("FoundingMember record not found in DB after registration");
      if (readData.record.approval_status !== "interest") throw new Error(`Expected approval_status 'interest', got '${readData.record.approval_status}'`);
      if (!readData.record.signup_timestamp) throw new Error("signup_timestamp not set");
      return `Passed — FoundingMember created with approval_status: interest`;
    },
  },
  {
    id: "rfm_func_creates_record_in_interest_state",
    group: "registerFoundingMember",
    label: "Functional — creates the FoundingMember record (does NOT send the code; that is sendVerificationCode's job)",
    claudeHint: "registerFoundingMember is beta-only and owns record creation ONLY. Sending the verification code is a separate, permanent function (sendVerificationCode) called by FoundingHost.jsx. This test must assert the record is created in 'interest' state, NOT that an EmailVerificationCode exists.",
    run: async () => {
      const testEmail = `rfm-verify-${Date.now()}@integration.test`;
      const { status, data } = await callFn("registerFoundingMember", {
        forename: "Integration", surname: "Test", email: testEmail,
        role: "host", postcode: "TR1 1AA",
      });
      if (status !== 200 && status !== 201) throw new Error(`Expected 200/201, got ${status}: ${JSON.stringify(data)}`);
      await new Promise(r => setTimeout(r, 500));
      const { data: readData } = await callFn("seedTestBooking", { action: "readFoundingMemberByEmail", email: testEmail });
      await callFn("seedTestBooking", { action: "deleteFoundingMemberByEmail", email: testEmail });
      if (!readData?.record) throw new Error("No FoundingMember record created by registerFoundingMember");
      if (readData.record.approval_status !== "interest") throw new Error(`Expected approval_status 'interest', got '${readData.record.approval_status}'`);
      if (!readData.record.signup_timestamp) throw new Error("signup_timestamp not set on created record");
      return `Passed — FoundingMember created in 'interest' state (code-send correctly delegated to sendVerificationCode)`;
    },
  },
  {
    id: "rfm_func_stores_ref_code",
    group: "registerFoundingMember",
    label: "Functional — ref_code is stored on FoundingMember when provided",
    claudeHint: "Check base44/functions/registerFoundingMember/entry.ts — if ref_code is present in the request, it must be persisted on the FoundingMember record.",
    run: async () => {
      const testEmail = `rfm-ref-${Date.now()}@integration.test`;
      const { status, data } = await callFn("registerFoundingMember", {
        forename: "Integration", surname: "Test", email: testEmail,
        role: "host", postcode: "TR1 1AA", ref_code: "TESTREF123",
      });
      if (status !== 200 && status !== 201) throw new Error(`Expected 200/201, got ${status}: ${JSON.stringify(data)}`);
      await new Promise(r => setTimeout(r, 500));
      const { data: readData } = await callFn("seedTestBooking", { action: "readFoundingMemberByEmail", email: testEmail });
      await callFn("seedTestBooking", { action: "deleteFoundingMemberByEmail", email: testEmail });
      if (readData?.record?.ref_code !== "TESTREF123") throw new Error(`Expected ref_code 'TESTREF123', got '${readData?.record?.ref_code}'`);
      return `Passed — ref_code correctly stored on FoundingMember`;
    },
  },
  {
    id: "rfm_biz_host_and_cleaner",
    group: "registerFoundingMember",
    label: "Business — both host and cleaner roles accepted",
    claudeHint: "Check base44/functions/registerFoundingMember/entry.ts — both role: 'host' and role: 'cleaner' must succeed.",
    run: async () => {
      const hostEmail = `rfm-host-${Date.now()}@integration.test`;
      const cleanerEmail = `rfm-cleaner-${Date.now()}@integration.test`;
      const { status: hostStatus } = await callFn("registerFoundingMember", {
        forename: "Host", surname: "Test", email: hostEmail, role: "host", postcode: "TR1 1AA",
      });
      const { status: cleanerStatus } = await callFn("registerFoundingMember", {
        forename: "Cleaner", surname: "Test", email: cleanerEmail, role: "cleaner", postcode: "TR1 1AA",
      });
      await new Promise(r => setTimeout(r, 500));
      await callFn("seedTestBooking", { action: "deleteFoundingMemberByEmail", email: hostEmail });
      await callFn("seedTestBooking", { action: "deleteFoundingMemberByEmail", email: cleanerEmail });
      if (hostStatus !== 200 && hostStatus !== 201) throw new Error(`Host registration failed with ${hostStatus}`);
      if (cleanerStatus !== 200 && cleanerStatus !== 201) throw new Error(`Cleaner registration failed with ${cleanerStatus}`);
      return `Passed — both host and cleaner roles registered successfully`;
    },
  },
];

export { registerFoundingMemberTests };
export default registerFoundingMemberTests;