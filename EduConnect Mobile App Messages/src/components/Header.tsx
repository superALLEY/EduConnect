import { GraduationCap, MessageSquarePlus } from "lucide-react";
import { Button } from "./ui/button";

export function Header() {
  return (
    <header className="sticky top-0 z-50 bg-white border-b border-gray-200 px-4 py-3 shadow-sm">
      <div className="flex items-center justify-between">
        {/* Left - Logo */}
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-8 h-8 bg-blue-600 rounded-lg">
            <GraduationCap className="w-5 h-5 text-white" />
          </div>
          <span className="text-blue-600 text-sm">EduConnect</span>
        </div>

        {/* Center - Title */}
        <h1 className="text-blue-600">Messages</h1>

        {/* Right - New Message */}
        <Button variant="ghost" size="sm" className="p-2">
          <MessageSquarePlus className="w-5 h-5 text-gray-600" />
        </Button>
      </div>
    </header>
  );
}