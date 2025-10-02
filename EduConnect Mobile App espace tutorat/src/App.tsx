import { Header } from "./components/Header";
import { TutorProfile } from "./components/TutorProfile";
import { SessionDetails } from "./components/SessionDetails";
import { ActionButtons } from "./components/ActionButtons";
import { ReviewsSection } from "./components/ReviewsSection";
import { BottomNavigation } from "./components/BottomNavigation";
import { ArrowLeft } from "lucide-react";
import { Button } from "./components/ui/button";

const tutorData = {
  name: "Dr. Sarah Mitchell",
  avatar: "https://images.unsplash.com/flagged/photo-1574110878761-bc035e74595d?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxwcm9mZXNzaW9uYWwlMjB0dXRvciUyMHRlYWNoZXIlMjBwb3J0cmFpdHxlbnwxfHx8fDE3NTkxMDUxMzV8MA&ixlib=rb-4.1.0&q=80&w=400",
  initials: "SM",
  bio: "PhD in Mathematics with 8+ years of teaching experience. Specializing in linear algebra, calculus, and applied mathematics. Passionate about helping students understand complex mathematical concepts through clear explanations and practical examples.",
  rating: 4.9,
  reviewCount: 127,
  expertise: ["Linear Algebra", "Calculus", "Statistics", "Applied Math"]
};

const sessionData = {
  subject: "Mathematics",
  title: "Linear Algebra Basics",
  description: "A comprehensive introduction to linear algebra covering vector spaces, matrices, determinants, and eigenvalues. Perfect for students beginning their journey into advanced mathematics or needing a solid foundation for engineering and computer science applications.",
  date: "Tuesday, October 3rd, 2024",
  time: "2:00 PM - 3:30 PM EST",
  duration: "1 hour 30 minutes",
  isOnline: true,
  meetingLink: "Zoom",
  topicsCovered: [
    "Introduction to vectors and vector operations",
    "Matrix operations and properties",
    "Systems of linear equations",
    "Determinants and their applications",
    "Eigenvalues and eigenvectors basics"
  ],
  prerequisites: [
    "Basic algebra and arithmetic skills",
    "Understanding of coordinate systems",
    "Familiarity with graphing functions"
  ]
};

const reviewsData = [
  {
    id: "1",
    student: {
      name: "Alex Chen",
      avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxzdHVkZW50fGVufDF8fHx8MTc1OTEwMzkzNHww&ixlib=rb-4.1.0&q=80&w=400",
      initials: "AC"
    },
    rating: 5,
    date: "2 weeks ago",
    comment: "Dr. Mitchell made linear algebra so much clearer! Her explanations were easy to follow and she provided great examples. Highly recommend for anyone struggling with matrix operations."
  },
  {
    id: "2",
    student: {
      name: "Emma Rodriguez",
      avatar: "https://images.unsplash.com/photo-1494790108755-2616b612b789?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxzdHVkZW50fGVufDF8fHx8MTc1OTEwMzkzNHww&ixlib=rb-4.1.0&q=80&w=400",
      initials: "ER"
    },
    rating: 5,
    date: "1 month ago",
    comment: "Excellent teaching style! Sarah breaks down complex concepts into manageable pieces. The session was well-structured and interactive. I finally understand eigenvalues!"
  },
  {
    id: "3",
    student: {
      name: "Marcus Johnson",
      avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxzdHVkZW50fGVufDF8fHx8MTc1OTEwMzkzNHww&ixlib=rb-4.1.0&q=80&w=400",
      initials: "MJ"
    },
    rating: 4,
    date: "1 month ago",
    comment: "Very knowledgeable and patient tutor. The session helped me prepare for my midterm exam. Would definitely book another session for advanced topics."
  },
  {
    id: "4",
    student: {
      name: "Lisa Park",
      avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxzdHVkZW50fGVufDF8fHx8MTc1OTEwMzkzNHww&ixlib=rb-4.1.0&q=80&w=400",
      initials: "LP"
    },
    rating: 5,
    date: "2 months ago",
    comment: "Outstanding session! Dr. Mitchell's teaching methodology is perfect for visual learners. She uses great diagrams and real-world applications to explain abstract concepts."
  }
];

export default function App() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header with Back Button */}
      <header className="sticky top-0 z-50 bg-white border-b border-gray-200 px-4 py-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" className="p-2">
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </Button>
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-8 h-8 bg-blue-600 rounded-lg">
              <span className="text-white text-xs">📚</span>
            </div>
            <h1 className="text-blue-600">Session Details</h1>
          </div>
        </div>
      </header>
      
      {/* Main Content */}
      <main className="pb-32">
        <div className="max-w-md mx-auto px-4 py-4 space-y-6">
          {/* Tutor Profile */}
          <TutorProfile tutor={tutorData} />
          
          {/* Session Details */}
          <SessionDetails session={sessionData} />
          
          {/* Reviews Section */}
          <ReviewsSection reviews={reviewsData} />
        </div>
      </main>

      {/* Action Buttons */}
      <ActionButtons />
      
      <BottomNavigation />
    </div>
  );
}