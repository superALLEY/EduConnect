import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Card } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import { Switch } from "../components/ui/switch";
import { Separator } from "../components/ui/separator";
import { Avatar } from "../components/ui/avatar";
import { RadioGroup, RadioGroupItem } from "../components/ui/radio-group";
import { PhoneInput } from "../components/PhoneInput";
import { StripeSettingsCard } from "../components/StripeSettingsCard";
import { Badge } from "../components/ui/badge";
import {
  User,
  Lock,
  Palette,
  Mail,
  Shield,
  Save,
  Trash2,
  LogOut,
  Calendar,
  Link as LinkIcon,
  Upload,
  X,
  CreditCard,
  ExternalLink,
  CheckCircle,
  AlertCircle,
  DollarSign,
  Camera,
  Sparkles,
  Bell,
  Globe,
  Eye,
  Settings,
  ChevronRight,
} from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { useTheme } from "../contexts/ThemeContext";
import { useNavigate } from "react-router-dom";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db, storage } from "../config/firebase";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { EmailAuthProvider, reauthenticateWithCredential, updatePassword } from "firebase/auth";
import { STUDY_FIELDS } from "../config/constants";
import { toast } from "sonner@2.0.3";
import { createStripeConnectAccount } from "../services/stripe";

const settingsSections = [
  { id: "profil", label: "Profil", icon: User, color: "from-blue-500 to-cyan-500" },
  { id: "compte", label: "Compte", icon: Shield, color: "from-purple-500 to-pink-500" },
  { id: "securite", label: "Sécurité", icon: Lock, color: "from-red-500 to-orange-500" },
  { id: "preferences", label: "Préférences", icon: Palette, color: "from-green-500 to-emerald-500" },
];

interface UserProfile {
  name: string;
  fieldOfStudy: string;
  role: string;
  phoneNumber: string;
  dateOfBirth: string;
  profilePicture: string;
  biography: string;
}

export function SettingsPage() {
  const [activeSection, setActiveSection] = useState("profil");
  const { currentUser, logout } = useAuth();
  const { theme: contextTheme, setTheme: setContextTheme } = useTheme();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Profile states
  const [profileData, setProfileData] = useState<UserProfile>({
    name: "",
    fieldOfStudy: STUDY_FIELDS[0],
    role: "student",
    phoneNumber: "",
    dateOfBirth: "",
    profilePicture: "",
    biography: "",
  });

  // Security states
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [twoFactorAuth, setTwoFactorAuth] = useState(false);

  // Load user profile from Firestore
  useEffect(() => {
    const loadProfile = async () => {
      if (!currentUser) return;

      try {
        const userDoc = await getDoc(doc(db, "users", currentUser.uid));
        if (userDoc.exists()) {
          const data = userDoc.data();
          setProfileData({
            name: data.name || "",
            fieldOfStudy: data.fieldOfStudy || "",
            role: data.role || "student",
            phoneNumber: data.phoneNumber || "",
            dateOfBirth: data.dateOfBirth || "",
            profilePicture: data.profilePicture || "",
            biography: data.biography || "",
          });
        }
      } catch (error) {
        console.error("Error loading profile:", error);
      }
    };

    loadProfile();
  }, [currentUser]);

  const handleProfileUpdate = async () => {
    if (!currentUser) return;

    // Validation
    if (!profileData.name.trim()) {
      toast.error("Le nom est requis");
      return;
    }
    if (!profileData.fieldOfStudy.trim()) {
      toast.error("Le domaine d'étude est requis");
      return;
    }
    if (!profileData.phoneNumber.trim()) {
      toast.error("Le numéro de téléphone est requis");
      return;
    }
    if (!profileData.dateOfBirth) {
      toast.error("La date de naissance est requise");
      return;
    }
    // Photo de profil n'est plus validée - peut être changée uniquement par upload

    setLoading(true);

    try {
      await updateDoc(doc(db, "users", currentUser.uid), {
        ...profileData,
        updatedAt: new Date().toISOString(),
      });

      toast.success("Profil mis à jour avec succès !");
    } catch (error: any) {
      console.error("Error updating profile:", error);
      toast.error("Erreur lors de la mise à jour du profil");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      navigate("/login");
    } catch (error) {
      console.error("Failed to logout:", error);
    }
  };

  const handleChange = (field: keyof UserProfile, value: string) => {
    setProfileData((prev) => ({ ...prev, [field]: value }));
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploadingImage(true);

    try {
      const storageRef = ref(storage, `profile-pictures/${currentUser?.uid}`);
      await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(storageRef);
      setProfileData((prev) => ({ ...prev, profilePicture: downloadURL }));
      toast.success("Photo de profil mise à jour avec succès !");
    } catch (error) {
      console.error("Error uploading image:", error);
      toast.error("Erreur lors du téléchargement de la photo de profil");
    } finally {
      setUploadingImage(false);
    }
  };

  const renderContent = () => {
    switch (activeSection) {
      case "profil":
        return (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
            className="space-y-8"
          >
            {/* Header */}
            <div className="relative overflow-hidden bg-gradient-to-br from-blue-500 via-purple-600 to-indigo-700 rounded-3xl p-8">
              <div className="absolute inset-0">
                <motion.div
                  className="absolute -top-20 -right-20 w-96 h-96 bg-white/10 rounded-full blur-3xl"
                  animate={{ scale: [1, 1.3, 1], rotate: [0, 180, 360] }}
                  transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
                />
              </div>
              <div className="relative z-10">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 bg-white/20 backdrop-blur-md rounded-xl">
                    <User className="w-6 h-6 text-white" />
                  </div>
                  <h2 className="text-white text-2xl font-bold">Informations du profil</h2>
                </div>
                <p className="text-blue-100">
                  Mettez à jour vos informations personnelles
                </p>
              </div>
            </div>

            {/* Profile Photo Upload - Modern */}
            <Card className="p-6 bg-white dark:bg-[#242526] border-0 rounded-3xl shadow-lg hover:shadow-2xl transition-all duration-300">
              <div className="flex flex-col items-center gap-6">
                <motion.div
                  className="relative group"
                  whileHover={{ scale: 1.05 }}
                  transition={{ type: "spring", stiffness: 400 }}
                >
                  <Avatar className="w-32 h-32 border-4 border-gradient-to-br from-blue-400 to-purple-600 shadow-2xl">
                    {profileData.profilePicture ? (
                      <img
                        src={profileData.profilePicture}
                        alt="Profile"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-blue-400 to-purple-600 flex items-center justify-center text-white text-4xl font-bold">
                        {profileData.name?.[0]?.toUpperCase() || "U"}
                      </div>
                    )}
                  </Avatar>
                  
                  {/* Upload overlay */}
                  <motion.div
                    className="absolute inset-0 bg-black/50 backdrop-blur-sm rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Camera className="w-10 h-10 text-white" />
                  </motion.div>

                  {/* Status indicator */}
                  <motion.div
                    className="absolute bottom-2 right-2 w-6 h-6 bg-green-400 border-4 border-white rounded-full"
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  />
                </motion.div>

                <div className="text-center">
                  <p className="font-semibold text-gray-900 dark:text-gray-100 mb-1">
                    {profileData.name || "Nom non défini"}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
                    JPG, GIF ou PNG. Max 5MB
                  </p>
                  <input
                    type="file"
                    accept="image/*"
                    ref={fileInputRef}
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                  <Button
                    onClick={() => fileInputRef.current?.click()}
                    className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white rounded-xl gap-2"
                    disabled={uploadingImage}
                  >
                    <Upload className="w-4 h-4" />
                    {uploadingImage ? "Chargement..." : "Changer la photo"}
                  </Button>
                </div>
              </div>
            </Card>

            {/* Form Fields Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Name */}
              <Card className="p-6 bg-white dark:bg-[#242526] border-0 rounded-3xl shadow-lg hover:shadow-xl transition-all duration-300">
                <Label htmlFor="name" className="text-gray-900 dark:text-gray-100 flex items-center gap-2 mb-3">
                  <User className="w-4 h-4 text-blue-500" />
                  Nom complet <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="name"
                  value={profileData.name}
                  onChange={(e) => handleChange("name", e.target.value)}
                  placeholder="Ex: Jean Dupont"
                  className="text-gray-900 dark:text-gray-100 border-gray-200 dark:border-gray-700 rounded-xl"
                />
              </Card>

              {/* Field of Study */}
              <Card className="p-6 bg-white dark:bg-[#242526] border-0 rounded-3xl shadow-lg hover:shadow-xl transition-all duration-300">
                <Label htmlFor="fieldOfStudy" className="text-gray-900 dark:text-gray-100 flex items-center gap-2 mb-3">
                  <Sparkles className="w-4 h-4 text-purple-500" />
                  Domaine d'étude <span className="text-red-500">*</span>
                </Label>
                <select
                  id="fieldOfStudy"
                  value={profileData.fieldOfStudy}
                  onChange={(e) => handleChange("fieldOfStudy", e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {STUDY_FIELDS.map((field) => (
                    <option key={field} value={field}>
                      {field}
                    </option>
                  ))}
                </select>
              </Card>

              {/* Phone Number */}
              <Card className="p-6 bg-white dark:bg-[#242526] border-0 rounded-3xl shadow-lg hover:shadow-xl transition-all duration-300">
                <Label htmlFor="phoneNumber" className="text-gray-900 dark:text-gray-100 flex items-center gap-2 mb-3">
                  <Bell className="w-4 h-4 text-green-500" />
                  Numéro de téléphone <span className="text-red-500">*</span>
                </Label>
                <PhoneInput
                  value={profileData.phoneNumber}
                  onChange={(value) => handleChange("phoneNumber", value)}
                  placeholder="Ex: 6 12 34 56 78"
                  required
                />
              </Card>

              {/* Date of Birth */}
              <Card className="p-6 bg-white dark:bg-[#242526] border-0 rounded-3xl shadow-lg hover:shadow-xl transition-all duration-300">
                <Label htmlFor="dateOfBirth" className="text-gray-900 dark:text-gray-100 flex items-center gap-2 mb-3">
                  <Calendar className="w-4 h-4 text-orange-500" />
                  Date de naissance <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="dateOfBirth"
                  type="date"
                  value={profileData.dateOfBirth}
                  onChange={(e) => handleChange("dateOfBirth", e.target.value)}
                  className="text-gray-900 dark:text-gray-100 border-gray-200 dark:border-gray-700 rounded-xl"
                />
              </Card>
            </div>

            {/* Role Selection - Full Width */}
            <Card className="p-6 bg-white dark:bg-[#242526] border-0 rounded-3xl shadow-lg">
              <Label className="text-gray-900 dark:text-gray-100 flex items-center gap-2 mb-4">
                <Shield className="w-4 h-4 text-indigo-500" />
                Rôle <span className="text-red-500">*</span>
              </Label>
              <RadioGroup
                value={profileData.role}
                onValueChange={(value) => handleChange("role", value)}
                className="grid grid-cols-1 md:grid-cols-3 gap-4"
              >
                <motion.div
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className={`relative flex items-center space-x-3 p-4 border-2 rounded-2xl cursor-pointer transition-all ${
                    profileData.role === "student"
                      ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                      : "border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-700"
                  }`}
                >
                  <RadioGroupItem value="student" id="student" />
                  <Label htmlFor="student" className="flex-1 cursor-pointer text-gray-900 dark:text-gray-100">
                    <div className="flex items-center gap-2">
                      <User className="w-5 h-5 text-blue-500" />
                      <span className="font-medium">Étudiant</span>
                    </div>
                  </Label>
                  {profileData.role === "student" && (
                    <CheckCircle className="w-5 h-5 text-blue-500" />
                  )}
                </motion.div>

                <motion.div
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className={`relative flex items-center space-x-3 p-4 border-2 rounded-2xl cursor-pointer transition-all ${
                    profileData.role === "teacher"
                      ? "border-purple-500 bg-purple-50 dark:bg-purple-900/20"
                      : "border-gray-200 dark:border-gray-700 hover:border-purple-300 dark:hover:border-purple-700"
                  }`}
                >
                  <RadioGroupItem value="teacher" id="teacher" />
                  <Label htmlFor="teacher" className="flex-1 cursor-pointer text-gray-900 dark:text-gray-100">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-5 h-5 text-purple-500" />
                      <span className="font-medium">Enseignant</span>
                    </div>
                  </Label>
                  {profileData.role === "teacher" && (
                    <CheckCircle className="w-5 h-5 text-purple-500" />
                  )}
                </motion.div>

                <motion.div
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className={`relative flex items-center space-x-3 p-4 border-2 rounded-2xl cursor-pointer transition-all ${
                    profileData.role === "both"
                      ? "border-green-500 bg-green-50 dark:bg-green-900/20"
                      : "border-gray-200 dark:border-gray-700 hover:border-green-300 dark:hover:border-green-700"
                  }`}
                >
                  <RadioGroupItem value="both" id="both" />
                  <Label htmlFor="both" className="flex-1 cursor-pointer text-gray-900 dark:text-gray-100">
                    <div className="flex items-center gap-2">
                      <Settings className="w-5 h-5 text-green-500" />
                      <span className="font-medium">Les deux</span>
                    </div>
                  </Label>
                  {profileData.role === "both" && (
                    <CheckCircle className="w-5 h-5 text-green-500" />
                  )}
                </motion.div>
              </RadioGroup>
            </Card>

            {/* Biography */}
            <Card className="p-6 bg-white dark:bg-[#242526] border-0 rounded-3xl shadow-lg">
              <Label htmlFor="biography" className="text-gray-900 dark:text-gray-100 flex items-center gap-2 mb-3">
                <User className="w-4 h-4 text-pink-500" />
                Biographie
              </Label>
              <Textarea
                id="biography"
                value={profileData.biography}
                onChange={(e) => handleChange("biography", e.target.value)}
                placeholder="Parlez-nous un peu de vous..."
                className="min-h-[120px] text-gray-900 dark:text-gray-100 border-gray-200 dark:border-gray-700 rounded-xl resize-none"
                rows={5}
              />
            </Card>

            {/* Save Button */}
            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <Button
                onClick={handleProfileUpdate}
                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white py-6 rounded-2xl gap-2 text-lg shadow-xl"
                disabled={loading}
              >
                <Save className="w-5 h-5" />
                {loading ? "Enregistrement..." : "Enregistrer les modifications"}
              </Button>
            </motion.div>
          </motion.div>
        );

      case "compte":
        return (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
            className="space-y-8"
          >
            {/* Header */}
            <div className="relative overflow-hidden bg-gradient-to-br from-purple-500 via-pink-600 to-rose-700 rounded-3xl p-8">
              <div className="absolute inset-0">
                <motion.div
                  className="absolute -top-20 -right-20 w-96 h-96 bg-white/10 rounded-full blur-3xl"
                  animate={{ scale: [1, 1.3, 1], rotate: [0, 180, 360] }}
                  transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
                />
              </div>
              <div className="relative z-10">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 bg-white/20 backdrop-blur-md rounded-xl">
                    <Shield className="w-6 h-6 text-white" />
                  </div>
                  <h2 className="text-white text-2xl font-bold">Paramètres du compte</h2>
                </div>
                <p className="text-purple-100">
                  Gérez vos informations de connexion
                </p>
              </div>
            </div>

            {/* Email - Read Only */}
            <Card className="p-6 bg-white dark:bg-[#242526] border-0 rounded-3xl shadow-lg">
              <Label htmlFor="email" className="text-gray-900 dark:text-gray-100 flex items-center gap-2 mb-3">
                <Mail className="w-4 h-4 text-blue-500" />
                Adresse Email
              </Label>
              <div className="relative">
                <Input
                  id="email"
                  type="email"
                  value={currentUser?.email || ""}
                  className="pl-4 text-gray-900 dark:text-gray-100 border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-800"
                  disabled
                />
                <Badge className="absolute right-3 top-1/2 -translate-y-1/2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-0">
                  Vérifié
                </Badge>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                L'email ne peut pas être modifié
              </p>
            </Card>

            {/* Stripe Configuration for Teachers */}
            {(profileData.role === "teacher" || profileData.role === "both") && (
              <Card className="p-6 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border-2 border-green-200 dark:border-green-800 rounded-3xl shadow-lg">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-gradient-to-br from-green-400 to-emerald-500 rounded-xl">
                    <DollarSign className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-gray-900 dark:text-gray-100 text-lg font-bold">Configuration des paiements</h3>
                </div>
                <StripeSettingsCard
                  userId={currentUser?.uid || ""}
                  userEmail={currentUser?.email || ""}
                  userName={profileData.name}
                  userRole={profileData.role}
                />
              </Card>
            )}

            {/* Danger Zone */}
            <Card className="p-6 bg-gradient-to-br from-red-50 to-orange-50 dark:from-red-900/20 dark:to-orange-900/20 border-2 border-red-200 dark:border-red-800 rounded-3xl shadow-lg">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-gradient-to-br from-red-400 to-orange-500 rounded-xl">
                  <AlertCircle className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-gray-900 dark:text-gray-100 text-lg font-bold">Zone de danger</h3>
              </div>
              <div className="flex items-start gap-4">
                <Trash2 className="w-5 h-5 text-red-600 dark:text-red-400 mt-1 flex-shrink-0" />
                <div className="flex-1">
                  <h4 className="text-red-900 dark:text-red-100 font-semibold mb-1">Supprimer le compte</h4>
                  <p className="text-sm text-red-700 dark:text-red-300 mb-4">
                    Cette action est irréversible. Toutes vos données seront
                    supprimées définitivement.
                  </p>
                  <Button
                    variant="destructive"
                    size="sm"
                    className="bg-red-600 hover:bg-red-700 rounded-xl gap-2"
                  >
                    <Trash2 className="w-4 h-4" />
                    Supprimer mon compte
                  </Button>
                </div>
              </div>
            </Card>
          </motion.div>
        );

      case "securite":
        return (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
            className="space-y-8"
          >
            {/* Header */}
            <div className="relative overflow-hidden bg-gradient-to-br from-red-500 via-orange-600 to-amber-700 rounded-3xl p-8">
              <div className="absolute inset-0">
                <motion.div
                  className="absolute -top-20 -right-20 w-96 h-96 bg-white/10 rounded-full blur-3xl"
                  animate={{ scale: [1, 1.3, 1], rotate: [0, 180, 360] }}
                  transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
                />
              </div>
              <div className="relative z-10">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 bg-white/20 backdrop-blur-md rounded-xl">
                    <Lock className="w-6 h-6 text-white" />
                  </div>
                  <h2 className="text-white text-2xl font-bold">Sécurité</h2>
                </div>
                <p className="text-orange-100">
                  Gérez vos paramètres de sécurité
                </p>
              </div>
            </div>

            {/* Change Password Card */}
            <Card className="p-6 bg-white dark:bg-[#242526] border-0 rounded-3xl shadow-lg">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-gradient-to-br from-blue-400 to-purple-500 rounded-xl">
                  <Lock className="w-5 h-5 text-white" />
                </div>
                <h3 className="text-gray-900 dark:text-gray-100 text-lg font-semibold">Changer le mot de passe</h3>
              </div>

              <div className="space-y-4">
                {/* Current Password */}
                <div className="space-y-2">
                  <Label htmlFor="currentPassword" className="text-gray-900 dark:text-gray-100">
                    Mot de passe actuel
                  </Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                      id="currentPassword"
                      type="password"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      className="pl-10 text-gray-900 dark:text-gray-100 border-gray-200 dark:border-gray-700 rounded-xl"
                      placeholder="••••••••"
                    />
                  </div>
                </div>

                {/* New Password */}
                <div className="space-y-2">
                  <Label htmlFor="newPassword" className="text-gray-900 dark:text-gray-100">
                    Nouveau mot de passe
                  </Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                      id="newPassword"
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="pl-10 text-gray-900 dark:text-gray-100 border-gray-200 dark:border-gray-700 rounded-xl"
                      placeholder="••••••••"
                    />
                  </div>
                  {newPassword && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      className="space-y-2 mt-3 p-4 bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-2xl border border-blue-200 dark:border-blue-800"
                    >
                      <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-3">Le mot de passe doit contenir :</p>
                      {[
                        { test: newPassword.length >= 8, label: "Au moins 8 caractères" },
                        { test: /[A-Z]/.test(newPassword), label: "Une lettre majuscule" },
                        { test: /[a-z]/.test(newPassword), label: "Une lettre minuscule" },
                        { test: /[0-9]/.test(newPassword), label: "Un chiffre" },
                        { test: /[!@#$%^&*(),.?":{}|<>]/.test(newPassword), label: "Un caractère spécial" },
                      ].map((rule, index) => (
                        <motion.div
                          key={index}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.05 }}
                          className={`text-xs flex items-center gap-2 ${
                            rule.test ? "text-green-600 dark:text-green-400" : "text-gray-500 dark:text-gray-400"
                          }`}
                        >
                          <div className={`w-5 h-5 rounded-full flex items-center justify-center ${
                            rule.test ? "bg-green-100 dark:bg-green-900/30" : "bg-gray-100 dark:bg-gray-800"
                          }`}>
                            {rule.test ? (
                              <CheckCircle className="w-3 h-3" />
                            ) : (
                              <div className="w-2 h-2 rounded-full bg-gray-400" />
                            )}
                          </div>
                          {rule.label}
                        </motion.div>
                      ))}
                    </motion.div>
                  )}
                </div>

                {/* Confirm Password */}
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword" className="text-gray-900 dark:text-gray-100">
                    Confirmer le nouveau mot de passe
                  </Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                      id="confirmPassword"
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="pl-10 text-gray-900 dark:text-gray-100 border-gray-200 dark:border-gray-700 rounded-xl"
                      placeholder="••••••••"
                    />
                  </div>
                </div>

                <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                  <Button
                    onClick={async () => {
                      if (!currentUser) return;

                      // Validation
                      if (!currentPassword.trim()) {
                        toast.error("Le mot de passe actuel est requis");
                        return;
                      }
                      if (!newPassword.trim()) {
                        toast.error("Le nouveau mot de passe est requis");
                        return;
                      }
                      if (newPassword.length < 8) {
                        toast.error("Le mot de passe doit contenir au moins 8 caractères");
                        return;
                      }
                      if (!/[A-Z]/.test(newPassword)) {
                        toast.error("Le mot de passe doit contenir au moins une majuscule");
                        return;
                      }
                      if (!/[a-z]/.test(newPassword)) {
                        toast.error("Le mot de passe doit contenir au moins une minuscule");
                        return;
                      }
                      if (!/[0-9]/.test(newPassword)) {
                        toast.error("Le mot de passe doit contenir au moins un chiffre");
                        return;
                      }
                      if (!/[!@#$%^&*(),.?":{}|<>]/.test(newPassword)) {
                        toast.error("Le mot de passe doit contenir au moins un caractère spécial");
                        return;
                      }
                      if (newPassword !== confirmPassword) {
                        toast.error("Les mots de passe ne correspondent pas");
                        return;
                      }

                      setLoading(true);

                      try {
                        const credential = EmailAuthProvider.credential(
                          currentUser.email || "",
                          currentPassword
                        );
                        await reauthenticateWithCredential(currentUser, credential);
                        await updatePassword(currentUser, newPassword);

                        // Clear password fields
                        setCurrentPassword("");
                        setNewPassword("");
                        setConfirmPassword("");

                        toast.success("Mot de passe mis à jour avec succès !");
                      } catch (error: any) {
                        console.error("Error updating password:", error);
                        if (error.code === "auth/wrong-password" || error.code === "auth/invalid-credential") {
                          toast.error("Le mot de passe actuel est incorrect");
                        } else {
                          toast.error("Erreur lors de la mise à jour du mot de passe");
                        }
                      } finally {
                        setLoading(false);
                      }
                    }}
                    className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white py-3 rounded-xl gap-2"
                    disabled={loading}
                  >
                    <Lock className="w-4 h-4" />
                    {loading ? "Mise à jour..." : "Mettre à jour le mot de passe"}
                  </Button>
                </motion.div>
              </div>
            </Card>

            {/* Two Factor Auth */}
            <Card className="p-6 bg-white dark:bg-[#242526] border-0 rounded-3xl shadow-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-start gap-4">
                  <div className="p-2 bg-gradient-to-br from-green-400 to-emerald-500 rounded-xl">
                    <Shield className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="text-gray-900 dark:text-gray-100 font-semibold mb-1">Authentification à deux facteurs</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Ajoutez une couche de sécurité supplémentaire
                    </p>
                  </div>
                </div>
                <Switch
                  checked={twoFactorAuth}
                  onCheckedChange={setTwoFactorAuth}
                />
              </div>
            </Card>
          </motion.div>
        );

      case "preferences":
        return (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
            className="space-y-8"
          >
            {/* Header */}
            <div className="relative overflow-hidden bg-gradient-to-br from-green-500 via-emerald-600 to-teal-700 rounded-3xl p-8">
              <div className="absolute inset-0">
                <motion.div
                  className="absolute -top-20 -right-20 w-96 h-96 bg-white/10 rounded-full blur-3xl"
                  animate={{ scale: [1, 1.3, 1], rotate: [0, 180, 360] }}
                  transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
                />
              </div>
              <div className="relative z-10">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 bg-white/20 backdrop-blur-md rounded-xl">
                    <Palette className="w-6 h-6 text-white" />
                  </div>
                  <h2 className="text-white text-2xl font-bold">Préférences</h2>
                </div>
                <p className="text-green-100">
                  Personnalisez votre expérience
                </p>
              </div>
            </div>

            {/* Theme Selection */}
            <Card className="p-6 bg-white dark:bg-[#242526] border-0 rounded-3xl shadow-lg">
              <Label htmlFor="theme" className="text-gray-900 dark:text-gray-100 flex items-center gap-2 mb-4">
                <Palette className="w-4 h-4 text-purple-500" />
                Thème de l'application
              </Label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {[
                  { value: "light", label: "Clair", icon: "☀️", gradient: "from-yellow-400 to-orange-400" },
                  { value: "dark", label: "Sombre", icon: "🌙", gradient: "from-indigo-600 to-purple-600" },
                  { value: "auto", label: "Automatique", icon: "🔄", gradient: "from-blue-500 to-cyan-500" },
                ].map((option) => (
                  <motion.button
                    key={option.value}
                    onClick={() => {
                      setContextTheme(option.value as any);
                      toast.success(`Thème changé : ${option.label}`);
                    }}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className={`relative p-6 rounded-2xl border-2 transition-all ${
                      contextTheme === option.value
                        ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                        : "border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-700"
                    }`}
                  >
                    <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${option.gradient} flex items-center justify-center text-2xl mb-3 mx-auto`}>
                      {option.icon}
                    </div>
                    <p className="text-gray-900 dark:text-gray-100 font-semibold">{option.label}</p>
                    {contextTheme === option.value && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="absolute top-2 right-2"
                      >
                        <CheckCircle className="w-5 h-5 text-blue-500" />
                      </motion.div>
                    )}
                  </motion.button>
                ))}
              </div>
            </Card>
          </motion.div>
        );

      default:
        return null;
    }
  };

  const activeColor = settingsSections.find(s => s.id === activeSection)?.color || "from-blue-500 to-purple-500";

  return (
    <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8">
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Sidebar */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
          className="lg:w-80"
        >
          <Card className="p-6 bg-white dark:bg-[#242526] border-0 rounded-3xl shadow-xl sticky top-6">
            {/* User Info Header */}
            <div className="mb-6 pb-6 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-4">
                <Avatar className="w-16 h-16 border-2 border-gradient-to-br from-blue-400 to-purple-600">
                  {profileData.profilePicture ? (
                    <img
                      src={profileData.profilePicture}
                      alt={profileData.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-blue-400 to-purple-600 flex items-center justify-center text-white text-xl font-bold">
                      {profileData.name?.[0]?.toUpperCase() || "U"}
                    </div>
                  )}
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 dark:text-gray-100 truncate">
                    {profileData.name || "Utilisateur"}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                    {currentUser?.email}
                  </p>
                </div>
              </div>
            </div>

            {/* Navigation */}
            <div className="space-y-2">
              {settingsSections.map((section, index) => {
                const Icon = section.icon;
                return (
                  <motion.button
                    key={section.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    onClick={() => setActiveSection(section.id)}
                    className={`w-full group relative overflow-hidden rounded-2xl transition-all ${
                      activeSection === section.id
                        ? "bg-gradient-to-r " + section.color + " text-white shadow-lg"
                        : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
                    }`}
                  >
                    <div className="flex items-center gap-3 px-4 py-3 relative z-10">
                      <Icon className="w-5 h-5 flex-shrink-0" />
                      <span className="font-medium">{section.label}</span>
                      <ChevronRight className={`w-4 h-4 ml-auto transition-transform ${
                        activeSection === section.id ? "translate-x-1" : ""
                      }`} />
                    </div>
                    
                    {activeSection === section.id && (
                      <motion.div
                        layoutId="activeTab"
                        className="absolute inset-0 bg-gradient-to-r"
                        style={{ background: `linear-gradient(to right, var(--tw-gradient-stops))` }}
                        transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                      />
                    )}
                  </motion.button>
                );
              })}
            </div>

            <Separator className="my-6" />

            {/* Logout Button */}
            <motion.button
              onClick={handleLogout}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all group"
            >
              <LogOut className="w-5 h-5 group-hover:rotate-12 transition-transform" />
              <span className="font-medium">Déconnexion</span>
            </motion.button>
          </Card>
        </motion.div>

        {/* Content */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="flex-1 min-w-0"
        >
          <AnimatePresence mode="wait">
            {renderContent()}
          </AnimatePresence>
        </motion.div>
      </div>
    </div>
  );
}