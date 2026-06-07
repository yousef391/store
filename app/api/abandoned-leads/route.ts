import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// GET - Fetch all abandoned leads
export async function GET() {
  try {
    const { data, error } = await supabase
      .from('abandoned_leads')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching abandoned leads:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data || []);
  } catch (err) {
    console.error('Exception fetching abandoned leads:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT - Update status, reduce price, or convert to order
export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { id, action, ...updates } = body;

    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 });
    }

    // Action: update status
    if (action === 'update_status') {
      const { status } = updates;
      const { error } = await supabase.from('abandoned_leads').update({
        status,
        contacted: status !== 'new',
        contacted_at: status !== 'new' ? new Date().toISOString() : null,
      }).eq('id', id);

      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ success: true });
    }

    // Action: save reduced price
    if (action === 'reduce_price') {
      const { reduced_price, reduced_total, contact_notes } = updates;
      const { error } = await supabase.from('abandoned_leads').update({
        reduced_price,
        reduced_total,
        contact_notes,
        status: 'contacted',
        contacted: true,
        contacted_at: new Date().toISOString(),
      }).eq('id', id);

      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ success: true });
    }

    // Action: convert to order
    if (action === 'convert') {
      const { lead } = updates;

      const price = lead.reduced_price || lead.original_price || '0';
      const total = lead.reduced_total || lead.original_total || '0';

      const { data: orderData, error: orderError } = await supabase.from('orders').insert([{
        name: lead.name,
        phone: lead.phone,
        wilaya: lead.wilaya,
        commune: lead.commune,
        item: lead.item,
        color: lead.color,
        size: lead.size,
        quantity: lead.quantity,
        price,
        delivery: lead.delivery,
        total,
        status: 'confirmed',
      }]).select('id').single();

      if (orderError) {
        console.error('Error converting lead:', orderError);
        return NextResponse.json({ error: orderError.message }, { status: 500 });
      }

      // Mark lead as converted
      await supabase.from('abandoned_leads').update({
        converted: true,
        status: 'converted',
        converted_order_id: orderData.id,
      }).eq('id', id);

      return NextResponse.json({ success: true, orderId: orderData.id });
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (err) {
    console.error('Exception updating abandoned lead:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE - Remove an abandoned lead
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 });
    }

    const { error } = await supabase.from('abandoned_leads').delete().eq('id', id);

    if (error) {
      console.error('Error deleting abandoned lead:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Exception deleting abandoned lead:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
