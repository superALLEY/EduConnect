import { Header } from "./components/Header";
import { SearchBar } from "./components/SearchBar";
import { SubjectFilters } from "./components/SubjectFilters";
import { TutoringCard } from "./components/TutoringCard";
import { BottomNavigation } from "./components/BottomNavigation";
import { FloatingActionButton } from "./components/FloatingActionButton";

const sampleTutoringSessions = [
  {
    tutor: {
      name: "Dr. Sarah Mitchell",
      avatar: "https://images.unsplash.com/photo-1746513534315-caa52d3f462c?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx0dXRvciUyMHRlYWNoZXIlMjBwb3J0cmFpdHxlbnwxfHx8fDE3NTkxMDQzNjZ8MA&ixlib=rb-4.1.0&q=80&w=400",
      initials: "SM",
      rating: 4.9
    },
    session: {
      title: "Linear Algebra Basics",
      subject: "Mathematics",
      date: "Oct 2, 2024",
      time: "2:00 PM - 3:30 PM",
      isOnline: true,
      price: "$25/hour"
    }
  },
  {
    tutor: {
      name: "Prof. David Chen",
      avatar: "https://images.unsplash.com/photo-1758685734503-58a8accc24e8?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxwcm9mZXNzb3IlMjBlZHVjYXRvciUyMHBvcnRyYWl0fGVufDF8fHx8MTc1OTEwNDM2N3ww&ixlib=rb-4.1.0&q=80&w=400",
      initials: "DC",
      rating: 4.8
    },
    session: {
      title: "Machine Learning Fundamentals",
      subject: "Artificial Intelligence",
      date: "Oct 3, 2024",
      time: "10:00 AM - 12:00 PM",
      isOnline: false,
      price: "$40/hour"
    }
  },
  {
    tutor: {
      name: "Emma Rodriguez",
      avatar: "https://images.unsplash.com/photo-1758685733907-42e9651721f5?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxzdHVkZW50JTIwdHV0b3IlMjBhY2FkZW1pY3xlbnwxfHx8fDE3NTkxMDQzNjd8MA&ixlib=rb-4.1.0&q=80&w=400",
      initials: "ER",
      rating: 4.7
    },
    session: {
      title: "Constitutional Law Review",
      subject: "Law",
      date: "Oct 4, 2024",
      time: "4:00 PM - 6:00 PM",
      isOnline: true,
      price: "$35/hour"
    }
  },
  {
    tutor: {
      name: "Dr. Michael Park",
      avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxzdHVkZW50fGVufDF8fHx8MTc1OTEwMzkzNHww&ixlib=rb-4.1.0&q=80&w=400",
      initials: "MP",
      rating: 4.9
    },
    session: {
      title: "Quantum Physics Introduction",
      subject: "Physics",
      date: "Oct 5, 2024",
      time: "1:00 PM - 2:30 PM",
      isOnline: false,
      price: "$30/hour"
    }
  },
  {
    tutor: {
      name: "Dr. Lisa Wang",
      avatar: "https://images.unsplash.com/photo-1494790108755-2616b612b789?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxzdHVkZW50fGVufDF8fHx8MTc1OTEwMzkzNHww&ixlib=rb-4.1.0&q=80&w=400",
      initials: "LW",
      rating: 4.8
    },
    session: {
      title: "Organic Chemistry Lab Prep",
      subject: "Chemistry",
      date: "Oct 6, 2024",
      time: "9:00 AM - 11:00 AM",
      isOnline: true,
      price: "$28/hour"
    }
  },
  {
    tutor: {
      name: "James Anderson",
      avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxzdHVkZW50fGVufDF8fHx8MTc1OTEwMzkzNHww&ixlib=rb-4.1.0&q=80&w=400",
      initials: "JA",
      rating: 4.6
    },
    session: {
      title: "Cell Biology and Genetics",
      subject: "Biology",
      date: "Oct 7, 2024",
      time: "3:00 PM - 5:00 PM",
      isOnline: false,
      price: "$26/hour"
    }
  }
];

export default function App() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      {/* Main Content */}
      <main className="pb-20 pt-4">
        <div className="max-w-md mx-auto px-4 space-y-4">
          {/* Search Bar */}
          <SearchBar />
          
          {/* Subject Filters */}
          <SubjectFilters />
          
          {/* Tutoring Sessions */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-gray-900">Available Sessions</h2>
              <span className="text-gray-500 text-sm">{sampleTutoringSessions.length} sessions</span>
            </div>
            
            {sampleTutoringSessions.map((session, index) => (
              <TutoringCard key={index} {...session} />
            ))}
          </div>
        </div>
      </main>

      <BottomNavigation />
      <FloatingActionButton />
    </div>
  );
}