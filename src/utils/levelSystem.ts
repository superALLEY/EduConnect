import { doc, updateDoc, getDoc, increment, addDoc, collection, Timestamp } from "firebase/firestore";
import { db } from "../config/firebase";

// Calculate required score for a specific level
export const getRequiredScoreForLevel = (level: number): number => {
  return level + level * 5; // level * 6
};

// Calculate level based on current score
export const calculateLevel = (score: number): number => {
  let level = 1;
  while (score >= getRequiredScoreForLevel(level + 1)) {
    level++;
  }
  return level;
};

// Get score needed for next level
export const getScoreForNextLevel = (currentLevel: number): number => {
  return getRequiredScoreForLevel(currentLevel + 1);
};

// Get progress percentage to next level
export const getLevelProgress = (score: number, currentLevel: number): number => {
  const currentLevelScore = getRequiredScoreForLevel(currentLevel);
  const nextLevelScore = getRequiredScoreForLevel(currentLevel + 1);
  const scoreInLevel = score - currentLevelScore;
  const scoreNeeded = nextLevelScore - currentLevelScore;
  return Math.min(100, Math.max(0, (scoreInLevel / scoreNeeded) * 100));
};

// Add points to user and check for level up
export const addPointsToUser = async (userId: string, points: number = 1, reason: string = ""): Promise<boolean> => {
  try {
    const userRef = doc(db, "users", userId);
    const userDoc = await getDoc(userRef);
    
    if (!userDoc.exists()) {
      console.error("User not found");
      return false;
    }
    
    const userData = userDoc.data();
    const currentScore = userData.score || 0;
    const currentLevel = userData.level || 1;
    const newScore = currentScore + points;
    const newLevel = calculateLevel(newScore);
    
    // Update user score
    await updateDoc(userRef, {
      score: newScore,
      level: newLevel,
    });
    
    // Check if user leveled up
    if (newLevel > currentLevel) {
      // Send notification for level up
      await sendLevelUpNotification(userId, newLevel, userData.name);
      return true; // Leveled up
    }
    
    return false; // No level up
  } catch (error) {
    console.error("Error adding points to user:", error);
    return false;
  }
};

// Send level up notification
const sendLevelUpNotification = async (userId: string, newLevel: number, userName: string) => {
  try {
    const trophy = getTrophyForLevel(newLevel);
    const title = getLevelTitle(newLevel);
    
    await addDoc(collection(db, "notifications"), {
      created_at: Timestamp.now(),
      userId: userId,
      type: "level_up",
      from: userId,
      to: userId,
      fromName: "EduConnect",
      fromAvatar: "",
      message: `🎉 Félicitations ! Vous êtes maintenant niveau ${newLevel} - ${title} ${trophy}`,
      status: "unread",
      data: {
        level: newLevel,
        trophy: trophy,
        title: title,
      },
    });
  } catch (error) {
    console.error("Error sending level up notification:", error);
  }
};

// Get trophy icon based on level
export const getTrophyForLevel = (level: number): string => {
  if (level >= 50) return "🏆"; // Legend
  if (level >= 40) return "💎"; // Diamond
  if (level >= 30) return "👑"; // Crown
  if (level >= 20) return "⭐"; // Star
  if (level >= 10) return "🥇"; // Gold
  if (level >= 5) return "🥈"; // Silver
  return "🥉"; // Bronze
};

// Get level title based on level
export const getLevelTitle = (level: number): string => {
  if (level >= 50) return "Légende";
  if (level >= 40) return "Diamant";
  if (level >= 30) return "Roi";
  if (level >= 20) return "Étoile";
  if (level >= 10) return "Or";
  if (level >= 5) return "Argent";
  return "Bronze";
};

// Get level color based on level
export const getLevelColor = (level: number): string => {
  if (level >= 50) return "from-purple-500 to-pink-500";
  if (level >= 40) return "from-cyan-500 to-blue-500";
  if (level >= 30) return "from-yellow-500 to-orange-500";
  if (level >= 20) return "from-blue-500 to-indigo-500";
  if (level >= 10) return "from-yellow-400 to-yellow-600";
  if (level >= 5) return "from-gray-300 to-gray-500";
  return "from-orange-400 to-orange-600";
};