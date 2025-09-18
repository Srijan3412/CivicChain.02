import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS"
};

// --- New helper function for retries with backoff ---
async function fetchWithRetry(url: string, options: RequestInit, retries = 3) {
  for (let i = 0; i < retries; i++) {
    const response = await fetch(url, options);
    // If the response is not a 429, we can return it immediately
    if (response.status !== 429) {
      return response;
    }
    // If we get a 429, log and wait before retrying
    const delay = Math.pow(2, i) * 1000 + Math.random() * 1000; // Exponential backoff with jitter
    console.log(`Rate limited (429). Retrying in ${delay}ms...`);
    await new Promise(resolve => setTimeout(resolve, delay));
  }
  // If all retries fail, return the last response which will be a 429
  console.error("❌ All retries failed due to rate limiting.");
  const lastResponse = await fetch(url, options);
  return lastResponse;
}
// --- End of new helper function ---

// Helper function to format large numbers
const formatNumber = (num: number): string => {
  if (num >= 10000000) {
    return `${(num / 10000000).toFixed(2)} Crore`;
  }
  if (num >= 100000) {
    return `${(num / 100000).toFixed(2)} Lakh`;
  }
  if (num >= 1000) {
    return `${(num / 1000).toFixed(2)} Thousand`;
  }
  return num.toLocaleString();
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: corsHeaders
    });
  }
  try {
    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_API_KEY) {
      console.error("❌ Missing GEMINI_API_KEY in environment");
      return new Response(JSON.stringify({
        error: "Gemini API key not configured"
      }), {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        }
      });
    }

    let body;
    try {
      body = await req.json();
    } catch (e) {
      console.error("❌ Invalid JSON body:", e);
      return new Response(JSON.stringify({
        error: "Invalid JSON body"
      }), {
        status: 400,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        }
      });
    }

    const { budgetData, department } = body;
    if (!budgetData || !Array.isArray(budgetData) || !department) {
      return new Response(JSON.stringify({
        error: "Budget data and department are required"
      }), {
        status: 400,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        }
      });
    }

    // ✅ Clean and format data based on the provided dataset fields
    const formattedData = budgetData.map((item: any) => ({
      account: item.account ?? "Unknown",
      glcode: item.glcode ?? "Unknown",
      account_budget_a: item.account_budget_a ?? "Unknown",
      allocated: Number(item.budget_a) || 0,
      used: Number(item.used_amt) || 0,
      remaining: Number(item.remaining_amt) || 0,
      used_percent: Number(item.budget_a) > 0 ? (Number(item.used_amt) / Number(item.budget_a) * 100).toFixed(1) : "0"
    }));

    // ✅ Calculate totals
    const totalAllocated = formattedData.reduce((sum, b) => sum + b.allocated, 0);
    const totalUsed = formattedData.reduce((sum, b) => sum + b.used, 0);
    const totalRemaining = formattedData.reduce((sum, b) => sum + b.remaining, 0);

    // ✅ Simplified Gemini-friendly prompt
    const prompt = `
You are a financial analyst AI.
Your job is to summarize the budget data for the department: "${department}".

SUMMARY OF TOTALS:
- Total Allocated: ${formatNumber(totalAllocated)}
- Total Used: ${formatNumber(totalUsed)}
- Total Remaining: ${formatNumber(totalRemaining)}

DETAILED DATA:
${JSON.stringify(formattedData.map(item => ({
      account_name: item.account_budget_a,
      allocated: formatNumber(item.allocated),
      spent: formatNumber(item.used),
      left: formatNumber(item.remaining),
    })), null, 2)}

TASK:
Write a short, clear report for a citizen.

Your report should:
- Start with a single sentence summarizing the overall budget.
- Use bullet points to list the top 3 spending areas.
- Mention any major unspent funds or overspending as a key takeaway.
- Finish with one simple suggestion on how the department could improve its financial planning.

Keep it under 8 sentences and use everyday language. Do not use financial jargon like "glcode" or "allocated."
`;

    console.log("📤 Sending to Gemini API...");
    console.log("📝 Prompt length:", prompt.length);

    // --- The key change is here: Use the retry helper function ---
    const response = await fetchWithRetry(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        contents: [{
          role: "user",
          parts: [{ text: prompt }]
        }]
      })
    });

    const rawResponse = await response.text();
    console.log("🔍 Gemini raw response:", rawResponse);

    if (!response.ok) {
      console.error("❌ Gemini API error:", rawResponse);
      return new Response(JSON.stringify({
        error: "Failed to get AI insights from Gemini",
        details: rawResponse
      }), {
        status: response.status,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        }
      });
    }

    let data;
    try {
      data = JSON.parse(rawResponse);
    } catch (e) {
      console.error("❌ Failed to parse Gemini response:", e);
      return new Response(JSON.stringify({
        error: "Invalid JSON from Gemini",
        details: rawResponse
      }), {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        }
      });
    }
    
    // Check for "blocked" safety issues
    if (data?.candidates?.[0]?.finishReason === "SAFETY") {
        const errorDetails = data.candidates[0].safetyRatings.map((rating: any) => `${rating.category}: ${rating.probability}`).join(', ');
        return new Response(JSON.stringify({
          error: "Content generation blocked by safety filters",
          details: errorDetails
        }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
    }

    const insights = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "No insights returned.";

    return new Response(JSON.stringify({
      insights
    }), {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json"
      }
    });
  } catch (error: any) {
    console.error("💥 Edge Function Error:", error);
    return new Response(JSON.stringify({
      error: "Internal server error",
      details: error.message
    }), {
      status: 500,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json"
      }
    });
  }
});