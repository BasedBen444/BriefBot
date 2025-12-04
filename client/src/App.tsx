import { Switch, Route, Link } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { FileText, History as HistoryIcon, Calendar, LogOut, Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import Home from "@/pages/home";
import History from "@/pages/history";
import BriefDetail from "@/pages/brief-detail";
import CalendarPage from "@/pages/calendar";
import NotFound from "@/pages/not-found";

function Landing() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <Card className="w-full max-w-md mx-4">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="p-3 rounded-full bg-primary/10">
              <FileText className="h-8 w-8 text-primary" />
            </div>
          </div>
          <CardTitle className="text-2xl">Welcome to BriefBot</CardTitle>
          <CardDescription>
            Transform meeting materials into decision-ready briefs with AI
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground text-center">
            Upload documents, connect your calendar, and let AI generate focused meeting briefs with clear decisions, options, and action items.
          </p>
          <Button 
            className="w-full" 
            size="lg"
            onClick={() => window.location.href = "/api/login"}
            data-testid="button-login"
          >
            Sign In to Get Started
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

function Header() {
  const { user } = useAuth();

  return (
    <header className="border-b border-border bg-background">
      <div className="max-w-7xl mx-auto px-8 py-4 flex items-center justify-between">
        <Link href="/">
          <div className="flex items-center gap-2 hover-elevate cursor-pointer rounded-md px-3 py-2">
            <FileText className="h-5 w-5 text-primary" />
            <span className="font-semibold text-lg">BriefBot</span>
          </div>
        </Link>
        <nav className="flex items-center gap-2">
          <Link href="/">
            <Button variant="ghost" size="sm" data-testid="nav-new-brief">
              <FileText className="mr-2 h-4 w-4" />
              New Brief
            </Button>
          </Link>
          <Link href="/calendar">
            <Button variant="ghost" size="sm" data-testid="nav-calendar">
              <Calendar className="mr-2 h-4 w-4" />
              Calendar
            </Button>
          </Link>
          <Link href="/history">
            <Button variant="ghost" size="sm" data-testid="nav-history">
              <HistoryIcon className="mr-2 h-4 w-4" />
              History
            </Button>
          </Link>
          {user && (
            <div className="flex items-center gap-2 ml-4 pl-4 border-l border-border">
              <Avatar className="h-8 w-8">
                <AvatarImage src={user.profileImageUrl || undefined} alt={user.firstName || "User"} />
                <AvatarFallback>
                  {(user.firstName?.[0] || user.email?.[0] || "U").toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <Button 
                variant="ghost" 
                size="icon"
                onClick={() => window.location.href = "/api/logout"}
                data-testid="button-logout"
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          )}
        </nav>
      </div>
    </header>
  );
}

function Router() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Landing />;
  }

  return (
    <>
      <Header />
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/calendar" component={CalendarPage} />
        <Route path="/history" component={History} />
        <Route path="/brief/:id" component={BriefDetail} />
        <Route component={NotFound} />
      </Switch>
    </>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
