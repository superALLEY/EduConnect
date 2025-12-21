import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../config/firebase";
import { CourseVideoPlayer } from "../components/CourseVideoPlayer";
import { useAuth } from "../contexts/AuthContext";

interface VideoContent {
  id: string;
  title: string;
  description: string;
  videoUrl: string;
  uploadedAt: any;
}

interface Course {
  id: string;
  title: string;
  videos?: VideoContent[];
}

export function WatchVideoPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { currentUser } = useAuth();
  
  const courseId = searchParams.get("courseId");
  const videoId = searchParams.get("videoId");
  
  const [course, setCourse] = useState<Course | null>(null);
  const [video, setVideo] = useState<VideoContent | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!courseId || !videoId) {
      setError("Course ID or Video ID missing");
      setLoading(false);
      return;
    }

    loadCourseAndVideo();
  }, [courseId, videoId]);

  const loadCourseAndVideo = async () => {
    if (!courseId || !videoId) return;

    try {
      setLoading(true);
      
      // Load course
      const courseDoc = await getDoc(doc(db, "courses", courseId));
      
      if (!courseDoc.exists()) {
        setError("Course not found");
        setLoading(false);
        return;
      }

      const courseData = { id: courseDoc.id, ...courseDoc.data() } as Course;
      setCourse(courseData);

      // Find the specific video
      const foundVideo = courseData.videos?.find(v => v.id === videoId);
      
      if (!foundVideo) {
        setError("Video not found");
        setLoading(false);
        return;
      }

      setVideo(foundVideo);
      setLoading(false);
    } catch (err) {
      console.error("Error loading video:", err);
      setError("Failed to load video");
      setLoading(false);
    }
  };

  const handleBack = () => {
    navigate(-1); // Go back to previous page
  };

  const handleVideoComplete = () => {
    // Video completed - progression already updated by CourseVideoPlayer
    console.log("Video completed!");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Chargement de la vidéo...</p>
        </div>
      </div>
    );
  }

  if (error || !course || !video) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">❌</span>
          </div>
          <h2 className="text-xl text-gray-900 mb-2">Erreur</h2>
          <p className="text-gray-600 mb-4">{error || "Video not found"}</p>
          <button
            onClick={handleBack}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Retour
          </button>
        </div>
      </div>
    );
  }

  return (
    <CourseVideoPlayer
      video={video}
      courseId={course.id}
      courseName={course.title}
      allVideos={course.videos || []}
      onBack={handleBack}
      onVideoComplete={handleVideoComplete}
    />
  );
}
