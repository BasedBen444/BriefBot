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

  const systemPrompt = `You are an expert meeting brief writer. Your job is to create concise, decision-ready meeting briefs.

Output format: JSON object with this exact structure:
{
  "goal": "string - one clear sentence describing the meeting objective",
  "context": ["array of ${contextBullets} key points providing essential background"],
  "options": [{"option": "string", "pros": ["array"], "cons": ["array"]}],
  "risksTradeoffs": ["array of key risks and trade-offs to consider"],
  "decisions": ["array of specific decisions that must be made"],
  "actionChecklist": [{"owner": "string", "task": "string", "dueDate": "string or TBD"}]
}

${isExec 
  ? "EXECUTIVE BRIEF: Emphasize options and risks. Keep context minimal (≤3 bullets). Focus on strategic implications and decision frameworks."
  : "IC BRIEF: Include implementation details and constraints. Provide fuller context (≤5 bullets). Address technical considerations and dependencies."
}

Requirements:
- Total brief must be ≤${maxWords} words
- Use bullet-first style
- Be specific and actionable
- Include at least 2-3 options if decision-making context exists
- For action items: use format "Owner • Task • Due Date" - if owner/date unknown, use "TBD (role)" and "TBD (date)"
- Extract decisions, options, and risks from the provided documents`;

  const userPrompt = `Meeting: ${meetingTitle}
Type: ${meetingType}
Attendees: ${attendees}

Documents:
${documentContents}

Generate a ${audienceLevel === "exec" ? "executive" : "IC"}-level brief.`;

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
    });
  }

  return text.trim().split(/\s+/).length;
}
