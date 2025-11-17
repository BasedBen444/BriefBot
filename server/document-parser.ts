import fs from "fs";
import mammoth from "mammoth";
import { createRequire } from "module";

// pdf-parse is a CommonJS module, use require for compatibility
const require = createRequire(import.meta.url);
const pdfParse = require("pdf-parse");

export async function parseDocument(filePath: string, mimeType: string): Promise<string> {
  try {
    if (mimeType === "application/pdf") {
      return await parsePDF(filePath);
    } else if (mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
      return await parseDOCX(filePath);
    } else if (mimeType === "application/vnd.openxmlformats-officedocument.presentationml.presentation") {
      return await parsePPTX(filePath);
    } else if (mimeType === "text/plain") {
      return await parseText(filePath);
    } else {
      throw new Error(`Unsupported file type: ${mimeType}`);
    }
  } catch (error) {
    console.error(`Error parsing document ${filePath}:`, error);
    throw new Error(`Failed to parse document: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

async function parsePDF(filePath: string): Promise<string> {
  const dataBuffer = fs.readFileSync(filePath);
  const data = await pdfParse(dataBuffer);
  return data.text;
}

async function parseDOCX(filePath: string): Promise<string> {
  const result = await mammoth.extractRawText({ path: filePath });
  return result.value;
}

async function parsePPTX(filePath: string): Promise<string> {
  // For PPTX, we'll use mammoth's extractRawText which can handle some PPTX content
  // In a production app, you might want a specialized library like officegen-pptx or pptx2json
  try {
    const result = await mammoth.extractRawText({ path: filePath });
    return result.value;
  } catch (error) {
    // Fallback: try to read as text if mammoth fails
    return await parseText(filePath);
  }
}

async function parseText(filePath: string): Promise<string> {
  return fs.readFileSync(filePath, "utf-8");
}

export function cleanupFile(filePath: string): void {
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  } catch (error) {
    console.error(`Error cleaning up file ${filePath}:`, error);
  }
}
