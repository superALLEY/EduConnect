import { Header } from "./components/Header";
import { ConversationCard } from "./components/ConversationCard";
import { BottomNavigation } from "./components/BottomNavigation";
import { FloatingActionButton } from "./components/FloatingActionButton";

const sampleConversations = [
  {
    id: "1",
    name: "Sarah Johnson",
    avatar: "https://images.unsplash.com/photo-1729824186570-4d4aede00043?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxzdHVkZW50JTIwcHJvZmlsZSUyMGF2YXRhcnxlbnwxfHx8fDE3NTkzMzgxMDd8MA&ixlib=rb-4.1.0&q=80&w=400",
    initials: "SJ",
    lastMessage: "Hey, are you ready for the math quiz?",
    timestamp: "2m ago",
    isUnread: true,
    isGroup: false
  },
  {
    id: "2",
    name: "Machine Learning Study Hub",
    avatar: "",
    initials: "ML",
    lastMessage: "New resources have been added to the group.",
    timestamp: "15m ago",
    isUnread: false,
    isGroup: true
  },
  {
    id: "3",
    name: "David Kim",
    avatar: "https://images.unsplash.com/photo-1706025090794-7ade2c1b6208?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx5b3VuZyUyMHByb2Zlc3Npb25hbCUyMGhlYWRzaG90fGVufDF8fHx8MTc1OTI2MTM1N3ww&ixlib=rb-4.1.0&q=80&w=400",
    initials: "DK",
    lastMessage: "Thanks for your help on the project!",
    timestamp: "1h ago",
    isUnread: false,
    isGroup: false
  },
  {
    id: "4",
    name: "Math Tutors & Learners",
    avatar: "",
    initials: "MT",
    lastMessage: "Tomorrow's session starts at 5pm",
    timestamp: "3h ago",
    isUnread: true,
    isGroup: true
  },
  {
    id: "5",
    name: "Emily Rodriguez",
    avatar: "https://images.unsplash.com/photo-1655977237812-ee6beb137203?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjb2xsZWdlJTIwc3R1ZGVudCUyMHBvcnRyYWl0fGVufDF8fHx8MTc1OTI2MTM1OHww&ixlib=rb-4.1.0&q=80&w=400",
    initials: "ER",
    lastMessage: "The chemistry lab report is due tomorrow",
    timestamp: "5h ago",
    isUnread: false,
    isGroup: false
  },
  {
    id: "6",
    name: "Programming Projects Exchange",
    avatar: "",
    initials: "PP",
    lastMessage: "Anyone interested in a React Native project?",
    timestamp: "1d ago",
    isUnread: false,
    isGroup: true
  },
  {
    id: "7",
    name: "Michael Chen",
    avatar: "",
    initials: "MC",
    lastMessage: "See you at the library study session!",
    timestamp: "1d ago",
    isUnread: false,
    isGroup: false
  },
  {
    id: "8",
    name: "Biology Research Community",
    avatar: "",
    initials: "BR",
    lastMessage: "New research paper shared in files",
    timestamp: "2d ago",
    isUnread: false,
    isGroup: true
  }
];

export default function App() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      {/* Messages List */}
      <main className="pb-20">
        <div className="max-w-md mx-auto bg-white">
          {sampleConversations.map((conversation) => (
            <ConversationCard key={conversation.id} conversation={conversation} />
          ))}
        </div>
      </main>

      <BottomNavigation />
      <FloatingActionButton />
    </div>
  );
}