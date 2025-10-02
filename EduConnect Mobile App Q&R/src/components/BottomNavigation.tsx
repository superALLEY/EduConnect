import { Home, Users, HelpCircle, MessageSquare, User } from "lucide-react";
import { Button } from "./ui/button";

export function BottomNavigation() {
  const navItems = [
    { icon: Home, label: "Home", active: false },
    { icon: Users, label: "Groups", active: false },
    { icon: HelpCircle, label: "Q&A", active: true },
    { icon: MessageSquare, label: "Messages", active: false },
    { icon: User, label: "Profile", active: false },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 py-2 safe-area-pb">
      <div className="flex items-center justify-around max-w-md mx-auto">
        {navItems.map(({ icon: Icon, label, active }) => (
          <Button
            key={label}
            variant="ghost"
            size="sm"
            className={`flex flex-col items-center gap-1 p-2 h-auto min-w-0 ${
              active 
                ? "text-blue-600" 
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            <Icon className="w-5 h-5" />
            <span className="text-xs">{label}</span>
          </Button>
        ))}
      </div>
    </nav>
  );
}