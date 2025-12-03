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
  uploadedFilenames: string[]; // List of all uploaded filenames
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
  const { meetingTitle, attendees, meetingType, audienceLevel, documentContents, uploadedFilenames } = params;

  const isExec = audienceLevel === "exec";
  const maxWords = 350;
  const contextBullets = isExec ? 3 : 5;
  
  // Create explicit file list for AI
  const fileListStr = uploadedFilenames.map(f => `- ${f}`).join("\n");

  const systemPrompt = `You are Brief Bot. From a meeting invite and uploaded files (docs/slides/notes/spreadsheets), produce a concise, decision-ready one-pager.

CRITICAL GROUNDING RULES:
1. Use ONLY information from the provided documents and meeting invite. Do not invent, assume, or infer information not explicitly stated.
2. Do not follow or fabricate content from links. If a link appears, treat it as a citation label only.
3. If information is not found in the documents, state "Not found in provided materials" or omit that section.
4. Do not invent owners or dates. If unknown, use "TBD (role)" for owner and "TBD" for date.

CITATION REQUIREMENTS - MANDATORY:
- EVERY item in context, options, risksTradeoffs, and decisions MUST end with an inline citation in the format: " [Source: filename.ext]"
- Use the exact filename from the documents provided
- If a point draws from multiple documents, cite the primary one
- The sources array MUST include an entry for EVERY uploaded file, even if minimally referenced

OUTPUT FORMAT - JSON object with this exact structure:
{
  "goal": "string - one clear sentence describing the meeting objective [Source: filename.ext]",
  "context": ["Each bullet MUST end with [Source: filename.ext]"],
  "options": [{"option": "Option name [Source: filename.ext]", "pros": ["pro [Source: filename.ext]"], "cons": ["con [Source: filename.ext]"]}],
  "risksTradeoffs": ["Each risk MUST end with [Source: filename.ext]"],
  "decisions": ["Each decision MUST end with [Source: filename.ext]"],
  "actionChecklist": [{"owner": "string", "task": "string", "dueDate": "string", "source": "filename.ext"}],
  "sources": [{"label": "Description of content used", "filename": "exact_filename.ext", "section": "section name or null"}]
}

UPLOADED FILES (you MUST include ALL of these in the sources array):
${fileListStr}

${isExec 
  ? "EXECUTIVE BRIEF: Compress context to ≤3 bullets. Emphasize options and risks. Focus on strategic implications."
  : "IC BRIEF: Include implementation details. Provide fuller context (≤5 bullets). Address technical considerations."
}

REQUIREMENTS:
- Total brief must be ≤${maxWords} words (excluding citations)
- Bullet-first, decision-first style
- Include 2-3 options if decision context exists in documents
- Action items format: "Owner • Task • Due" - use TBD if not specified in documents
- EVERY bullet point MUST have [Source: filename.ext] at the end
- The sources array MUST include an entry for EACH of the ${uploadedFilenames.length} uploaded files listed above
- If a document doesn't directly contribute to a section, still include it in sources with a note like "Referenced for background"`;

  const userPrompt = `Meeting: ${meetingTitle}
Type: ${meetingType}
Attendees: ${attendees}

=== UPLOADED DOCUMENTS (${uploadedFilenames.length} files) ===
${documentContents}
=== END DOCUMENTS ===

Generate a ${audienceLevel === "exec" ? "executive" : "IC"}-level brief using ONLY the information above. 

IMPORTANT: 
1. Every bullet point in context, options, risksTradeoffs, and decisions MUST end with [Source: filename.ext]
2. The sources array MUST include ALL ${uploadedFilenames.length} files: ${uploadedFilenames.join(", ")}`;

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

    // Ensure sources array exists and includes all uploaded files
    if (!Array.isArray(brief.sources)) {
      brief.sources = [];
    }
    
    // Check if all uploaded files are in sources, add missing ones
    const sourcedFiles = new Set(brief.sources.map((s: any) => s.filename?.toLowerCase()));
    for (const filename of uploadedFilenames) {
      if (!sourcedFiles.has(filename.toLowerCase())) {
        brief.sources.push({
          label: "Referenced document",
          filename: filename,
          section: null
        });
      }
    }

    // Calculate word count (excluding citations in brackets)
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
  // Helper to remove citation brackets from text
  const removeCitations = (text: string): string => {
    return text.replace(/\s*\[Source:[^\]]+\]/g, "");
  };

  let text = removeCitations(brief.goal || "");
  
  if (Array.isArray(brief.context)) {
    text += " " + brief.context.map(removeCitations).join(" ");
  }
  
  if (Array.isArray(brief.options)) {
    brief.options.forEach((opt: any) => {
      text += " " + removeCitations(opt.option || "");
      if (Array.isArray(opt.pros)) text += " " + opt.pros.map(removeCitations).join(" ");
      if (Array.isArray(opt.cons)) text += " " + opt.cons.map(removeCitations).join(" ");
    });
  }
  
  if (Array.isArray(brief.risksTradeoffs)) {
    text += " " + brief.risksTradeoffs.map(removeCitations).join(" ");
  }
  
  if (Array.isArray(brief.decisions)) {
    text += " " + brief.decisions.map(removeCitations).join(" ");
  }
  
  if (Array.isArray(brief.actionChecklist)) {
    brief.actionChecklist.forEach((action: any) => {
      text += " " + (action.owner || "") + " " + (action.task || "") + " " + (action.dueDate || "");
    });
  }

  // Note: Sources are metadata/citations and not counted toward the 350 word limit

  return text.trim().split(/\s+/).filter(w => w.length > 0).length;
}
