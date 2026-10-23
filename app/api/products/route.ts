import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

// DELETE /api/products?id=123
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Product ID is required' }, { status: 400 });
    }

    const numId = parseInt(id, 10);
    if (isNaN(numId)) {
      return NextResponse.json({ error: 'Invalid product ID' }, { status: 400 });
    }

    // 1. Delete associated showcase variants if any
    try {
      await supabase
        .from('showcase_variants')
        .delete()
        .eq('product_id', numId);
    } catch (showcaseErr) {
      console.warn('Could not delete showcase variants:', showcaseErr);
    }

    // 2. Delete product from products table
    const { error } = await supabase
      .from('products')
      .delete()
      .eq('id', numId);

    if (error) {
      console.error('Error deleting product from Supabase:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, id: numId });
  } catch (err: unknown) {
    console.error('Exception deleting product:', err);
    const message = err instanceof Error ? err.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
