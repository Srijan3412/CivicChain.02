import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    let body;
    try {
      body = await req.json();
    } catch {
      return new Response(
        JSON.stringify({ error: "Invalid JSON body" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { department } = body;

    console.log(`Fetching municipal_budget data for department: ${department}`);

    if (!department) {
      return new Response(
        JSON.stringify({ error: "Department is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let query = supabase.from("municipal_budget")
      .select("*")
      .eq("account", department);

    // ✅ Add ward filter if present
    const ward = new URL(req.url).searchParams.get("ward");
    if (ward) query = query.eq("ward", ward);

    const { data, error } = await query.order("used_amt", { ascending: false });

    if (error) {
      console.error("Supabase query error:", error);
      return new Response(
        JSON.stringify({ error: "Failed to fetch municipal_budget data" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const transformedData = (data ?? []).map((item) => {
      const usedAmt = Number(item.used_amt ?? 0);
      const remainingAmt = Number(item.remaining_amt ?? 0);
      const budgetA = item.budget_a !== null ? Number(item.budget_a) : null;

      return {
        id: item.id,
        account: item.account,
        glcode: item.glcode,
        account_budget_a: item.account_budget_a,
        used_amt: isNaN(usedAmt) ? 0 : usedAmt,
        remaining_amt: isNaN(remainingAmt) ? 0 : remainingAmt,
        budget_a: budgetA,
        created_at: item.created_at,
      };
    });

    const validData = transformedData.filter((item) =>
      item.used_amt > 0 && item.account_budget_a
    );

    const totalBudget = validData.reduce((sum, item) => sum + item.used_amt, 0);
    const largestItem = validData.length > 0 ? validData[0] : null;

    const response = {
      budgetData: validData,
      summary: {
        totalBudget,
        largestCategory: largestItem
          ? { category: largestItem.account_budget_a, amount: largestItem.used_amt }
          : null,
        yearOverYearChange: 0,
      },
    };

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Unexpected error in get-budget function:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
