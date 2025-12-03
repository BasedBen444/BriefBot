import fs from "fs";
import mammoth from "mammoth";
import { createRequire } from "module";
import { parse as csvParse } from "csv-parse/sync";
import * as XLSX from "xlsx";

const require = createRequire(import.meta.url);
const pdfParse = require("pdf-parse");

function getMimeTypeFromPath(filePath: string, providedMimeType: string): string {
  if (providedMimeType && providedMimeType !== "application/octet-stream") {
    return providedMimeType;
  }
  
  const ext = filePath.toLowerCase().split(".").pop();
  const mimeMap: Record<string, string> = {
    pdf: "application/pdf",
    docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    txt: "text/plain",
    csv: "text/csv",
    md: "text/markdown",
    xls: "application/vnd.ms-excel",
    xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  };
  
  return mimeMap[ext || ""] || providedMimeType;
}

export async function parseDocument(filePath: string, mimeType: string): Promise<string> {
  const resolvedMimeType = getMimeTypeFromPath(filePath, mimeType);
  
  try {
    if (resolvedMimeType === "application/pdf") {
      return await parsePDF(filePath);
    } else if (resolvedMimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
      return await parseDOCX(filePath);
    } else if (resolvedMimeType === "application/vnd.openxmlformats-officedocument.presentationml.presentation") {
      return await parsePPTX(filePath);
    } else if (resolvedMimeType === "text/plain" || resolvedMimeType === "text/markdown") {
      return await parseText(filePath);
    } else if (resolvedMimeType === "text/csv") {
      return await parseCSV(filePath);
    } else if (
      resolvedMimeType === "application/vnd.ms-excel" ||
      resolvedMimeType === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    ) {
      return await parseExcel(filePath);
    } else {
      throw new Error(`Unsupported file type: ${resolvedMimeType}`);
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

async function parseCSV(filePath: string): Promise<string> {
  const content = fs.readFileSync(filePath, "utf-8");
  
  const rawRecords = csvParse(content, {
    skip_empty_lines: true,
    trim: true,
    relax_column_count: true,
  }) as string[][];
  
  if (rawRecords.length === 0) {
    return "Empty CSV file";
  }
  
  const firstRow = rawRecords[0];
  const hasHeaders = firstRow.some(cell => 
    cell && isNaN(Number(cell)) && !/^\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}$/.test(cell)
  );
  
  let headers: string[];
  let dataRows: string[][];
  
  if (hasHeaders) {
    headers = firstRow.map((h, i) => h || `Column ${i + 1}`);
    dataRows = rawRecords.slice(1);
  } else {
    headers = firstRow.map((_, i) => `Column ${i + 1}`);
    dataRows = rawRecords;
  }
  
  let text = `CSV Data (${dataRows.length} rows):\n`;
  text += `Columns: ${headers.join(", ")}\n\n`;
  
  dataRows.forEach((row, index) => {
    text += `Row ${index + 1}:\n`;
    headers.forEach((header, colIndex) => {
      const value = row[colIndex];
      if (value !== undefined && value !== null) {
        text += `  ${header}: ${value}\n`;
      }
    });
    text += "\n";
  });
  
  return text;
}

async function parseExcel(filePath: string): Promise<string> {
  const workbook = XLSX.readFile(filePath);
  let text = "";
  
  workbook.SheetNames.forEach((sheetName, sheetIndex) => {
    const sheet = workbook.Sheets[sheetName];
    const jsonData = XLSX.utils.sheet_to_json(sheet, { 
      header: 1,
      defval: "",
    }) as (string | number | boolean)[][];
    
    if (jsonData.length === 0) return;
    
    text += `Sheet: ${sheetName}\n`;
    text += `${"=".repeat(40)}\n`;
    
    const firstRow = jsonData[0];
    const hasHeaders = firstRow.some(cell => 
      cell !== undefined && cell !== null && cell !== "" && 
      typeof cell === "string" && isNaN(Number(cell))
    );
    
    let headers: string[];
    let rows: (string | number | boolean)[][];
    
    if (hasHeaders) {
      headers = firstRow.map((h, i) => (h !== undefined && h !== null && h !== "") ? String(h) : `Column ${i + 1}`);
      rows = jsonData.slice(1);
    } else {
      headers = firstRow.map((_, i) => `Column ${i + 1}`);
      rows = jsonData;
    }
    
    if (headers && headers.length > 0) {
      text += `Columns: ${headers.join(", ")}\n\n`;
      
      rows.forEach((row, index) => {
        text += `Row ${index + 1}:\n`;
        headers.forEach((header, colIndex) => {
          const value = row[colIndex];
          if (value !== undefined && value !== null) {
            text += `  ${header}: ${value}\n`;
          }
        });
        text += "\n";
      });
    }
    
    if (sheetIndex < workbook.SheetNames.length - 1) {
      text += "\n";
    }
  });
  
  return text || "Empty spreadsheet";
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
