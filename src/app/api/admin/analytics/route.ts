import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const daysBack = parseInt(searchParams.get("days") || "7", 10);

    const supabase = getSupabaseAdmin();

    // 1. Fetch recent raw events from all 3 Supabase tables for the log tables
    const [ingestionLogsRes, aiLogsRes, engagementLogsRes] = await Promise.all([
      supabase.from("ingestion_events").select("*").order("created_at", { ascending: false }).limit(200),
      supabase.from("ai_usage_events").select("*").order("created_at", { ascending: false }).limit(200),
      supabase.from("engagement_events").select("*").order("created_at", { ascending: false }).limit(200),
    ]);

    const ingestionLogs = (ingestionLogsRes.data || []).map((e) => ({
      id: e.id,
      eventName: e.event_name,
      params: {
        source_platform: e.platform,
        status: e.status,
        is_cached_hit: e.is_cached,
        error_type: e.error_type,
        credits_remaining: e.credits_remaining,
        credits_used: e.credits_used ?? (e.platform && e.platform !== "web" ? 1 : e.event_name === "scrapecreators_credits" ? 1 : 0),
      },
      userId: e.user_id || null,
      userEmail: e.user_email || null,
      timestamp: e.created_at || null,
    }));

    const aiLogs = (aiLogsRes.data || []).map((e) => ({
      id: e.id,
      eventName: e.event_name,
      params: {
        type: e.action_type,
        model: e.model,
        prompt_tokens: e.prompt_tokens,
        completion_tokens: e.completion_tokens,
        cost: e.cost,
        latency: e.latency_ms,
      },
      userId: e.user_id || null,
      userEmail: e.user_email || null,
      timestamp: e.created_at || null,
    }));

    const engagementLogs = (engagementLogsRes.data || []).map((e) => ({
      id: e.id,
      eventName: e.event_name,
      params: e.params || {},
      userId: e.user_id || null,
      userEmail: e.user_email || null,
      timestamp: e.created_at || null,
    }));

    const recentEvents = [...ingestionLogs, ...aiLogs, ...engagementLogs]
      .sort((a, b) => new Date(b.timestamp || 0).getTime() - new Date(a.timestamp || 0).getTime())
      .slice(0, 500);

    // 2. Try invoking the RPC function get_admin_kpis
    const { data: rpcData, error: rpcError } = await supabase.rpc("get_admin_kpis", {
      p_days_back: daysBack,
    });

    if (!rpcError && rpcData) {
      return NextResponse.json({
        success: true,
        data: {
          ...rpcData,
          recent_events: recentEvents,
        },
      });
    }

    // 3. Fallback query if RPC function is not yet created in DB
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysBack);
    const startDateIso = startDate.toISOString();

    const [ingestionRes, aiRes, engagementRes] = await Promise.all([
      supabase.from("ingestion_events").select("*").gte("created_at", startDateIso),
      supabase.from("ai_usage_events").select("*").gte("created_at", startDateIso),
      supabase.from("engagement_events").select("*").gte("created_at", startDateIso),
    ]);

    const ingestionEvents = ingestionRes.data || [];
    const aiEvents = aiRes.data || [];
    const engagementEvents = engagementRes.data || [];

    const initiated = ingestionEvents.filter((e) => e.event_name === "recipe_import_initiated").length;
    const completed = ingestionEvents.filter((e) => e.event_name === "recipe_import_completed").length;
    const failed = ingestionEvents.filter((e) => e.event_name === "recipe_import_failed").length;
    const cacheHits = ingestionEvents.filter((e) => e.event_name === "recipe_import_completed" && e.is_cached).length;

    const scrapeCreditsEvent = ingestionEvents
      .filter((e) => e.credits_remaining !== null && e.credits_remaining !== undefined)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];

    const platforms = { instagram: 0, tiktok: 0, youtube: 0, facebook: 0, web: 0 };
    ingestionEvents
      .filter((e) => e.event_name === "recipe_import_initiated" && e.platform)
      .forEach((e) => {
        const p = e.platform.toLowerCase();
        if (p in platforms) platforms[p as keyof typeof platforms]++;
      });

    const engagement = {
      recipes_saved: engagementEvents.filter((e) => e.event_name === "recipe_saved").length,
      servings_changed: engagementEvents.filter((e) => e.event_name === "recipe_servings_changed").length,
      translations: engagementEvents.filter((e) => e.event_name === "recipe_translated").length,
      cooking_checks: engagementEvents.filter((e) => e.event_name === "cooking_check_item").length,
      shopping_toggles: engagementEvents.filter((e) => e.event_name === "shopping_recipe_toggled").length,
      custom_items_added: engagementEvents.filter((e) => e.event_name === "shopping_custom_item_added").length,
      shopping_resets: engagementEvents.filter((e) => e.event_name === "shopping_list_reset").length,
      nutrition_views: engagementEvents.filter((e) => e.event_name === "recipe_nutrition_viewed").length,
      pwa_installs: engagementEvents.filter((e) => e.event_name === "pwa_install_prompt_action" && e.params?.action === "app_installed").length,
      pwa_prompts_accepted: engagementEvents.filter((e) => e.event_name === "pwa_install_prompt_action" && e.params?.action === "accepted").length,
      pwa_prompts_shown: engagementEvents.filter((e) => e.event_name === "pwa_install_prompt_action" && e.params?.action === "shown").length,
    };

    const totalCost = aiEvents.reduce((sum, e) => sum + (Number(e.cost) || 0), 0);
    const totalPromptTokens = aiEvents.reduce((sum, e) => sum + (Number(e.prompt_tokens) || 0), 0);
    const totalCompletionTokens = aiEvents.reduce((sum, e) => sum + (Number(e.completion_tokens) || 0), 0);

    const activeUserSet = new Set<string>();
    [...ingestionEvents, ...aiEvents, ...engagementEvents].forEach((e) => {
      if (e.user_id) activeUserSet.add(e.user_id);
    });

    // Build daily chart
    const dailyData: Record<string, { date: string; key: string; success: number; failure: number; cost: number }> = {};
    for (let i = daysBack - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toLocaleDateString("it-IT", { month: "2-digit", day: "2-digit" });
      const key = d.toISOString().split("T")[0];
      dailyData[key] = { date: dateStr, key, success: 0, failure: 0, cost: 0 };
    }

    ingestionEvents.forEach((e) => {
      if (!e.created_at) return;
      const key = e.created_at.split("T")[0];
      if (dailyData[key]) {
        if (e.event_name === "recipe_import_completed") dailyData[key].success++;
        if (e.event_name === "recipe_import_failed") dailyData[key].failure++;
      }
    });

    aiEvents.forEach((e) => {
      if (!e.created_at) return;
      const key = e.created_at.split("T")[0];
      if (dailyData[key]) {
        dailyData[key].cost += Number(e.cost) || 0;
      }
    });

    const fallbackData = {
      ingestion: {
        initiated,
        completed,
        failed,
        cache_hits: cacheHits,
        success_rate: initiated > 0 ? Math.round((completed / initiated) * 100) : 0,
        scrapecreators_credits: scrapeCreditsEvent ? scrapeCreditsEvent.credits_remaining : null,
        platforms,
      },
      engagement,
      ai_summary: {
        total_cost: totalCost,
        total_calls: aiEvents.length,
        total_prompt_tokens: totalPromptTokens,
        total_completion_tokens: totalCompletionTokens,
      },
      active_users_7d: activeUserSet.size,
      daily_chart: Object.values(dailyData),
      recent_events: recentEvents,
    };

    return NextResponse.json({ success: true, data: fallbackData });
  } catch (err: unknown) {
    console.error("Error in /api/admin/analytics:", err);
    const errorMessage = err instanceof Error ? err.message : "Errore interno analytics";
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}
