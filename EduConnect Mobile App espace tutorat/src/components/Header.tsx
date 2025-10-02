import { GraduationCap } from "lucide-react";

export function Header() {
  return (
    <header className="sticky top-0 z-50 bg-white border-b border-gray-200 px-4 py-3">
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center w-8 h-8 bg-blue-600 rounded-lg">
          <GraduationCap className="w-5 h-5 text-white" />
        </div>
        <h1 className="text-blue-600">EduConnect</h1>
      </div>
    </header>
  );
}