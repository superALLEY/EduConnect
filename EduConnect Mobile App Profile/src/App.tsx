import { Header } from "./components/Header";
import { ProfileInfo } from "./components/ProfileInfo";
import { StatsCard } from "./components/StatsCard";
import { ProfileOptions } from "./components/ProfileOptions";
import { BottomNavigation } from "./components/BottomNavigation";
import { FloatingActionButton } from "./components/FloatingActionButton";

const currentUser = {
  name: "Mohamed Ali",
  avatar: "https://images.unsplash.com/photo-1600180758890-6b94519a8ba6?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxwcm9mZXNzaW9uYWwlMjBzdHVkZW50JTIwaGVhZHNob3R8ZW58MXx8fHwxNzU5MzYzMzkwfDA&ixlib=rb-4.1.0&q=80&w=400",
  initials: "MA",
  role: "Computer Science Student"
};

const userStats = {
  posts: 42,
  groups: 12,
  followers: 156
};

export default function App() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      {/* Profile Content */}
      <main className="pb-20 pt-4">
        <div className="max-w-md mx-auto">
          {/* Profile Info */}
          <ProfileInfo user={currentUser} />

          {/* Stats */}
          <StatsCard stats={userStats} />

          {/* Profile Options */}
          <ProfileOptions />
        </div>
      </main>

      <BottomNavigation />
      <FloatingActionButton />
    </div>
  );
}