import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

/**
 * Creates a Supabase admin client using the service role key.
 * This must ONLY be used server-side (API routes / Server Components).
 */
function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  if (!serviceKey) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is not set in environment variables.");
  }

  return createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

/* ── GET /api/sub-admin — list all sub-admin users ─────────────────────────── */
export async function GET() {
  try {
    const admin = getAdminClient();
    const { data, error } = await admin.auth.admin.listUsers();

    if (error) throw error;

    // Filter only sub_admin users
    const subAdmins = data.users
      .filter((u) => u.user_metadata?.role === "sub_admin")
      .map((u) => ({
        id: u.id,
        email: u.email,
        created_at: u.created_at,
        last_sign_in_at: u.last_sign_in_at,
        assigned_products: Array.isArray(u.user_metadata?.assigned_products)
          ? u.user_metadata.assigned_products
          : [],
        telegram_chat_id: u.user_metadata?.telegram_chat_id || null,
      }));

    return NextResponse.json(subAdmins);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

/* ── POST /api/sub-admin — create a new sub-admin user ─────────────────────── */
export async function POST(request: Request) {
  try {
    const { email, password, assigned_products, telegram_chat_id } = await request.json();

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required." }, { status: 400 });
    }

    if (password.length < 6) {
      return NextResponse.json({ error: "Password must be at least 6 characters." }, { status: 400 });
    }

    const admin = getAdminClient();
    const { data, error } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // skip confirmation email
      user_metadata: {
        role: "sub_admin",
        assigned_products: Array.isArray(assigned_products) ? assigned_products : [],
        telegram_chat_id: telegram_chat_id ? String(telegram_chat_id).trim() : null,
      },
    });

    if (error) throw error;

    return NextResponse.json({
      id: data.user.id,
      email: data.user.email,
      created_at: data.user.created_at,
      assigned_products: data.user.user_metadata?.assigned_products ?? [],
      telegram_chat_id: data.user.user_metadata?.telegram_chat_id ?? null,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

/* ── PUT /api/sub-admin — update an existing sub-admin user ───────────────── */
export async function PUT(request: Request) {
  try {
    const { id, assigned_products, telegram_chat_id, password } = await request.json();

    if (!id) {
      return NextResponse.json({ error: "User ID is required." }, { status: 400 });
    }

    const admin = getAdminClient();

    // Verify user exists and is a sub_admin
    const { data: userData, error: fetchError } = await admin.auth.admin.getUserById(id);
    if (fetchError) throw fetchError;

    if (userData.user.user_metadata?.role !== "sub_admin") {
      return NextResponse.json({ error: "You can only edit sub-admin accounts." }, { status: 403 });
    }

    const updatedMetadata = {
      ...userData.user.user_metadata,
      assigned_products: Array.isArray(assigned_products) ? assigned_products : [],
      telegram_chat_id: telegram_chat_id ? String(telegram_chat_id).trim() : null,
    };

    const updatePayload: { user_metadata: Record<string, unknown>; password?: string } = {
      user_metadata: updatedMetadata,
    };

    if (password && password.trim().length >= 6) {
      updatePayload.password = password.trim();
    }

    const { data: updatedUser, error: updateError } = await admin.auth.admin.updateUserById(
      id,
      updatePayload
    );

    if (updateError) throw updateError;

    return NextResponse.json({
      id: updatedUser.user.id,
      email: updatedUser.user.email,
      assigned_products: updatedUser.user.user_metadata?.assigned_products ?? [],
      telegram_chat_id: updatedUser.user.user_metadata?.telegram_chat_id ?? null,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

/* ── DELETE /api/sub-admin?id=<uid> — delete a sub-admin user ──────────────── */
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "User ID is required." }, { status: 400 });
    }

    const admin = getAdminClient();

    // Safety: verify the user is actually a sub_admin before deleting
    const { data: userData, error: fetchError } = await admin.auth.admin.getUserById(id);
    if (fetchError) throw fetchError;

    if (userData.user.user_metadata?.role !== "sub_admin") {
      return NextResponse.json({ error: "You can only delete sub-admin accounts." }, { status: 403 });
    }

    const { error } = await admin.auth.admin.deleteUser(id);
    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
