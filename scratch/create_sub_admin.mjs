/**
 * create_sub_admin.mjs
 *
 * Creates a new Supabase Auth user with role = "sub_admin".
 * The sub-admin can log into the dashboard but can only see:
 *   - Statistics (/dashboard)
 *   - Orders (/dashboard/orders)
 *
 * Usage:
 *   node scratch/create_sub_admin.mjs <email> <password>
 *
 * Requires SUPABASE_SERVICE_ROLE_KEY in .env.local
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

// ── Parse .env.local ──────────────────────────────────────────────────────────
const envFile = fs.readFileSync('.env.local', 'utf8');
const env = {};
envFile.split('\n').forEach((line) => {
  const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*?)?\s*$/);
  if (match) {
    let value = match[2] || '';
    if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
    if (value.startsWith("'") && value.endsWith("'")) value = value.slice(1, -1);
    env[match[1]] = value.trim();
  }
});

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('❌  Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
  process.exit(1);
}

// ── CLI args ──────────────────────────────────────────────────────────────────
const [email, password] = process.argv.slice(2);

if (!email || !password) {
  console.error('Usage: node scratch/create_sub_admin.mjs <email> <password>');
  process.exit(1);
}

// ── Supabase admin client (service role) ──────────────────────────────────────
const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// ── Create user ───────────────────────────────────────────────────────────────
async function main() {
  console.log(`Creating sub-admin user: ${email}`);

  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true, // skip confirmation email
    user_metadata: {
      role: 'sub_admin',
    },
  });

  if (error) {
    console.error('❌  Failed to create user:', error.message);
    process.exit(1);
  }

  console.log('✅  Sub-admin created successfully!');
  console.log(`   ID:    ${data.user.id}`);
  console.log(`   Email: ${data.user.email}`);
  console.log(`   Role:  ${data.user.user_metadata?.role}`);
  console.log('\n   This user can access: /dashboard and /dashboard/orders only.');
}

main();

