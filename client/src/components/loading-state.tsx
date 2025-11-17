import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Loader2 } from "lucide-react";

export function LoadingState() {
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
            Analyzing documents and creating a decision-ready summary...
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
