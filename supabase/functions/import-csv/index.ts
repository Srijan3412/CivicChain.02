import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';
import { v4 } from "https://deno.land/std/uuid/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Content-Type': 'application/json'
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const formData = await req.formData();
    const csvFile = formData.get('file') as File;
    if (!csvFile) return new Response(JSON.stringify({ error: 'No CSV file provided' }), { status: 400, headers: corsHeaders });

    const csvContent = await csvFile.text();
    const lines = csvContent.trim().split('\n');
    const headers = lines[0].split(',').map(h => h.trim());

    // Map CSV headers to table fields
    const budgetData: any[] = [];
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim());
      if (values.length !== headers.length) continue;

      const row: any = {};
      headers.forEach((header, idx) => {
        const h = header.toLowerCase();
        if (h === 'ward') row.account = values[idx];             // Map Ward -> account
        else if (h === 'year') row.glcode = values[idx];        // Map Year -> glcode
        else if (h === 'category') row.account_budget_a = values[idx];
        else if (h === 'amount') row.used_amt = parseFloat(values[idx].replace(/[$,]/g, ''));
      });

      row.remaining_amt = row.used_amt ? 0 : 0; // Or calculate if you have budget_a
      if (row.account && row.glcode && row.account_budget_a && !isNaN(row.used_amt)) {
        budgetData.push(row);
      }
    }

    if (budgetData.length === 0) return new Response(JSON.stringify({ error: 'No valid budget data found' }), { status: 400, headers: corsHeaders });

    const { data, error } = await supabase.from('municipal_budget').insert(budgetData);
    if (error) {
      console.error('Supabase insert error:', error);
      return new Response(JSON.stringify({ error: 'Failed to import budget data', details: error.message }), { status: 500, headers: corsHeaders });
    }

    return new Response(JSON.stringify({ message: `Imported ${budgetData.length} records successfully` }), { headers: corsHeaders });

  } catch (err) {
    console.error('Internal server error:', err);
    return new Response(JSON.stringify({ error: 'Internal server error', details: err.message }), { status: 500, headers: corsHeaders });
  }
});
