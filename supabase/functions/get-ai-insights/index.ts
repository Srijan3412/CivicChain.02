import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const geminiApiKey = Deno.env.get("GEMINI_API_KEY");

    if (!geminiApiKey) {
      return new Response(
        JSON.stringify({ error: "Gemini API key not configured" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const { budgetData, department } = await req.json();

    if (!budgetData || !department) {
      return new Response(
        JSON.stringify({ error: "Budget data and department are required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // ✅ Safely convert numeric fields & use correct schema keys
    const transformedData = budgetData.map((item: any) => {
      const usedAmt = Number(item.used_amt ?? item.amount ?? 0);
      return {
        category: item.account_budget_a ?? item.category ?? "Unknown Category",
        amount: isNaN(usedAmt) ? 0 : usedAmt,
      };
    }).filter((item: any) => item.amount > 0 && item.category !== "Unknown Category");

    const totalAmount = transformedData.reduce(
      (sum: number, item: any) => sum + item.amount,
      0,
    );

    // ✅ Include percentage for each category
    const formattedData = transformedData.map((item: any) => ({
      category: item.category,
      amount: item.amount,
      percentage: totalAmount > 0
        ? ((item.amount / totalAmount) * 100).toFixed(1)
        : "0.0",
    }));

    const prompt = `You are an AI analyzing municipal budget data for transparency.

Department: ${department}
Budget Data (INR):
${JSON.stringify(formattedData, null, 2)}

Provide:
- A 3-line summary of the most important spending patterns for this department
- Identify any anomalies, unusually high spending, or potential inefficiencies
- Suggest 2-3 ways to optimize spending, focusing on transparency and efficiency

Respond in clear, concise English. Avoid code blocks or JSON formatting.`;

    console.log("Sending request to Gemini API...");

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent?key=${geminiApiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{
            parts: [{ text: prompt }],
          }],
          generationConfig: {
            temperature: 0.7,
            topK: 40,
            topP: 0.95,
            maxOutputTokens: 1024,
          },
        }),
      },
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Gemini API error:", errorText);
      return new Response(
        JSON.stringify({ error: "Failed to get AI insights" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const data = await response.json();
    console.log("Gemini API response:", data);

    const insights =
      data.candidates?.[0]?.content?.parts?.[0]?.text ||
      "Unable to generate insights";

    return new Response(JSON.stringify({ insights }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Error in get-ai-insights function:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
