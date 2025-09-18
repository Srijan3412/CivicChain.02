import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Content-Type": "application/json",
};

// --- Helper function for retries with backoff ---
async function fetchWithRetry(url: string, options: RequestInit, retries = 3) {
  for (let i = 0; i < retries; i++) {
    const response = await fetch(url, options);
    if (response.status !== 429) {
      return response;
    }
    const delay = Math.pow(2, i) * 1000 + Math.random() * 1000;
    console.log(`Rate limited. Retrying in ${delay}ms...`);
    await new Promise((resolve) => setTimeout(resolve, delay));
  }
  // If all retries fail, return last response
  return await fetch(url, options);
}
// --- End of helper ---

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const geminiApiKey = Deno.env.get("GEMINI_API_KEY");

    if (!geminiApiKey) {
      console.error("Gemini API key not configured");
      return new Response(JSON.stringify({ error: "Gemini API key not configured" }), {
        status: 500,
        headers: corsHeaders,
      });
    }

    const { budgetData, department } = await req.json();

    if (!budgetData || !department) {
      return new Response(
        JSON.stringify({ error: "Budget data and department are required" }),
        { status: 400, headers: corsHeaders }
      );
    }

    // Transform and sanitize data
    const transformedData = budgetData
      .map((item: any) => {
        const usedAmt = Number(item.used_amt ?? item.amount ?? 0);
        return {
          category: item.account_budget_a ?? item.category ?? "Unknown Category",
          amount: isNaN(usedAmt) ? 0 : usedAmt,
        };
      })
      .filter((item: any) => item.amount > 0 && item.category !== "Unknown Category");

    if (transformedData.length === 0) {
      return new Response(JSON.stringify({ error: "No valid budget data to process" }), {
        status: 400,
        headers: corsHeaders,
      });
    }

    const totalAmount = transformedData.reduce((sum: number, item: any) => sum + item.amount, 0);

    const formattedData = transformedData.map((item: any) => ({
      category: item.category,
      amount: item.amount,
      percentage: totalAmount > 0 ? ((item.amount / totalAmount) * 100).toFixed(1) : "0.0",
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

    console.log("Sending request to Gemini API with prompt length:", prompt.length);

    const response = await fetchWithRetry(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent?key=${geminiApiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.7,
            topK: 40,
            topP: 0.95,
            maxOutputTokens: 1024,
          },
        }),
      }
    );

    const textResponse = await response.text();

    if (!response.ok) {
      console.error("Gemini API returned an error:", textResponse);
      return new Response(
        JSON.stringify({ error: "Failed to get AI insights", details: textResponse }),
        { status: 500, headers: corsHeaders }
      );
    }

    let data;
    try {
      data = JSON.parse(textResponse);
    } catch {
      console.error("Failed to parse Gemini API response:", textResponse);
      return new Response(
        JSON.stringify({ error: "Failed to parse AI response" }),
        { status: 500, headers: corsHeaders }
      );
    }

    const insights = data?.candidates?.[0]?.content?.[0]?.parts?.[0]?.text || "Unable to generate insights";

    return new Response(JSON.stringify({ insights }), { headers: corsHeaders });
  } catch (err) {
    console.error("Internal error in get-ai-insights function:", err);
    return new Response(JSON.stringify({ error: "Internal server error", details: err.message }), {
      status: 500,
      headers: corsHeaders,
    });
  }
});
