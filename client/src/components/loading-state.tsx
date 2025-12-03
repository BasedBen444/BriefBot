import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Loader2 } from "lucide-react";

interface LoadingStateProps {
  progress?: number;
}

export function LoadingState({ progress = 0 }: LoadingStateProps) {
  const getStatusMessage = () => {
    if (progress < 10) return "Preparing documents...";
    if (progress < 30) return "Processing uploaded files...";
    if (progress < 70) return "Analyzing with AI...";
    if (progress < 85) return "Creating your brief...";
    return "Finalizing...";
  };

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      {/* Loading Header */}
      <div className="text-center space-y-4 py-8">
        <div className="flex justify-center">
          <Loader2 className="w-12 h-12 animate-spin text-primary" data-testid="icon-loading" />
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-semibold">Generating Your Brief</h2>
          <p className="text-base text-muted-foreground">
            {getStatusMessage()}
          </p>
        </div>
        
        {/* Progress Bar */}
        <div className="max-w-md mx-auto space-y-2">
          <Progress value={progress} className="h-2" data-testid="progress-bar" />
          <p className="text-sm text-muted-foreground" data-testid="text-progress">
            {progress}% complete
          </p>
        </div>
      </div>

      {/* Brief Skeleton */}
      <Card className="p-8">
        <div className="space-y-8">
          {/* Goal Section */}
          <div className="space-y-3">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-5 w-full" />
            <Skeleton className="h-5 w-4/5" />
          </div>

          {/* Context Section */}
          <div className="space-y-3">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-11/12" />
            <Skeleton className="h-4 w-10/12" />
          </div>

          {/* Options Section */}
          <div className="space-y-3">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-5 w-2/3" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-11/12" />
          </div>

          {/* Decisions Section */}
          <div className="space-y-3">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-5 w-full" />
            <Skeleton className="h-5 w-5/6" />
          </div>

          {/* Actions Section */}
          <div className="space-y-3">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-4 w-4/5" />
            <Skeleton className="h-4 w-4/5" />
            <Skeleton className="h-4 w-3/4" />
          </div>
        </div>
      </Card>
    </div>
  );
}
