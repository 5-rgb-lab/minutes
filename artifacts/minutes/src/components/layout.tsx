import { Link, useLocation } from "wouter";
import { Calendar, LayoutDashboard, Menu, X, Plus, Sun, Moon } from "lucide-react";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/lib/theme";

export function Layout({ children }: { children: React.ReactNode }) {
  const [location, navigate] = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { theme, toggle } = useTheme();

  const navigation = [
    { name: "Dashboard", href: "/", icon: LayoutDashboard },
    { name: "Meetings", href: "/meetings", icon: Calendar },
  ];

  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location]);

  return (
    <div className="min-h-screen bg-background flex flex-col md:flex-row">
      {/* Mobile top bar */}
      <div className="md:hidden flex items-center justify-between p-4 border-b bg-card">
        <div className="font-semibold tracking-tight text-lg">Minutes</div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" onClick={toggle} aria-label="Toggle theme">
            {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>
          <Button variant="ghost" size="icon" onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
            {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>
      </div>

      {/* Sidebar */}
      <aside
        className={`
          ${isMobileMenuOpen ? "flex" : "hidden"}
          md:flex flex-col w-full md:w-64 border-r bg-card/50 backdrop-blur-sm
          md:sticky md:top-0 md:h-screen z-40
        `}
      >
        {/* Logo */}
        <div className="hidden md:flex p-6 items-center justify-between">
          <div className="font-semibold tracking-tight text-lg bg-primary/10 text-primary px-3 py-1 rounded-md">
            Minutes
          </div>
          <Button variant="ghost" size="icon" onClick={toggle} aria-label="Toggle theme">
            {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>
        </div>

        {/* Nav links */}
        <nav className="flex-1 p-4 space-y-1">
          {navigation.map((item) => {
            const isActive =
              location === item.href ||
              (item.href !== "/" && location.startsWith(item.href));
            return (
              <a
                key={item.name}
                href={item.href}
                onClick={(e) => {
                  e.preventDefault();
                  navigate(item.href);
                }}
                className={`
                  flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors cursor-pointer
                  ${
                    isActive
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                  }
                `}
              >
                <item.icon className="h-4 w-4" />
                {item.name}
              </a>
            );
          })}
        </nav>

        {/* New meeting button */}
        <div className="p-4">
          <Button
            className="w-full justify-start shadow-sm"
            variant="outline"
            onClick={() => navigate("/meetings/new")}
          >
            <Plus className="mr-2 h-4 w-4" />
            New Meeting
          </Button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 w-full min-w-0">{children}</main>
    </div>
  );
}
