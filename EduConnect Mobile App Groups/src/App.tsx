import { Header } from "./components/Header";
import { GroupCard } from "./components/GroupCard";
import { BottomNavigation } from "./components/BottomNavigation";
import { FloatingActionButton } from "./components/FloatingActionButton";

const sampleGroups = [
  {
    id: "1",
    name: "Machine Learning Study Hub",
    memberCount: 324,
    activity: "Active 1h ago",
    isJoined: false,
    category: 'coding' as const
  },
  {
    id: "2",
    name: "Math Tutors & Learners",
    memberCount: 215,
    activity: "5 new posts today",
    isJoined: true,
    category: 'math' as const
  },
  {
    id: "3",
    name: "Programming Projects Exchange",
    memberCount: 412,
    activity: "Active now",
    isJoined: false,
    category: 'coding' as const
  },
  {
    id: "4",
    name: "Biology Research Community",
    memberCount: 189,
    activity: "2 new posts today",
    isJoined: true,
    category: 'science' as const
  },
  {
    id: "5",
    name: "Psychology Study Group",
    memberCount: 156,
    activity: "Active 3h ago",
    isJoined: false,
    category: 'study' as const
  },
  {
    id: "6",
    name: "Engineering Solutions Hub",
    memberCount: 298,
    activity: "1 new post today",
    isJoined: false,
    category: 'general' as const
  },
  {
    id: "7",
    name: "Language Exchange Network",
    memberCount: 445,
    activity: "Active 30m ago",
    isJoined: true,
    category: 'language' as const
  },
  {
    id: "8",
    name: "Chemistry Lab Partners",
    memberCount: 127,
    activity: "Active 2h ago",
    isJoined: false,
    category: 'science' as const
  }
];

export default function App() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      {/* Groups List */}
      <main className="pb-20 pt-4">
        <div className="max-w-md mx-auto px-4 space-y-3">
          {sampleGroups.map((group) => (
            <GroupCard key={group.id} group={group} />
          ))}
        </div>
      </main>

      <BottomNavigation />
      <FloatingActionButton />
    </div>
  );
}