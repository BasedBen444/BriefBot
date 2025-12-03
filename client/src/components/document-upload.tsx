import { useCallback } from "react";
import { Upload, X, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { UploadedFile } from "@shared/schema";

interface DocumentUploadProps {
  uploadedFiles: UploadedFile[];
  onFilesChange: (files: UploadedFile[]) => void;
}

const ACCEPTED_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "text/plain",
  "text/csv",
  "text/markdown",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
];

const ACCEPTED_EXTENSIONS = ".pdf,.docx,.pptx,.txt,.csv,.xls,.xlsx,.md";

export function DocumentUpload({ uploadedFiles, onFilesChange }: DocumentUploadProps) {
  const getMimeType = (file: File): string => {
    if (file.type && file.type !== "application/octet-stream") {
      return file.type;
    }
    const ext = file.name.toLowerCase().split(".").pop();
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
    return mimeMap[ext || ""] || file.type;
  };

  const handleFileSelect = useCallback((files: FileList | null) => {
    if (!files) return;

    const newFiles: UploadedFile[] = Array.from(files)
      .map(file => {
        const mimeType = getMimeType(file);
        return {
          id: `${Date.now()}-${file.name}`,
          file,
          name: file.name,
          size: file.size,
          type: mimeType,
        };
      })
      .filter(file => ACCEPTED_TYPES.includes(file.type));

    onFilesChange([...uploadedFiles, ...newFiles]);
  }, [uploadedFiles, onFilesChange]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    handleFileSelect(e.dataTransfer.files);
  }, [handleFileSelect]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const removeFile = useCallback((id: string) => {
    onFilesChange(uploadedFiles.filter(f => f.id !== id));
  }, [uploadedFiles, onFilesChange]);

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="space-y-4">
      {/* Upload Zone */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        className="relative"
      >
        <input
          type="file"
          id="file-upload"
          className="sr-only"
          multiple
          accept={ACCEPTED_EXTENSIONS}
          onChange={(e) => handleFileSelect(e.target.files)}
          data-testid="input-file-upload"
        />
        <label
          htmlFor="file-upload"
          className="flex flex-col items-center justify-center min-h-48 border-2 border-dashed rounded-lg hover-elevate active-elevate-2 cursor-pointer transition-all duration-200"
          data-testid="label-upload-zone"
        >
          <Upload className="w-12 h-12 text-muted-foreground mb-4" />
          <p className="text-base font-medium mb-2">Drop files here or click to browse</p>
          <p className="text-sm text-muted-foreground mb-4">
            Upload meeting materials, agendas, or related documents
          </p>
          <Badge variant="secondary" data-testid="badge-accepted-formats">
            PDF, DOCX, PPTX, TXT, CSV, XLS, XLSX, MD
          </Badge>
        </label>
      </div>

      {/* Uploaded Files List */}
      {uploadedFiles.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-medium">Uploaded Files ({uploadedFiles.length})</h3>
          <div className="space-y-2">
            {uploadedFiles.map((file) => (
              <Card key={file.id} className="p-4" data-testid={`card-file-${file.id}`}>
                <div className="flex items-center gap-3">
                  <FileText className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate" data-testid={`text-filename-${file.id}`}>
                      {file.name}
                    </p>
                    <p className="text-sm text-muted-foreground" data-testid={`text-filesize-${file.id}`}>
                      {formatFileSize(file.size)}
                    </p>
                  </div>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => removeFile(file.id)}
                    data-testid={`button-remove-${file.id}`}
                  >
                    <X className="w-4 h-4" />
                    <span className="sr-only">Remove file</span>
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
