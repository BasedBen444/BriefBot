import { useState, useEffect, useRef, useCallback } from "react";
import { useMutation } from "@tanstack/react-query";
import { DocumentUpload } from "@/components/document-upload";
import { MeetingForm } from "@/components/meeting-form";
import { BriefDisplay } from "@/components/brief-display";
import { LoadingState } from "@/components/loading-state";
import type { UploadedFile, MeetingMetadata, Brief } from "@shared/schema";
import { FileText } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type JobStatus = "pending" | "processing" | "completed" | "failed";

interface JobResponse {
  success: boolean;
  job: {
    id: number;
    status: JobStatus;
    progress: number;
    error: string | null;
    resultBriefId: number | null;
  };
  brief: Brief | null;
}

// LocalStorage keys for persisting job state
const STORAGE_KEYS = {
  JOB_ID: "briefbot_active_job_id",
  METADATA: "briefbot_job_metadata",
};

// Helper functions for localStorage
function getStoredJobId(): number | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.JOB_ID);
    return stored ? parseInt(stored, 10) : null;
  } catch {
    return null;
  }
}

function setStoredJobId(jobId: number | null): void {
  try {
    if (jobId === null) {
      localStorage.removeItem(STORAGE_KEYS.JOB_ID);
    } else {
      localStorage.setItem(STORAGE_KEYS.JOB_ID, String(jobId));
    }
  } catch {
    // Ignore storage errors
  }
}

function getStoredMetadata(): MeetingMetadata | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.METADATA);
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
}

function setStoredMetadata(metadata: MeetingMetadata | null): void {
  try {
    if (metadata === null) {
      localStorage.removeItem(STORAGE_KEYS.METADATA);
    } else {
      localStorage.setItem(STORAGE_KEYS.METADATA, JSON.stringify(metadata));
    }
  } catch {
    // Ignore storage errors
  }
}

function clearStoredJobState(): void {
  try {
    localStorage.removeItem(STORAGE_KEYS.JOB_ID);
    localStorage.removeItem(STORAGE_KEYS.METADATA);
  } catch {
    // Ignore storage errors
  }
}

export default function Home() {
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [metadata, setMetadata] = useState<MeetingMetadata | null>(null);
  const [generatedBrief, setGeneratedBrief] = useState<Brief | null>(null);
  const [jobId, setJobId] = useState<number | null>(null);
  const [jobProgress, setJobProgress] = useState<number>(0);
  const [isPolling, setIsPolling] = useState<boolean>(false);
  const pollingIntervalRef = useRef<number | null>(null);
  const { toast } = useToast();

  // Poll for job status
  const pollJobStatus = useCallback(async (id: number) => {
    try {
      const response = await fetch(`/api/jobs/${id}`, {
        credentials: "include",
      });
      
      if (!response.ok) {
        throw new Error("Failed to fetch job status");
      }

      const data: JobResponse = await response.json();
      
      if (data.success) {
        setJobProgress(data.job.progress);

        if (data.job.status === "completed" && data.brief) {
          // Job completed successfully
          setGeneratedBrief(data.brief);
          setIsPolling(false);
          setJobId(null);
          clearStoredJobState(); // Clear localStorage
          if (pollingIntervalRef.current) {
            clearInterval(pollingIntervalRef.current);
            pollingIntervalRef.current = null;
          }
        } else if (data.job.status === "failed") {
          // Job failed
          setIsPolling(false);
          setJobId(null);
          clearStoredJobState(); // Clear localStorage
          if (pollingIntervalRef.current) {
            clearInterval(pollingIntervalRef.current);
            pollingIntervalRef.current = null;
          }
          toast({
            title: "Brief generation failed",
            description: data.job.error || "An unknown error occurred",
            variant: "destructive",
          });
        }
        // If still pending or processing, continue polling
      }
    } catch (error) {
      console.error("Error polling job status:", error);
      // Don't stop polling on transient errors
    }
  }, [toast]);

  // Check for existing job on mount (resume after navigation)
  useEffect(() => {
    const storedJobId = getStoredJobId();
    const storedMetadata = getStoredMetadata();
    
    if (storedJobId && storedMetadata) {
      // Resume polling for existing job
      setJobId(storedJobId);
      setMetadata(storedMetadata);
      setIsPolling(true);
    }
  }, []);

  // Start polling when jobId changes
  useEffect(() => {
    if (jobId && isPolling) {
      // Initial poll
      pollJobStatus(jobId);
      
      // Set up interval polling every 1.5 seconds
      pollingIntervalRef.current = window.setInterval(() => {
        pollJobStatus(jobId);
      }, 1500);

      return () => {
        if (pollingIntervalRef.current) {
          clearInterval(pollingIntervalRef.current);
          pollingIntervalRef.current = null;
        }
      };
    }
  }, [jobId, isPolling, pollJobStatus]);

  // Cleanup on unmount - but DON'T clear localStorage (allow resume)
  useEffect(() => {
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, []);

  const submitJobMutation = useMutation({
    mutationFn: async (data: FormData) => {
      const response = await fetch("/api/generate-brief", {
        method: "POST",
        body: data,
        credentials: "include",
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Failed to start brief generation" }));
        throw new Error(errorData.error || "Failed to start brief generation");
      }

      return await response.json();
    },
    onSuccess: (data) => {
      if (data.success && data.jobId) {
        setJobId(data.jobId);
        setJobProgress(0);
        setIsPolling(true);
        // Store job state in localStorage for resume after navigation
        setStoredJobId(data.jobId);
      }
    },
    onError: (error) => {
      toast({
        title: "Failed to start brief generation",
        description: error instanceof Error ? error.message : "An error occurred",
        variant: "destructive",
      });
    },
  });

  const handleGenerateBrief = async (formMetadata: MeetingMetadata) => {
    if (uploadedFiles.length === 0) return;

    setMetadata(formMetadata);
    // Store metadata in localStorage for resume after navigation
    setStoredMetadata(formMetadata);
    
    const formData = new FormData();
    formData.append("metadata", JSON.stringify(formMetadata));
    
    uploadedFiles.forEach((uploadedFile) => {
      formData.append("files", uploadedFile.file);
    });

    submitJobMutation.mutate(formData);
  };

  const handleReset = () => {
    setGeneratedBrief(null);
    setUploadedFiles([]);
    setMetadata(null);
    setJobId(null);
    setJobProgress(0);
    setIsPolling(false);
    clearStoredJobState(); // Clear localStorage
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
  };

  const isLoading = submitJobMutation.isPending || isPolling;

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
        {isLoading ? (
          <LoadingState progress={jobProgress} />
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
                isGenerating={isLoading}
              />
            )}

            {/* Error Display */}
            {submitJobMutation.isError && (
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
