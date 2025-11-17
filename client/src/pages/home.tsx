import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { DocumentUpload } from "@/components/document-upload";
import { MeetingForm } from "@/components/meeting-form";
import { BriefDisplay } from "@/components/brief-display";
import { LoadingState } from "@/components/loading-state";
import type { UploadedFile, MeetingMetadata, Brief } from "@shared/schema";
import { FileText } from "lucide-react";

export default function Home() {
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [metadata, setMetadata] = useState<MeetingMetadata | null>(null);
  const [generatedBrief, setGeneratedBrief] = useState<Brief | null>(null);

  const generateBriefMutation = useMutation({
    mutationFn: async (data: FormData) => {
      const response = await fetch("/api/generate-brief", {
        method: "POST",
        body: data,
        credentials: "include",
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Failed to generate brief" }));
        throw new Error(errorData.error || "Failed to generate brief");
      }

      return await response.json();
    },
    onSuccess: (data) => {
      setGeneratedBrief(data.brief);
    },
  });

  const handleGenerateBrief = async (formMetadata: MeetingMetadata) => {
    if (uploadedFiles.length === 0) return;

    setMetadata(formMetadata);
    
    const formData = new FormData();
    formData.append("metadata", JSON.stringify(formMetadata));
    
    uploadedFiles.forEach((uploadedFile) => {
      formData.append("files", uploadedFile.file);
    });

    generateBriefMutation.mutate(formData);
  };

  const handleReset = () => {
    setGeneratedBrief(null);
    setUploadedFiles([]);
    setMetadata(null);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b">
        <div className="max-w-5xl mx-auto px-4 md:px-8 lg:px-12 py-4">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-md bg-primary text-primary-foreground">
              <FileText className="w-6 h-6" />
            </div>
            <h1 className="text-xl font-semibold" data-testid="text-app-title">BriefBot</h1>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-5xl mx-auto px-4 md:px-8 lg:px-12 py-8 md:py-12">
        {generateBriefMutation.isPending ? (
          <LoadingState />
        ) : generatedBrief ? (
          <div className="space-y-6">
            <BriefDisplay 
              brief={generatedBrief} 
              metadata={metadata!}
              onGenerateAnother={handleReset}
            />
          </div>
        ) : (
          <div className="space-y-8">
            {/* Introduction */}
            <div className="space-y-2">
              <h2 className="text-3xl font-semibold">Generate Decision-Ready Meeting Briefs</h2>
              <p className="text-base text-muted-foreground leading-relaxed max-w-3xl">
                Upload your meeting materials and we'll create a focused, one-page brief with clear decisions, 
                options, risks, and action items—so your team arrives aligned and ready to decide.
              </p>
            </div>

            {/* Upload Section */}
            <DocumentUpload 
              uploadedFiles={uploadedFiles}
              onFilesChange={setUploadedFiles}
            />

            {/* Meeting Form */}
            {uploadedFiles.length > 0 && (
              <MeetingForm 
                onSubmit={handleGenerateBrief}
                isGenerating={generateBriefMutation.isPending}
              />
            )}

            {/* Error Display */}
            {generateBriefMutation.isError && (
              <div 
                className="rounded-lg border-l-4 border-l-destructive bg-destructive/10 p-4" 
                role="alert"
                data-testid="alert-error"
              >
                <p className="text-sm font-medium text-destructive">
                  Failed to generate brief. Please try again.
                </p>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
