import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

async function hashPassword(password, salt) {
  const encoder = new TextEncoder();
  const data = encoder.encode(password + salt);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

const ACCOUNTS = [
  { email: 'tyleris1192@gmail.com',        forename: 'Tyler', surname: 'Clarke',  role: 'host',    full_name: 'Tyler Clarke', postcode: 'PL132JE' },
  { email: 'hkdcleaner@outlook.com',        forename: 'HKD',   surname: 'Cleaner', role: 'cleaner', full_name: 'HKD Cleaner',  postcode: 'PL11AA'  },
  { email: 'tyler.d.clarke@hotmail.com',    forename: 'Tyler', surname: 'Clarke',  role: 'guest',   full_name: 'Tyler Clarke', postcode: 'PL11AA'  },
];

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const sr = base44.asServiceRole;

    const body = await req.json().catch(() => ({}));
    const { secret } = body;

    // Simple secret check to prevent abuse
    if (secret !== 'seed_test_accounts_2026') {
      return Response.json({ error: 'forbidden' }, { status: 403 });
    }

    const salt = Deno.env.get('HASH_SALT') || '';
    const password_hash = await hashPassword('Test123!', salt);
    const results = [];

    for (const acc of ACCOUNTS) {
      const log = { email: acc.email, steps: [] };

      // 1. Find or create User
      let user;
      const existingUsers = await sr.entities.User.filter({ email: acc.email });
      if (existingUsers?.[0]) {
        user = existingUsers[0];
        log.steps.push('user: already exists');
      } else {
        user = await sr.entities.User.create({
          email: acc.email,
          forename: acc.forename,
          surname: acc.surname,
          full_name: acc.full_name,
        });
        log.steps.push('user: created');
      }

      // 2. Create or update UserCredentials
      const existingCreds = await sr.entities.UserCredentials.filter({ email: acc.email });
      if (existingCreds?.[0]) {
        await sr.entities.UserCredentials.update(existingCreds[0].id, { password_hash, user_id: user.id, email_verified: true });
        log.steps.push('credentials: updated');
      } else {
        await sr.entities.UserCredentials.create({ email: acc.email, password_hash, user_id: user.id, email_verified: true });
        log.steps.push('credentials: created');
      }

      // 3. Create UserRole (skip if exists)
      const existingRoles = await sr.entities.UserRole.filter({ user_id: user.id });
      const hasRole = existingRoles?.some(r => r.role === acc.role);
      if (!hasRole) {
        await sr.entities.UserRole.create({ user_id: user.id, role: acc.role, approval_status: 'approved' });
        log.steps.push(`role: created (${acc.role})`);
      } else {
        log.steps.push(`role: already exists (${acc.role})`);
      }

      // 4. Create UserProfile
      const existingProfiles = await sr.entities.UserProfile.filter({ email: acc.email });
      if (!existingProfiles?.[0]) {
        await sr.entities.UserProfile.create({ email: acc.email, forename: acc.forename, surname: acc.surname, full_name: acc.full_name });
        log.steps.push('profile: created');
      } else {
        log.steps.push('profile: already exists');
      }

      // 5. If guest, ensure Guest record exists
      if (acc.role === 'guest') {
        const existingGuests = await sr.entities.Guest.filter({ email: acc.email });
        if (!existingGuests?.[0]) {
          await sr.entities.Guest.create({ email: acc.email, forename: acc.forename, surname: acc.surname, full_name: acc.full_name });
          log.steps.push('guest: created');
        } else {
          log.steps.push('guest: already exists');
        }
      }

      // 6. Update FoundingMember with user_id
      const members = await sr.entities.FoundingMember.filter({ email: acc.email });
      if (members?.[0]) {
        await sr.entities.FoundingMember.update(members[0].id, { user_id: user.id, approval_status: 'approved' });
        log.steps.push('founding_member: user_id linked');
      }

      results.push(log);
    }

    return Response.json({ success: true, results });
  } catch (err) {
    console.error('seedTestAccounts error:', err);
    return Response.json({ success: false, error: err.message }, { status: 500 });
  }
});