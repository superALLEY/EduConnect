import { Settings } from "lucide-react";
import { Button } from "./ui/button";

export function Header() {
  return (
    <header className="sticky top-0 z-50 bg-white border-b border-gray-200 px-4 py-3 shadow-sm">
      <div className="flex items-center justify-between">
        {/* Left - Empty for centering */}
        <div className="w-10"></div>

        {/* Center - Title */}
        <h1 className="text-blue-600">Profile</h1>

        {/* Right - Settings */}
        <Button variant="ghost" size="sm" className="p-2">
          <Settings className="w-5 h-5 text-gray-600" />
        </Button>
      </div>
    </header>
  );
}