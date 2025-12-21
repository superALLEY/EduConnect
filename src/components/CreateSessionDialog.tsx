import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import { RadioGroup, RadioGroupItem } from "./ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Calendar, MapPin, Users as UsersIcon, Loader2, Video, GraduationCap, Sparkles, Coffee, Repeat, X, BookOpen } from "lucide-react";
import { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import { collection, addDoc, Timestamp, doc, getDoc, query, where, getDocs, writeBatch } from "firebase/firestore";
import { db } from "../config/firebase";
import { toast } from "sonner";
import { Checkbox } from "./ui/checkbox";

interface CreateSessionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSessionCreated?: () => void;
}

interface Group {
  id: string;
  name: string;
}

export function CreateSessionDialog({ open, onOpenChange, onSessionCreated }: CreateSessionDialogProps) {
  const { currentUser } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [userRole, setUserRole] = useState<string>("");
  const [userName, setUserName] = useState<string>("");
  const [groups, setGroups] = useState<Group[]>([]);
  
  // Form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [maxParticipants, setMaxParticipants] = useState("");
  const [location, setLocation] = useState("");
  const [meetingLink, setMeetingLink] = useState("");
  const [sessionType, setSessionType] = useState<"online" | "in-person">("in-person");
  const [postType, setPostType] = useState<"private" | "group">("private");
  const [selectedGroupId, setSelectedGroupId] = useState<string>("");
  const [category, setCategory] = useState<"event" | "tutoring" | "group_meet">("event");
  
  // Repetition state
  const [isRepetitive, setIsRepetitive] = useState(false);
  const [repetitionFrequency, setRepetitionFrequency] = useState<"daily" | "weekly" | "monthly">("weekly");
  const [selectedDays, setSelectedDays] = useState<number[]>([]); // 0=Sunday, 1=Monday, etc.
  const [repetitionEndDate, setRepetitionEndDate] = useState("");

  // Load user data and groups
  useEffect(() => {
    const loadUserData = async () => {
      if (!currentUser) return;

      try {
        // Load user profile
        const userDoc = await getDoc(doc(db, "users", currentUser.uid));
        if (userDoc.exists()) {
          const data = userDoc.data();
          const role = data.role || "";
          setUserRole(role);
          setUserName(data.name || "");
        }

        // Load user's groups
        const groupsQuery = query(
          collection(db, "groups"),
          where("members", "array-contains", currentUser.uid)
        );
        const groupsSnapshot = await getDocs(groupsQuery);
        const groupsList: Group[] = [];
        groupsSnapshot.forEach((doc) => {
          groupsList.push({
            id: doc.id,
            name: doc.data().name,
          });
        });
        setGroups(groupsList);
      } catch (error) {
        console.error("Error loading user data:", error);
      }
    };

    if (open) {
      loadUserData();
    }
  }, [currentUser, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (userRole !== "teacher" && userRole !== "both") {
      toast.error("Seuls les enseignants peuvent créer des sessions");
      return;
    }

    if (!title.trim() || !date || !startTime || !endTime || !maxParticipants) {
      toast.error("Veuillez remplir tous les champs obligatoires");
      return;
    }

    // Validate time range (8 AM to 8 PM)
    const startHour = parseInt(startTime.split(":")[0]);
    const endHour = parseInt(endTime.split(":")[0]);
    const endMinute = parseInt(endTime.split(":")[1]);
    
    if (startHour < 8 || startHour >= 20 || endHour < 8 || (endHour === 20 && endMinute > 0) || endHour > 20) {
      toast.error("Les horaires doivent être entre 8h00 et 20h00");
      return;
    }

    if (startTime >= endTime) {
      toast.error("L'heure de fin doit être après l'heure de début");
      return;
    }

    if (postType === "group" && !selectedGroupId) {
      toast.error("Veuillez sélectionner un groupe");
      return;
    }

    if (sessionType === "in-person" && !location.trim()) {
      toast.error("Veuillez indiquer le lieu pour une session en présentiel");
      return;
    }

    if (sessionType === "online" && !meetingLink.trim()) {
      toast.error("Veuillez fournir un lien de réunion pour une session en ligne");
      return;
    }

    if (isRepetitive && !repetitionEndDate) {
      toast.error("Veuillez spécifier une date de fin pour la répétition");
      return;
    }

    if (isRepetitive && repetitionFrequency === "weekly" && selectedDays.length === 0) {
      toast.error("Veuillez sélectionner au moins un jour de la semaine");
      return;
    }

    try {
      setIsSubmitting(true);

      let organizerName = userName;
      let groupData = null;
      
      if (postType === "group" && selectedGroupId) {
        const groupDoc = await getDoc(doc(db, "groups", selectedGroupId));
        if (groupDoc.exists()) {
          organizerName = groupDoc.data().name;
          groupData = groupDoc.data();
        }
      }

      // Generate all session dates based on repetition settings
      const sessionDates: string[] = [];
      const repetitionId = `rep_${Date.now()}`; // Unique ID for linked sessions
      
      if (isRepetitive) {
        const startDate = new Date(date);
        const endDate = new Date(repetitionEndDate);
        
        if (repetitionFrequency === "daily") {
          // Generate daily sessions
          for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
            sessionDates.push(new Date(d).toISOString().split('T')[0]);
          }
        } else if (repetitionFrequency === "weekly") {
          // Generate weekly sessions on selected days
          for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
            if (selectedDays.includes(d.getDay())) {
              sessionDates.push(new Date(d).toISOString().split('T')[0]);
            }
          }
        } else if (repetitionFrequency === "monthly") {
          // Generate monthly sessions (same day of month)
          const dayOfMonth = startDate.getDate();
          for (let d = new Date(startDate); d <= endDate; ) {
            sessionDates.push(new Date(d).toISOString().split('T')[0]);
            d.setMonth(d.getMonth() + 1);
            d.setDate(dayOfMonth);
          }
        }
      } else {
        // Single session
        sessionDates.push(date);
      }

      // Create all sessions
      const createdSessionIds: string[] = [];
      
      for (const sessionDate of sessionDates) {
        const dateObj = new Date(sessionDate);
        const formattedDate = dateObj.toLocaleDateString("fr-FR", {
          day: "numeric",
          month: "long",
          year: "numeric"
        });

        // Map category to display string with emoji
        const categoryDisplayMap = {
          "course": "Cours 📚",
          "event": "Événement 🌟",
          "tutoring": "Tutorat 🎓",
          "group_meet": "Rencontre de groupe ☕"
        };

        const sessionData = {
          title: title.trim(),
          description: description.trim(),
          organizer: organizerName,
          organizerId: currentUser!.uid,
          teacherName: userName,
          date: sessionDate,
          formattedDate: formattedDate,
          startTime: startTime,
          endTime: endTime,
          time: `${startTime} - ${endTime}`,
          location: sessionType === "in-person" ? location.trim() : "En ligne",
          meetingLink: sessionType === "online" ? meetingLink.trim() : null,
          attendees: 1,
          maxAttendees: parseInt(maxParticipants),
          category: categoryDisplayMap[category],
          sessionCategory: category,
          isOnline: sessionType === "online",
          isGroupSession: postType === "group",
          isTutoring: category === "tutoring",
          isEvent: category === "event",
          isGroupMeet: category === "group_meet",
          isCourseSession: category === "course",
          groupId: postType === "group" ? selectedGroupId : null,
          createdAt: Timestamp.now(),
          createdBy: currentUser!.uid,
          participants: [currentUser!.uid],
          isRepetitive: isRepetitive,
          repetitionId: isRepetitive ? repetitionId : null,
          repetitionFrequency: isRepetitive ? repetitionFrequency : null,
        };

        const sessionRef = await addDoc(collection(db, "sessions"), sessionData);
        createdSessionIds.push(sessionRef.id);
      }

      // If repetitive, add all sessions to creator's schedule automatically
      if (isRepetitive && createdSessionIds.length > 0) {
        console.log(`📅 Adding ${createdSessionIds.length} repetitive sessions to creator's schedule...`);
        
        const scheduleBatch = writeBatch(db);
        
        for (let i = 0; i < createdSessionIds.length; i++) {
          const sessionId = createdSessionIds[i];
          const sessionDate = sessionDates[i];
          const dateObj = new Date(sessionDate);
          const formattedDate = dateObj.toLocaleDateString("fr-FR", {
            day: "numeric",
            month: "long",
            year: "numeric"
          });
          
          const scheduleRef = doc(collection(db, "schedules"));
          scheduleBatch.set(scheduleRef, {
            userId: currentUser!.uid,
            sessionId: sessionId,
            title: title.trim(),
            description: description.trim(),
            date: sessionDate,
            formattedDate: formattedDate,
            startTime: startTime,
            endTime: endTime,
            location: sessionType === "in-person" ? location.trim() : "En ligne",
            isOnline: sessionType === "online",
            meetingLink: sessionType === "online" ? meetingLink.trim() : null,
            category: category,
            isRepetitive: true,
            repetitionId: repetitionId,
            createdAt: Timestamp.now(),
          });
        }
        
        await scheduleBatch.commit();
        console.log(`✅ Successfully added ${createdSessionIds.length} sessions to creator's schedule`);
      }

      // Create notification and post only for the first session if it's a group session
      if (postType === "group" && selectedGroupId && groupData && createdSessionIds.length > 0) {
        const batch = writeBatch(db);
        
        // Get user profile for notifications
        const userDoc = await getDoc(doc(db, "users", currentUser!.uid));
        const userProfile = userDoc.data();
        const userAvatar = userProfile?.profilePicture || "";
        
        // Get all group members except the creator
        const groupMembers = groupData.members || [];
        const membersToNotify = groupMembers.filter((memberId: string) => memberId !== currentUser!.uid);

        const firstDate = new Date(sessionDates[0]);
        const firstFormattedDate = firstDate.toLocaleDateString("fr-FR", {
          day: "numeric",
          month: "long",
          year: "numeric"
        });

        // Create notifications for all members
        for (const memberId of membersToNotify) {
          const notificationRef = doc(collection(db, "notifications"));
          const notificationMessage = isRepetitive 
            ? `${userName} a planifié "${title}" (répétitif) - Commence le ${firstFormattedDate} à ${startTime}`
            : `${userName} a planifié "${title}" le ${firstFormattedDate} à ${startTime}`;
            
          batch.set(notificationRef, {
            created_at: Timestamp.now(),
            from: currentUser!.uid,
            fromAvatar: userAvatar,
            fromName: userName,
            message: notificationMessage,
            status: "unread",
            to: memberId,
            type: "group_session",
            sessionId: createdSessionIds[0],
            groupId: selectedGroupId,
          });
        }

        // Create a post in the group
        const postRef = doc(collection(db, "posts"));
        
        const repetitionText = isRepetitive 
          ? `\n🔁 Répétition : ${repetitionFrequency === "daily" ? "Quotidienne" : repetitionFrequency === "weekly" ? "Hebdomadaire" : "Mensuelle"} (${sessionDates.length} sessions)\n`
          : "";
        
        const sessionPostContent = `📅 Nouvelle session planifiée !\n\n📌 ${title}\n\n${description ? `📝 ${description}\n\n` : ""}📆 Date : ${firstFormattedDate}${repetitionText}
🕐 Heure : ${startTime} - ${endTime}
📍 Lieu : ${sessionType === "in-person" ? location.trim() : "En ligne 💻"}
👥 Places disponibles : ${maxParticipants}

#Session #${organizerName.replace(/\s+/g, "")}`;

        batch.set(postRef, {
          userId: currentUser!.uid,
          userName: userProfile?.name || "Utilisateur",
          userProfilePicture: userProfile?.profilePicture || "",
          userDepartment: userProfile?.fieldOfStudy || "",
          content: sessionPostContent,
          hashtags: ["#Session", `#${organizerName.replace(/\s+/g, "")}`],
          fileUrl: null,
          fileName: null,
          fileType: null,
          isGroupPost: true,
          groupId: selectedGroupId,
          groupName: organizerName,
          sessionId: createdSessionIds[0],
          likes: 0,
          comments: 0,
          likedBy: [],
          commentsList: [],
          savedBy: [],
          createdAt: new Date().toISOString(),
        });

        await batch.commit();
      }

      const successMessage = isRepetitive 
        ? `${sessionDates.length} sessions créées avec succès !`
        : "Session créée avec succès !";
      
      toast.success(successMessage);
      
      // Reset form
      setTitle("");
      setDescription("");
      setDate("");
      setStartTime("");
      setEndTime("");
      setMaxParticipants("");
      setLocation("");
      setMeetingLink("");
      setSessionType("in-person");
      setPostType("private");
      setSelectedGroupId("");
      setCategory("event"); // Reset category
      setIsRepetitive(false);
      setRepetitionFrequency("weekly");
      setSelectedDays([]);
      setRepetitionEndDate("");

      onOpenChange(false);
      
      if (onSessionCreated) {
        onSessionCreated();
      }
    } catch (error) {
      console.error("Error creating session:", error);
      toast.error("Erreur lors de la création de la session");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    // Only check role when opening, not closing
    if (newOpen) {
      // If we haven't loaded the user role yet, let it open and we'll check inside
      if (userRole && userRole !== "teacher" && userRole !== "both") {
        toast.error("Seuls les enseignants peuvent créer des sessions 👨‍🏫");
        return;
      }
    }
    onOpenChange(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg sm:text-xl">Planifier une session</DialogTitle>
          <DialogDescription className="text-sm sm:text-base">
            Créez une nouvelle session d'étude ou de tutorat pour vos étudiants
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title" className="text-sm sm:text-base">Titre de la session *</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: AI & Machine Learning Workshop"
              required
              className="text-sm sm:text-base"
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description" className="text-sm sm:text-base">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Décrivez votre session..."
              rows={3}
              className="text-sm sm:text-base"
            />
          </div>

          {/* Category */}
          <div className="space-y-2">
            <Label className="text-sm sm:text-base">Catégorie *</Label>
            <RadioGroup value={category} onValueChange={(value: any) => setCategory(value)}>
              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                <div className="flex items-center space-x-2 p-3 sm:p-4 border rounded-lg hover:border-blue-500 transition-colors cursor-pointer flex-1">
                  <RadioGroupItem value="event" id="event" />
                  <Label htmlFor="event" className="cursor-pointer flex items-center gap-2 text-sm sm:text-base">
                    <Calendar className="w-4 h-4 sm:w-5 sm:h-5 text-blue-500" />
                    <span>Événement</span>
                  </Label>
                </div>
                <div className="flex items-center space-x-2 p-3 sm:p-4 border rounded-lg hover:border-green-500 transition-colors cursor-pointer flex-1">
                  <RadioGroupItem value="tutoring" id="tutoring" />
                  <Label htmlFor="tutoring" className="cursor-pointer flex items-center gap-2 text-sm sm:text-base">
                    <GraduationCap className="w-4 h-4 sm:w-5 sm:h-5 text-green-500" />
                    <span>Tutorat</span>
                  </Label>
                </div>
                <div className="flex items-center space-x-2 p-3 sm:p-4 border rounded-lg hover:border-purple-500 transition-colors cursor-pointer flex-1">
                  <RadioGroupItem value="group_meet" id="group_meet" />
                  <Label htmlFor="group_meet" className="cursor-pointer flex items-center gap-2 text-sm sm:text-base">
                    <Coffee className="w-4 h-4 sm:w-5 sm:h-5 text-purple-500" />
                    <span className="hidden sm:inline">Rencontre</span>
                    <span className="sm:hidden">Mtg</span>
                  </Label>
                </div>
              </div>
            </RadioGroup>
          </div>

          {/* Session Type */}
          <div className="space-y-2">
            <Label className="text-sm sm:text-base">Type de session *</Label>
            <RadioGroup value={sessionType} onValueChange={(value: any) => setSessionType(value)}>
              <div className="grid grid-cols-2 gap-3 sm:gap-4">
                <div className="flex items-center space-x-2 p-3 sm:p-4 border rounded-lg hover:border-blue-500 transition-colors cursor-pointer">
                  <RadioGroupItem value="in-person" id="in-person" />
                  <Label htmlFor="in-person" className="cursor-pointer flex items-center gap-2 text-sm sm:text-base">
                    <MapPin className="w-4 h-4 sm:w-5 sm:h-5 text-blue-500" />
                    <span className="hidden sm:inline">Présentiel</span>
                    <span className="sm:hidden">Sur place</span>
                  </Label>
                </div>
                <div className="flex items-center space-x-2 p-3 sm:p-4 border rounded-lg hover:border-green-500 transition-colors cursor-pointer">
                  <RadioGroupItem value="online" id="online" />
                  <Label htmlFor="online" className="cursor-pointer flex items-center gap-2 text-sm sm:text-base">
                    <Video className="w-4 h-4 sm:w-5 sm:h-5 text-green-500" />
                    <span>En ligne</span>
                  </Label>
                </div>
              </div>
            </RadioGroup>
          </div>

          {/* Date and Time */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
            <div className="space-y-2 sm:col-span-1">
              <Label htmlFor="date" className="text-sm sm:text-base">Date *</Label>
              <Input
                id="date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
                className="text-sm sm:text-base"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="startTime" className="text-sm sm:text-base">Début *</Label>
              <Input
                id="startTime"
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                required
                className="text-sm sm:text-base"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="endTime" className="text-sm sm:text-base">Fin *</Label>
              <Input
                id="endTime"
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                required
                className="text-sm sm:text-base"
              />
            </div>
          </div>

          {/* Repetition */}
          <div className="space-y-3 sm:space-y-4">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="repetitive"
                checked={isRepetitive}
                onCheckedChange={(checked) => setIsRepetitive(checked as boolean)}
              />
              <Label htmlFor="repetitive" className="cursor-pointer flex items-center gap-2 text-sm sm:text-base">
                <Repeat className="w-4 h-4 sm:w-5 sm:h-5 text-blue-500" />
                Session répétitive
              </Label>
            </div>
            
            {isRepetitive && (
              <div className="space-y-4 pt-3 border-t border-purple-200">
                {/* Frequency Selection */}
                <div className="space-y-2">
                  <Label>Fréquence de répétition *</Label>
                  <Select value={repetitionFrequency} onValueChange={(value) => setRepetitionFrequency(value as "daily" | "weekly" | "monthly")}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="daily">Quotidienne</SelectItem>
                      <SelectItem value="weekly">Hebdomadaire</SelectItem>
                      <SelectItem value="monthly">Mensuelle</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Days Selection for Weekly */}
                {repetitionFrequency === "weekly" && (
                  <div className="space-y-2">
                    <Label>Jours de la semaine *</Label>
                    <div className="grid grid-cols-7 gap-2">
                      {[
                        { label: "Dim", value: 0 },
                        { label: "Lun", value: 1 },
                        { label: "Mar", value: 2 },
                        { label: "Mer", value: 3 },
                        { label: "Jeu", value: 4 },
                        { label: "Ven", value: 5 },
                        { label: "Sam", value: 6 },
                      ].map((day) => (
                        <Button
                          key={day.value}
                          type="button"
                          variant={selectedDays.includes(day.value) ? "default" : "outline"}
                          className={`h-10 ${selectedDays.includes(day.value) ? "bg-purple-600 hover:bg-purple-700" : ""}`}
                          onClick={() => {
                            if (selectedDays.includes(day.value)) {
                              setSelectedDays(selectedDays.filter(d => d !== day.value));
                            } else {
                              setSelectedDays([...selectedDays, day.value]);
                            }
                          }}
                        >
                          {day.label}
                        </Button>
                      ))}
                    </div>
                    {selectedDays.length > 0 && (
                      <p className="text-xs text-gray-600">
                        {selectedDays.length} jour{selectedDays.length > 1 ? "s" : ""} sélectionné{selectedDays.length > 1 ? "s" : ""}
                      </p>
                    )}
                  </div>
                )}

                {/* End Date */}
                <div className="space-y-2">
                  <Label htmlFor="repetition-end-date">Date de fin de répétition *</Label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                      id="repetition-end-date"
                      type="date"
                      value={repetitionEndDate}
                      onChange={(e) => setRepetitionEndDate(e.target.value)}
                      className="pl-10"
                      min={date}
                      required={isRepetitive}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Max Participants */}
          <div className="space-y-2">
            <Label htmlFor="maxParticipants">Nombre maximum de participants *</Label>
            <div className="relative">
              <UsersIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                id="maxParticipants"
                type="number"
                min="1"
                value={maxParticipants}
                onChange={(e) => setMaxParticipants(e.target.value)}
                className="pl-10"
                placeholder="Ex: 60"
                required
              />
            </div>
          </div>

          {/* Location (only for in-person) */}
          {sessionType === "in-person" && (
            <div className="space-y-2">
              <Label htmlFor="location">Lieu *</Label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  id="location"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="pl-10"
                  placeholder="Ex: Tech Building, Room 301"
                  required
                />
              </div>
            </div>
          )}

          {/* Meeting Link (only for online) */}
          {sessionType === "online" && (
            <div className="space-y-2">
              <Label htmlFor="meetingLink">Lien de réunion *</Label>
              <div className="relative">
                <Video className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  id="meetingLink"
                  value={meetingLink}
                  onChange={(e) => setMeetingLink(e.target.value)}
                  className="pl-10"
                  placeholder="Ex: https://meet.google.com/abc-defg-hij"
                  required
                />
              </div>
            </div>
          )}

          {/* Post Type */}
          <div className="space-y-2">
            <Label>Type de publication *</Label>
            <RadioGroup value={postType} onValueChange={(value) => setPostType(value as "private" | "group")}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="private" id="private" />
                <Label htmlFor="private" className="cursor-pointer">Session privée</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="group" id="group" />
                <Label htmlFor="group" className="cursor-pointer">Session de groupe</Label>
              </div>
            </RadioGroup>
          </div>

          {/* Group Selection (only for group posts) */}
          {postType === "group" && (
            <div className="space-y-2">
              <Label htmlFor="group-select">Sélectionner un groupe *</Label>
              {groups.length === 0 ? (
                <p className="text-sm text-gray-500">Vous n'êtes membre d'aucun groupe</p>
              ) : (
                <Select value={selectedGroupId} onValueChange={setSelectedGroupId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choisir un groupe..." />
                  </SelectTrigger>
                  <SelectContent>
                    {groups.map((group) => (
                      <SelectItem key={group.id} value={group.id}>
                        {group.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          )}

          {/* Submit Button */}
          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Annuler
            </Button>
            <Button
              type="submit"
              className="bg-purple-600 hover:bg-purple-700 text-white"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Création...
                </>
              ) : (
                "Créer la session"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}