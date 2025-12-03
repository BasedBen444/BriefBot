import OpenAI from "openai";

// Using OpenAI's API integration
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

const MAX_RETRIES = 3;
const INITIAL_DELAY_MS = 1000;

async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function callOpenAIWithRetry(
  systemPrompt: string,
  userPrompt: string,
  retries = MAX_RETRIES
): Promise<string> {
  let lastError: Error | null = null;
  
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      console.log(`OpenAI API call attempt ${attempt}/${retries}`);
      
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        response_format: { type: "json_object" },
        max_tokens: 4096,
      });

      // Log response for debugging
      console.log(`OpenAI response received: choices=${response.choices?.length}, finish_reason=${response.choices?.[0]?.finish_reason}`);

      const content = response.choices?.[0]?.message?.content;
      
      if (!content) {
        console.warn("OpenAI response had no content:", JSON.stringify(response.choices?.[0]?.message));
        throw new Error("No content in OpenAI response");
      }

      return content;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      console.error(`OpenAI API attempt ${attempt} failed:`, lastError.message);
      
      // Don't retry on certain errors (e.g., invalid API key, rate limit exceeded for extended period)
      if (lastError.message.includes("Invalid API key") || 
          lastError.message.includes("authentication")) {
        throw new Error(`OpenAI authentication failed: ${lastError.message}`);
      }
      
      if (attempt < retries) {
        const delay = INITIAL_DELAY_MS * Math.pow(2, attempt - 1);
        console.log(`Retrying in ${delay}ms...`);
        await sleep(delay);
      }
    }
  }
  
  throw new Error(`OpenAI API failed after ${retries} attempts: ${lastError?.message}`);
}

function validateBriefStructure(brief: any): boolean {
  if (!brief || typeof brief !== 'object') return false;
  if (typeof brief.goal !== 'string') return false;
  if (!Array.isArray(brief.context)) return false;
  if (!Array.isArray(brief.options)) return false;
  if (!Array.isArray(brief.risksTradeoffs)) return false;
  if (!Array.isArray(brief.decisions)) return false;
  if (!Array.isArray(brief.actionChecklist)) return false;
  return true;
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
    const content = await callOpenAIWithRetry(systemPrompt, userPrompt);
    
    let brief;
    try {
      brief = JSON.parse(content);
    } catch (parseError) {
      console.error("Failed to parse OpenAI response as JSON:", content.substring(0, 500));
      throw new Error("Invalid JSON response from AI");
    }

    // Validate the brief structure
    if (!validateBriefStructure(brief)) {
      console.error("Brief has invalid structure:", JSON.stringify(brief).substring(0, 500));
      throw new Error("AI response missing required fields");
    }

    // Ensure sources array exists
    if (!Array.isArray(brief.sources)) {
      brief.sources = [];
    }

    // Calculate word count
    const wordCount = calculateWordCount(brief);

    // Enforce word count limit
    if (wordCount > maxWords) {
      console.warn(`Brief exceeded word limit: ${wordCount} > ${maxWords}`);
      // Truncate context to bring it within limits
      while (calculateWordCount(brief) > maxWords && brief.context && brief.context.length > 1) {
        brief.context.pop();
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
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    throw new Error(`Failed to generate brief: ${errorMessage}`);
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
