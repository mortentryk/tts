import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET() {
  try {
    const { data: plans, error } = await supabaseAdmin
      .from('subscription_plans')
      .select('id, name, description, price, interval, is_active')
      .eq('is_active', true)
      .order('price', { ascending: true });

    if (error) {
      console.error('Error fetching plans:', error);
      return NextResponse.json({ error: 'Failed to fetch plans' }, { status: 500 });
    }

    return NextResponse.json(plans || []);
  } catch (error: any) {
    console.error('Error in subscription-plans API:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

