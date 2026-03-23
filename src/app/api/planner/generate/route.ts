import { NextRequest } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { getSupabaseServer } from "@/lib/supabase/server";

const client = new Anthropic();

const SYSTEM_PROMPT = `You are an expert basketball practice planning assistant.

Given a coach's natural language request and their drill library, generate an optimal practice plan or ask a focused clarifying question if the request is missing critical information.

## Drill schema fields you will receive
- id: unique identifier (use this in your plan output)
- name: drill name
- category: Defense | Offense | Transition | Special Teams | Rest/Transition
- sub_category: specific skill focus (may be empty)
- shot_density: average shots per player per minute during this drill
- shot_type: 3pt | Mid-range | Finish | Free Throw | —
- intensity: 1–5 (1 = recovery/warmup, 5 = all-out competition)
- default_duration: typical minutes coaches run this drill
- session_position: warmup | main | finishing | null (preferred place in practice)
- coaching_notes: what the drill develops and when to use it

## Shot count calculation
total_projected_shots = sum over all drills of (shot_density × duration × player_count)

## Practice structure
Always follow this order:
1. Warmup drills (session_position = "warmup", intensity 1–2)
2. Main block (session_position = "main" or null, match the coach's focus areas)
3. Finishing drills (session_position = "finishing", intensity 1–3; free throws, walk-throughs, etc.)

## When to ask for clarification
Ask ONE focused question only if you are missing something that would fundamentally change the plan:
- Practice duration (if not stated)
- Primary focus area (if completely absent)
Do NOT ask about things you can reasonably infer or approximate.

## Response format
Return ONLY valid JSON — no markdown, no explanation outside the JSON.

If you have enough information:
{
  "type": "plan",
  "plan": [
    { "drill_id": "uuid", "duration": 10 }
  ],
  "rationale": "2–3 sentences explaining why you chose these drills and how they meet the coach's requirements. Include projected shot count and total duration."
}

If you need one piece of critical information:
{
  "type": "clarification",
  "clarification": "A single focused question to get what you need."
}

## Rules
- Only use drill IDs from the provided library
- Total duration must be within 5 minutes of the target (if stated)
- Shot count must meet any stated minimum
- Respect session_position for ordering (warmup → main → finishing)
- Prefer drills whose coaching_notes and sub_category match the stated focus
- Always include at least one warmup drill if the library has one (intensity 1–2)
- Do not repeat the same drill more than once
- Durations must be positive integers`;

export async function POST(request: NextRequest) {
  try {
    const { prompt, player_count, team_name } = await request.json();

    if (!prompt?.trim()) {
      return Response.json({ error: "prompt is required" }, { status: 400 });
    }

    // Fetch drill library server-side
    const supabase = getSupabaseServer();
    const { data: drills, error: dbErr } = await supabase
      .from("drills")
      .select("id, name, category, sub_category, shot_density, shot_type, intensity, default_duration, session_position, coaching_notes")
      .order("name", { ascending: true });

    if (dbErr) throw dbErr;

    if (!drills || drills.length === 0) {
      return Response.json({
        type: "clarification",
        clarification: "Your drill library is empty. Add some drills to the Drill Vault first, then I can build a plan around them.",
      });
    }

    const userMessage = [
      team_name ? `Team: ${team_name}` : null,
      player_count ? `Players in practice: ${player_count}` : null,
      `Coach's request: ${prompt.trim()}`,
      "",
      `Available drill library (${drills.length} drills):`,
      JSON.stringify(drills, null, 2),
    ]
      .filter(Boolean)
      .join("\n");

    const message = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 2048,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: userMessage }],
    });

    const raw = message.content[0].type === "text" ? message.content[0].text : "";

    // Strip markdown code fences if Claude wraps in ```json
    const cleaned = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();

    let parsed: unknown;
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      return Response.json({ error: "AI returned an unreadable response. Please try again." }, { status: 502 });
    }

    return Response.json(parsed);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return Response.json({ error: message }, { status: 500 });
  }
}
