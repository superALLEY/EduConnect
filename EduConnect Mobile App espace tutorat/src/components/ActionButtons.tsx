import { Button } from "./ui/button";
import { Calendar, Plus } from "lucide-react";

export function ActionButtons() {
  return (
    <div className="sticky bottom-20 bg-white border-t border-gray-200 p-4 space-y-3">
      <div className="flex gap-3">
        <Button
          variant="outline"
          className="flex items-center gap-2 border-gray-300 text-gray-700 hover:bg-gray-50"
        >
          <Calendar className="w-4 h-4" />
          Add to Calendar
        </Button>
        
        <Button
          className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
        >
          Register for Session
        </Button>
      </div>
    </div>
  );
}