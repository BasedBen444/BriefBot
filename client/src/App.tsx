import { Switch, Route, Link } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { FileText, History as HistoryIcon, Calendar } from "lucide-react";
import Home from "@/pages/home";
import History from "@/pages/history";
import BriefDetail from "@/pages/brief-detail";
import CalendarPage from "@/pages/calendar";
import NotFound from "@/pages/not-found";

function Header() {
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
        </nav>
      </div>
    </header>
  );
}

function Router() {
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
