import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  const { data, error } = await supabase.rpc('exec_sql', {
    query: 'ALTER TABLE store_settings ADD COLUMN IF NOT EXISTS abandoned_telegram_alerts BOOLEAN DEFAULT true;'
  });

  if (error) {
    console.error('Error adding column, let\'s try directly:', error);
    
    // As a fallback, we can try to add the column using a query if rpc doesn't exist, but typically in Supabase we should use the migrations or direct postgres if possible. 
    // Since we don't have exec_sql unless defined, let's just create a raw postgres connection if possible or provide a manual sql query for the user to run in Supabase UI.
    console.log('If exec_sql fails, please run this in Supabase SQL editor: ALTER TABLE store_settings ADD COLUMN abandoned_telegram_alerts BOOLEAN DEFAULT true;');
  } else {
    console.log('Successfully added abandoned_telegram_alerts column');
  }
}

main();
