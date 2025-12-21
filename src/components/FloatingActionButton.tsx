import { Plus } from "lucide-react";
import { Button } from "./ui/button";

export function FloatingActionButton() {
  return (
    <Button
      className="fixed bottom-20 right-4 w-14 h-14 rounded-full bg-blue-600 hover:bg-blue-700 shadow-lg z-50"
      size="sm"
    >
      <Plus className="w-6 h-6 text-white" />
    </Button>
  );
}