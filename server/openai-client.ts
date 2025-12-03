import OpenAI from "openai";

// Using OpenAI's API integration from blueprint:javascript_openai
// The newest OpenAI model is "gpt-5" which was released August 7, 2025. Do not change this unless explicitly requested by the user.
export const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY 
});

interface GenerateBriefParams {
  meetingTitle: string;
  attendees: string;
  meetingType: string;
  audienceLevel: "exec" | "ic";
  documentContents: string;
}

export async function generateBriefWithAI(params: GenerateBriefParams) {
  const { meetingTitle, attendees, meetingType, audienceLevel, documentContents } = params;

  const isExec = audienceLevel === "exec";
  const maxWords = 350;
  const contextBullets = isExec ? 3 : 5;

  const systemPrompt = `You are Brief Bot. From a meeting invite and uploaded files (docs/slides/notes/spreadsheets), produce a concise, decision-ready one-pager.

CRITICAL GROUNDING RULES:
1. Use ONLY information from the provided documents and meeting invite. Do not invent, assume, or infer information not explicitly stated.
2. Do not follow or fabricate content from links. If a link appears, treat it as a citation label only.
3. If information is not found in the documents, state "Not found in provided materials" or omit that section.
4. Do not invent owners or dates. If unknown, use "TBD (role)" for owner and "TBD" for date.

OUTPUT FORMAT - JSON object with this exact structure:
{
  "goal": "string - one clear sentence describing the meeting objective, derived from documents",
  "context": ["array of ≤${contextBullets} key points - ONLY facts from the documents"],
  "options": [{"option": "string", "pros": ["array"], "cons": ["array"]}],
  "risksTradeoffs": ["array of risks/trade-offs explicitly mentioned in documents"],
  "decisions": ["array of specific decisions that must be made, as stated in documents"],
  "actionChecklist": [{"owner": "string", "task": "string", "dueDate": "string", "source": "filename or section"}],
  "sources": [{"label": "string", "filename": "string", "section": "string or null"}]
}

${isExec 
  ? "EXECUTIVE BRIEF: Compress context to ≤3 bullets. Emphasize options and risks. Focus on strategic implications."
  : "IC BRIEF: Include implementation details. Provide fuller context (≤5 bullets). Address technical considerations."
}

REQUIREMENTS:
- Total brief must be ≤${maxWords} words
- Bullet-first, decision-first style
- Include 2-3 options if decision context exists in documents
- Action items format: "Owner • Task • Due" - use TBD if not specified in documents
- ALWAYS include a "sources" array listing every document used with relevant section/page
- Each bullet should be traceable to a source document
- If the documents lack sufficient information for a section, include fewer items rather than fabricating`;

  const userPrompt = `Meeting: ${meetingTitle}
Type: ${meetingType}
Attendees: ${attendees}

=== UPLOADED DOCUMENTS ===
${documentContents}
=== END DOCUMENTS ===

Generate a ${audienceLevel === "exec" ? "executive" : "IC"}-level brief using ONLY the information above. Include sources for all items.`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-5",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      response_format: { type: "json_object" },
      max_completion_tokens: 4096,
    });

    const content = response.choices[0].message.content;
    if (!content) {
      throw new Error("No content generated");
    }

    const brief = JSON.parse(content);

    // Calculate word count
    const wordCount = calculateWordCount(brief);

    // Enforce word count limit
    if (wordCount > maxWords) {
      console.warn(`Brief exceeded word limit: ${wordCount} > ${maxWords}`);
      // Truncate context to bring it within limits
      while (wordCount > maxWords && brief.context && brief.context.length > 1) {
        brief.context.pop();
        const newWordCount = calculateWordCount(brief);
        if (newWordCount <= maxWords) break;
      }
    }

    // Recalculate final word count
    const finalWordCount = calculateWordCount(brief);

    return {
      ...brief,
      wordCount: finalWordCount,
      generatedAt: new Date().toISOString(),
    };
  } catch (error) {
    console.error("OpenAI API error:", error);
    throw new Error("Failed to generate brief with AI");
  }
}

function calculateWordCount(brief: any): number {
  let text = brief.goal || "";
  
  if (Array.isArray(brief.context)) {
    text += " " + brief.context.join(" ");
  }
  
  if (Array.isArray(brief.options)) {
    brief.options.forEach((opt: any) => {
      text += " " + (opt.option || "");
      if (Array.isArray(opt.pros)) text += " " + opt.pros.join(" ");
      if (Array.isArray(opt.cons)) text += " " + opt.cons.join(" ");
    });
  }
  
  if (Array.isArray(brief.risksTradeoffs)) {
    text += " " + brief.risksTradeoffs.join(" ");
  }
  
  if (Array.isArray(brief.decisions)) {
    text += " " + brief.decisions.join(" ");
  }
  
  if (Array.isArray(brief.actionChecklist)) {
    brief.actionChecklist.forEach((action: any) => {
      text += " " + (action.owner || "") + " " + (action.task || "") + " " + (action.dueDate || "");
      if (action.source) text += " " + action.source;
    });
  }

  // Note: Sources are metadata/citations and not counted toward the 350 word limit
  // They provide traceability without inflating the brief content word count

  return text.trim().split(/\s+/).length;
}
