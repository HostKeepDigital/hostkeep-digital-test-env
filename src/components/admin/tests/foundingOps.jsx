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

const seedMember = async (overrides = {}) => {
  const email = `fops-${Date.now()}-${Math.random().toString(36).slice(2, 7)}@integration.test`;
  const { data } = await callFn("seedTestBooking", {
    action: "createFoundingMember",
    foundingMember: {
      forename: "Ops", middle_name: "", surname: "Test",
      email, role: "host", postcode: "TR1 1AA",
      approval_status: "interest", email_verified: false,
      is_founding_member: true, signup_timestamp: new Date().toISOString(),
      ...overrides,
    },
  });
  return { id: data?.data?.id, email };
};

const cleanupMember = async (id) => {
  if (id) await callFn("seedTestBooking", { action: "deleteFoundingMember", id });
};

const foundingOpsTests = [
  {
    id: "fops_smoke_list_returns_array",
    group: "foundingOps",
    label: "Smoke — listMembers with admin session returns 200 and members array",
    claudeHint: "Check base44/functions/foundingOps/entry.ts — op:listMembers must return { members: [...] } as an array for an admin session.",
    run: async (sessionToken) => {
      if (!sessionToken) throw new Error("No session token available — log in as admin first");
      const { status, data } = await callFn("foundingOps", { op: "listMembers", session_token: sessionToken });
      if (status !== 200) throw new Error(`Expected 200, got ${status}: ${JSON.stringify(data)}`);
      if (!Array.isArray(data.members)) throw new Error(`Expected members array, got: ${JSON.stringify(data)}`);
      return `Passed — listMembers returned 200 with members array (count=${data.members.length})`;
    },
  },
  {
    id: "fops_func_seeded_member_visible",
    group: "foundingOps",
    label: "Functional — a seeded interest member appears in listMembers (the admin-read regression guard)",
    claudeHint: "This is the exact bug guard: AdminPanel must load members via foundingOps listMembers (service role), not FoundingMember.list() (RLS-blocked). A seeded record MUST appear in the result.",
    run: async (sessionToken) => {
      if (!sessionToken) throw new Error("No session token available — log in as admin first");
      const { id, email } = await seedMember();
      if (!id) throw new Error("Seed failed — could not create FoundingMember");
      try {
        const { status, data } = await callFn("foundingOps", { op: "listMembers", session_token: sessionToken });
        if (status !== 200) throw new Error(`Expected 200, got ${status}`);
        if (!Array.isArray(data.members)) throw new Error(`members not an array: ${JSON.stringify(data)}`);
        const found = data.members.find(m => m.id === id || m.email === email);
        if (!found) throw new Error(`Seeded member ${email} NOT visible in listMembers — admin read path is broken`);
        return `Passed — seeded member visible to admin via listMembers`;
      } finally {
        await cleanupMember(id);
      }
    },
  },
  {
    id: "fops_func_all_statuses_visible",
    group: "foundingOps",
    label: "Functional — banned and out_of_area members are BOTH visible (full-visibility rule)",
    claudeHint: "Admin must see who is where regardless of status. listMembers must never filter out any approval_status. Seeds one banned and one out_of_area member and asserts both appear.",
    run: async (sessionToken) => {
      if (!sessionToken) throw new Error("No session token available — log in as admin first");
      const banned = await seedMember({ approval_status: "banned" });
      const ooa = await seedMember({ approval_status: "out_of_area", postcode: "M1 1AE" });
      if (!banned.id || !ooa.id) throw new Error("Seed failed for one or both members");
      try {
        const { status, data } = await callFn("foundingOps", { op: "listMembers", session_token: sessionToken });
        if (status !== 200) throw new Error(`Expected 200, got ${status}`);
        const ids = (data.members || []).map(m => m.id);
        if (!ids.includes(banned.id)) throw new Error("banned member NOT visible — admin cannot see banned records");
        if (!ids.includes(ooa.id)) throw new Error("out_of_area member NOT visible — admin cannot see out_of_area records");
        return `Passed — banned and out_of_area members both visible to admin`;
      } finally {
        await cleanupMember(banned.id);
        await cleanupMember(ooa.id);
      }
    },
  },
  {
    id: "fops_neg_no_session_401",
    group: "foundingOps",
    label: "Negative — listMembers with no session returns 401 (PII leak guard)",
    claudeHint: "base44/functions/foundingOps/entry.ts — missing session_token must return 401. Harm: unauthenticated dump of every applicant's name, email, postcode.",
    run: async () => {
      const { status, data } = await callFn("foundingOps", { op: "listMembers" });
      if (status !== 401) throw new Error(`Expected 401, got ${status}: ${JSON.stringify(data)}`);
      if (Array.isArray(data.members)) throw new Error("members array returned without auth — PII LEAK");
      return `Passed — unauthenticated listMembers correctly rejected with 401`;
    },
  },
  {
    id: "fops_neg_invalid_session_401",
    group: "foundingOps",
    label: "Negative — listMembers with invalid session returns 401",
    claudeHint: "base44/functions/foundingOps/entry.ts — an invalid/expired session_token must fail the UserSession lookup and return 401, not leak data.",
    run: async () => {
      const { status, data } = await callFn("foundingOps", { op: "listMembers", session_token: "invalid_token_test_12345" });
      if (status !== 401) throw new Error(`Expected 401, got ${status}: ${JSON.stringify(data)}`);
      if (Array.isArray(data.members)) throw new Error("members array returned for invalid session — PII LEAK");
      return `Passed — invalid session correctly rejected with 401`;
    },
  },
];

export { foundingOpsTests };
export default foundingOpsTests;