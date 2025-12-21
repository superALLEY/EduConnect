import { Search } from "lucide-react";
import { Input } from "./ui/input";

export function SearchBar() {
  return (
    <div className="relative">
      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
      <Input
        type="text"
        placeholder="Search for a tutor, subject, or date"
        className="pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-xl shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
      />
    </div>
  );
}