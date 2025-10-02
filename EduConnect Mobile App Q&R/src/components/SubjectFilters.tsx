import { Button } from "./ui/button";

const subjects = [
  { name: "All", active: true },
  { name: "Math", active: false },
  { name: "AI", active: false },
  { name: "Law", active: false },
  { name: "Physics", active: false },
  { name: "Chemistry", active: false },
  { name: "Biology", active: false },
];

export function SubjectFilters() {
  return (
    <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
      {subjects.map((subject) => (
        <Button
          key={subject.name}
          variant={subject.active ? "default" : "outline"}
          size="sm"
          className={`flex-shrink-0 rounded-full px-4 py-2 ${
            subject.active
              ? "bg-blue-600 text-white hover:bg-blue-700"
              : "bg-white text-gray-600 border-gray-300 hover:bg-gray-50"
          }`}
        >
          {subject.name}
        </Button>
      ))}
    </div>
  );
}