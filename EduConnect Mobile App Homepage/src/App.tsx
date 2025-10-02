import { Header } from "./components/Header";
import { PostCard } from "./components/PostCard";
import { BottomNavigation } from "./components/BottomNavigation";
import { FloatingActionButton } from "./components/FloatingActionButton";

const samplePosts = [
  {
    user: {
      name: "Sarah Chen",
      avatar: "https://images.unsplash.com/photo-1729824186570-4d4aede00043?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxzdHVkZW50JTIwcHJvZmlsZSUyMGF2YXRhcnxlbnwxfHx8fDE3NTkwMDAxMjl8MA&ixlib=rb-4.1.0&q=80&w=400",
      initials: "SC",
      department: "Computer Science"
    },
    timeAgo: "2h",
    content: "Just published my research paper on machine learning applications in education! Looking for collaborators interested in EdTech innovations. Would love to hear your thoughts! 📚",
    image: "https://images.unsplash.com/photo-1634562876572-5abe57afcceb?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHxyZXNlYXJjaCUyMHBhcGVyJTIwZG9jdW1lbnR8ZW58MXx8fHwxNzU5MTAzOTM0fDA&ixlib=rb-4.1.0&q=80&w=1080",
    likes: 24,
    comments: 8,
    type: 'image' as const
  },
  {
    user: {
      name: "Marcus Rodriguez",
      avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxzdHVkZW50fGVufDF8fHx8MTc1OTEwMzkzNHww&ixlib=rb-4.1.0&q=80&w=400",
      initials: "MR",
      department: "Biology"
    },
    timeAgo: "4h",
    content: "Organizing a study group for Advanced Molecular Biology this weekend at the library. We'll be covering protein synthesis and gene regulation. Anyone interested in joining?",
    likes: 12,
    comments: 15,
    type: 'text' as const
  },
  {
    user: {
      name: "Emma Thompson",
      avatar: "https://images.unsplash.com/photo-1494790108755-2616b612b789?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxzdHVkZW50fGVufDF8fHx8MTc1OTEwMzkzNHww&ixlib=rb-4.1.0&q=80&w=400",
      initials: "ET",
      department: "Psychology"
    },
    timeAgo: "6h",
    content: "Amazing turnout at today's psychology conference! The keynote on cognitive behavioral therapy was incredibly insightful. Great networking opportunities with fellow researchers.",
    image: "https://images.unsplash.com/photo-1660795308754-4c6422baf2f6?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxhY2FkZW1pYyUyMGNvbmZlcmVuY2UlMjBwcmVzZW50YXRpb258ZW58MXx8fHwxNzU5MTAzOTM0fDA&ixlib=rb-4.1.0&q=80&w=1080",
    likes: 31,
    comments: 12,
    type: 'image' as const
  },
  {
    user: {
      name: "James Wilson",
      avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxzdHVkZW50fGVufDF8fHx8MTc1OTEwMzkzNHww&ixlib=rb-4.1.0&q=80&w=400",
      initials: "JW",
      department: "Engineering"
    },
    timeAgo: "1d",
    content: "Working on a sustainable energy project for my thesis. Looking for feedback on solar panel efficiency optimization. Has anyone worked with photovoltaic systems before?",
    likes: 18,
    comments: 6,
    type: 'text' as const
  },
  {
    user: {
      name: "Priya Patel",
      avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxzdHVkZW50fGVufDF8fHx8MTc1OTEwMzkzNHww&ixlib=rb-4.1.0&q=80&w=400",
      initials: "PP",
      department: "Mathematics"
    },
    timeAgo: "1d",
    content: "Beautiful day for studying on campus! The new library spaces are perfect for collaborative work. Nothing beats fresh air and good mathematics problems. 🌞",
    image: "https://images.unsplash.com/photo-1567562227343-a72d22e187c8?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx1bml2ZXJzaXR5JTIwY2FtcHVzJTIwc3R1ZHl8ZW58MXx8fHwxNzU5MTAzOTM0fDA&ixlib=rb-4.1.0&q=80&w=1080",
    likes: 27,
    comments: 9,
    type: 'image' as const
  }
];

export default function App() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      {/* Main Feed */}
      <main className="pb-20 pt-4">
        <div className="max-w-md mx-auto px-4 space-y-4">
          {samplePosts.map((post, index) => (
            <PostCard key={index} {...post} />
          ))}
        </div>
      </main>

      <BottomNavigation />
      <FloatingActionButton />
    </div>
  );
}