import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // ✅ Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { department, ward } = await req.json();

    console.log(
      `Fetching municipal_budget data for department: ${department}, ward: ${ward}`,
    );

    // ✅ Input validation
    if (!department) {
      return new Response(
        JSON.stringify({ error: "Department is required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // ✅ Build query (filter by department account)
    let query = supabase.from("municipal_budget")
      .select("*")
      .eq("account", department);

    // ✅ Ward filter (if ward column exists in your schema)
    if (ward && ward !== "all") {
      console.log(`Ward filtering not implemented. Received: ${ward}`);
      // Example if you later add a ward column:
      // query = query.eq("ward", ward);
    }

    const { data, error } = await query.order("used_amt", { ascending: false });

    if (error) {
      console.error("Supabase query error:", error);
      return new Response(
        JSON.stringify({ error: "Failed to fetch municipal_budget data" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // ✅ Transform & sanitize data
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

    // ✅ Filter out rows with no budget usage
    const validData = transformedData.filter((item) =>
      item.used_amt > 0 && item.account_budget_a
    );

    // ✅ Summary stats
    const totalBudget = validData.reduce(
      (sum, item) => sum + item.used_amt,
      0,
    );

    const largestItem = validData.length > 0 ? validData[0] : null;

    const response = {
      budgetData: validData,
      summary: {
        totalBudget,
        largestCategory: largestItem
          ? {
            category: largestItem.account_budget_a,
            amount: largestItem.used_amt,
          }
          : null,
        yearOverYearChange: 0, // Placeholder until historical data exists
      },
    };

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Unexpected error in get-budget function:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
