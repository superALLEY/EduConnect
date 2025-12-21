import { STUDY_FIELDS } from "../config/constants";
import { STRIPE_COUNTRIES } from "../config/constants";
import { COUNTRY_PHONE_CODES } from "../config/constants";
import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { doc, setDoc } from "firebase/firestore";
import { db, storage } from "../config/firebase";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { Card } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Button } from "../components/ui/button";
import { Textarea } from "../components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "../components/ui/radio-group";
import { PhoneInput } from "../components/PhoneInput";
import { UserCircle2, Calendar, Briefcase, Phone, BookOpen, Link as LinkIcon, Upload, X, CreditCard, GraduationCap, Users, Sparkles, CheckCircle2, ArrowRight, Camera, Shield, Zap } from "lucide-react";
import { toast } from "sonner@2.0.3";
import { createStripeConnectAccount } from "../services/stripe";
import { motion } from "motion/react";

export function CompleteProfilePage() {
  const { currentUser, refreshUserData } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [currentStep, setCurrentStep] = useState(1);

  const [formData, setFormData] = useState({
    name: "",
    fieldOfStudy: STUDY_FIELDS[0],
    role: "student",
    phoneNumber: "",
    dateOfBirth: "",
    profilePicture: "",
    biography: "",
    country: "US", // Default country for Stripe
  });

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  // Auto-update phone number format when country changes
  useEffect(() => {
    const countryPhoneInfo = COUNTRY_PHONE_CODES[formData.country];
    if (countryPhoneInfo && !formData.phoneNumber.startsWith(countryPhoneInfo.code)) {
      // Only update if phone is empty or doesn't start with the new country code
      if (!formData.phoneNumber || formData.phoneNumber.startsWith('+')) {
        handleChange('phoneNumber', countryPhoneInfo.code + ' ');
      }
    }
  }, [formData.country]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!formData.name.trim()) {
      toast.error("Le nom est requis");
      return;
    }
    if (!formData.fieldOfStudy.trim()) {
      toast.error("Le domaine d'étude est requis");
      return;
    }
    if (!formData.phoneNumber.trim()) {
      toast.error("Le numéro de téléphone est requis");
      return;
    }
    if (!formData.dateOfBirth) {
      toast.error("La date de naissance est requise");
      return;
    }
    // Photo de profil est maintenant optionnelle - une photo par défaut sera utilisée si vide

    setLoading(true);

    try {
      if (!currentUser) {
        throw new Error("Utilisateur non connecté");
      }

      const isTeacherRole = formData.role === "teacher" || formData.role === "both";

      // Use default avatar if no profile picture provided
      const defaultAvatar = "https://firebasestorage.googleapis.com/v0/b/educonnect-9a564.firebasestorage.app/o/profile-pictures%2FB0NbaoIVVxZjJlyEADBqKGcjJFf2?alt=media&token=39762ac2-d122-4aeb-9858-3f623384ec15";
      const profilePictureUrl = formData.profilePicture.trim() || defaultAvatar;

      // Prepare user data
      const userData: any = {
        uid: currentUser.uid,
        email: currentUser.email,
        name: formData.name,
        fieldOfStudy: formData.fieldOfStudy,
        role: formData.role,
        phoneNumber: formData.phoneNumber,
        dateOfBirth: formData.dateOfBirth,
        profilePicture: profilePictureUrl,
        biography: formData.biography,
        level: 1,
        score: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      // If user is a teacher or both, create Stripe Connect account
      if (isTeacherRole) {
        toast.info("Configuration de votre compte de paiement...");
        
        const stripeResult = await createStripeConnectAccount({
          email: currentUser.email || "",
          name: formData.name,
          userId: currentUser.uid,
          country: formData.country, // Pass the selected country
        });

        if (stripeResult.success && stripeResult.accountId) {
          // Add Stripe account ID to user data
          userData.stripe_account_id = stripeResult.accountId;
          userData.stripe_onboarding_complete = false;
          userData.stripe_setup_pending = true;
          userData.stripe_charges_enabled = false;
          userData.stripe_payouts_enabled = false;
          
          // Save user profile to Firestore with Stripe account ID
          await setDoc(doc(db, "users", currentUser.uid), userData);

          toast.success("Profil créé avec succès !");
          
          // Redirect to Stripe onboarding
          if (stripeResult.onboardingUrl) {
            toast.info("Redirection vers la configuration de paiement Stripe...");
            setTimeout(() => {
              window.location.href = stripeResult.onboardingUrl!;
            }, 1500);
            return;
          }
        } else {
          // If Stripe fails, still create the profile but note that Stripe needs setup
          console.log("Stripe Connect not available - profile created without payment setup");
          userData.stripe_account_id = null;
          userData.stripe_onboarding_complete = false;
          userData.stripe_setup_pending = true;
          userData.stripe_charges_enabled = false;
          userData.stripe_payouts_enabled = false;
          await setDoc(doc(db, "users", currentUser.uid), userData);
          toast.success("Profil créé avec succès !");
          toast.info("La configuration des paiements sera disponible prochainement dans les paramètres.");
        }
      } else {
        // For students, just save the profile normally
        await setDoc(doc(db, "users", currentUser.uid), userData);
        toast.success("Profil complété avec succès !");
      }

      // Clear the signup flag now that profile is complete
      sessionStorage.removeItem('justSignedUp');

      refreshUserData();
      navigate("/");
    } catch (error: any) {
      console.error("Error saving profile:", error);
      toast.error("Erreur lors de la sauvegarde du profil");
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error("Veuillez sélectionner une image");
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error("L'image est trop volumineuse (max 5MB)");
      return;
    }

    try {
      setUploadingImage(true);
      toast.info("Upload de l'image en cours...");

      // Create unique file name
      const timestamp = Date.now();
      const fileName = `${timestamp}_${file.name}`;
      const storageRef = ref(storage, `profile-pictures/${currentUser?.uid}/${fileName}`);

      // Upload file
      await uploadBytes(storageRef, file);

      // Get download URL
      const downloadURL = await getDownloadURL(storageRef);
      
      handleChange("profilePicture", downloadURL);
      toast.success("Image téléchargée avec succès !");
      
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error) {
      console.error("Error uploading file:", error);
      toast.error("Erreur lors du téléchargement de l'image");
    } finally {
      setUploadingImage(false);
    }
  };

  const handleRemoveProfilePicture = () => {
    handleChange("profilePicture", "");
  };

  const canProceedToStep2 = formData.name && formData.fieldOfStudy && formData.role;
  const canProceedToStep3 = canProceedToStep2 && formData.phoneNumber && formData.dateOfBirth;
  const canSubmit = canProceedToStep3; // Step 3 now has the submit button

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center p-4 sm:p-6 lg:p-8">
      <div className="w-full max-w-5xl">
        {/* Header */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-blue-600 to-purple-600 rounded-3xl mb-6 shadow-2xl shadow-blue-500/30">
            <Sparkles className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-3">
            Bienvenue sur EduConnect
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Créez votre profil professionnel en quelques étapes simples
          </p>
        </motion.div>

        {/* Progress Steps */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="mb-8"
        >
          <div className="flex items-center justify-center gap-3 sm:gap-6">
            {[
              { num: 1, label: "Informations", icon: UserCircle2 },
              { num: 2, label: "Contact", icon: Phone },
              { num: 3, label: "Profil", icon: Camera }
            ].map((step, idx) => (
              <div key={step.num} className="flex items-center">
                <div className="flex flex-col items-center gap-2">
                  <div className={`
                    w-12 h-12 sm:w-14 sm:h-14 rounded-2xl flex items-center justify-center transition-all duration-300
                    ${currentStep >= step.num 
                      ? 'bg-gradient-to-br from-blue-600 to-purple-600 shadow-lg shadow-blue-500/30 scale-110' 
                      : 'bg-gray-200'
                    }
                  `}>
                    {currentStep > step.num ? (
                      <CheckCircle2 className="w-6 h-6 sm:w-7 sm:h-7 text-white" />
                    ) : (
                      <step.icon className={`w-6 h-6 sm:w-7 sm:h-7 ${currentStep >= step.num ? 'text-white' : 'text-gray-400'}`} />
                    )}
                  </div>
                  <span className={`text-xs sm:text-sm font-medium ${currentStep >= step.num ? 'text-blue-600' : 'text-gray-400'}`}>
                    {step.label}
                  </span>
                </div>
                {idx < 2 && (
                  <div className={`w-12 sm:w-20 h-1 mx-2 sm:mx-4 rounded-full transition-all duration-300 ${
                    currentStep > step.num ? 'bg-gradient-to-r from-blue-600 to-purple-600' : 'bg-gray-200'
                  }`} />
                )}
              </div>
            ))}
          </div>
        </motion.div>

        {/* Main Form Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="bg-white/80 backdrop-blur-xl border-0 shadow-2xl rounded-3xl overflow-hidden">
            <form onSubmit={handleSubmit} className="p-6 sm:p-8 lg:p-12">
              
              {/* Step 1: Basic Information */}
              {currentStep === 1 && (
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-6"
                >
                  <div className="text-center mb-8">
                    <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
                      Informations de base
                    </h2>
                    <p className="text-gray-600">
                      Commençons par vos informations essentielles
                    </p>
                  </div>

                  {/* Name */}
                  <div className="space-y-3">
                    <Label htmlFor="name" className="text-base font-semibold text-gray-900 flex items-center gap-2">
                      <UserCircle2 className="w-5 h-5 text-blue-600" />
                      Nom complet <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="name"
                      type="text"
                      value={formData.name}
                      onChange={(e) => handleChange("name", e.target.value)}
                      placeholder="Ex: Jean Dupont"
                      className="h-14 text-base rounded-xl border-2 border-gray-200 focus:border-blue-600 transition-colors bg-white"
                      required
                    />
                  </div>

                  {/* Field of Study */}
                  <div className="space-y-3">
                    <Label htmlFor="fieldOfStudy" className="text-base font-semibold text-gray-900 flex items-center gap-2">
                      <GraduationCap className="w-5 h-5 text-purple-600" />
                      Domaine d'étude <span className="text-red-500">*</span>
                    </Label>
                    <select
                      id="fieldOfStudy"
                      value={formData.fieldOfStudy}
                      onChange={(e) => handleChange("fieldOfStudy", e.target.value)}
                      className="w-full h-14 px-4 border-2 border-gray-200 rounded-xl bg-white text-base text-gray-900 focus:outline-none focus:border-blue-600 transition-colors cursor-pointer"
                      required
                    >
                      {STUDY_FIELDS.map((field) => (
                        <option key={field} value={field}>
                          {field}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Role Selection */}
                  <div className="space-y-3">
                    <Label className="text-base font-semibold text-gray-900 flex items-center gap-2">
                      <Briefcase className="w-5 h-5 text-green-600" />
                      Rôle <span className="text-red-500">*</span>
                    </Label>
                    <RadioGroup
                      value={formData.role}
                      onValueChange={(value) => handleChange("role", value)}
                      className="grid grid-cols-1 sm:grid-cols-3 gap-4"
                    >
                      <div className={`
                        relative flex items-center space-x-3 p-5 border-2 rounded-2xl cursor-pointer transition-all duration-200
                        ${formData.role === 'student' 
                          ? 'border-blue-600 bg-blue-50 shadow-lg shadow-blue-500/20' 
                          : 'border-gray-200 hover:border-blue-300 bg-white hover:shadow-md'
                        }
                      `}>
                        <RadioGroupItem value="student" id="student" className="text-blue-600" />
                        <Label htmlFor="student" className="flex-1 cursor-pointer">
                          <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                              formData.role === 'student' ? 'bg-blue-600' : 'bg-gray-200'
                            }`}>
                              <BookOpen className={`w-5 h-5 ${formData.role === 'student' ? 'text-white' : 'text-gray-500'}`} />
                            </div>
                            <span className="font-medium text-gray-900">Étudiant</span>
                          </div>
                        </Label>
                      </div>

                      <div className={`
                        relative flex items-center space-x-3 p-5 border-2 rounded-2xl cursor-pointer transition-all duration-200
                        ${formData.role === 'teacher' 
                          ? 'border-purple-600 bg-purple-50 shadow-lg shadow-purple-500/20' 
                          : 'border-gray-200 hover:border-purple-300 bg-white hover:shadow-md'
                        }
                      `}>
                        <RadioGroupItem value="teacher" id="teacher" className="text-purple-600" />
                        <Label htmlFor="teacher" className="flex-1 cursor-pointer">
                          <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                              formData.role === 'teacher' ? 'bg-purple-600' : 'bg-gray-200'
                            }`}>
                              <GraduationCap className={`w-5 h-5 ${formData.role === 'teacher' ? 'text-white' : 'text-gray-500'}`} />
                            </div>
                            <span className="font-medium text-gray-900">Enseignant</span>
                          </div>
                        </Label>
                      </div>

                      <div className={`
                        relative flex items-center space-x-3 p-5 border-2 rounded-2xl cursor-pointer transition-all duration-200
                        ${formData.role === 'both' 
                          ? 'border-green-600 bg-green-50 shadow-lg shadow-green-500/20' 
                          : 'border-gray-200 hover:border-green-300 bg-white hover:shadow-md'
                        }
                      `}>
                        <RadioGroupItem value="both" id="both" className="text-green-600" />
                        <Label htmlFor="both" className="flex-1 cursor-pointer">
                          <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                              formData.role === 'both' ? 'bg-green-600' : 'bg-gray-200'
                            }`}>
                              <Users className={`w-5 h-5 ${formData.role === 'both' ? 'text-white' : 'text-gray-500'}`} />
                            </div>
                            <span className="font-medium text-gray-900">Les deux</span>
                          </div>
                        </Label>
                      </div>
                    </RadioGroup>
                  </div>

                  <Button
                    type="button"
                    onClick={() => setCurrentStep(2)}
                    disabled={!canProceedToStep2}
                    className="w-full h-14 text-base font-semibold bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-xl shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Continuer
                    <ArrowRight className="w-5 h-5 ml-2" />
                  </Button>
                </motion.div>
              )}

              {/* Step 2: Contact Information */}
              {currentStep === 2 && (
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-6"
                >
                  <div className="text-center mb-8">
                    <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
                      Informations de contact
                    </h2>
                    <p className="text-gray-600">
                      Pour que nous puissions vous contacter
                    </p>
                  </div>

                  {/* Phone Number */}
                  <div className="space-y-3">
                    <Label htmlFor="phoneNumber" className="text-base font-semibold text-gray-900 flex items-center gap-2">
                      <Phone className="w-5 h-5 text-blue-600" />
                      Numéro de téléphone <span className="text-red-500">*</span>
                    </Label>
                    <PhoneInput
                      value={formData.phoneNumber}
                      onChange={(value) => handleChange("phoneNumber", value)}
                      placeholder={`Ex: ${COUNTRY_PHONE_CODES[formData.country]?.example || '6 12 34 56 78'}`}
                      required
                    />
                    {/* Country Phone Format Info */}
                    {COUNTRY_PHONE_CODES[formData.country] && (
                      <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-xl border border-blue-200">
                        <Phone className="w-4 h-4 text-blue-600 flex-shrink-0" />
                        <p className="text-sm text-blue-800">
                          <span className="font-semibold">{COUNTRY_PHONE_CODES[formData.country].code}</span>
                          {' • Format: '}
                          <span className="font-mono">{COUNTRY_PHONE_CODES[formData.country].format}</span>
                          {' • Ex: '}
                          <span className="font-mono">{COUNTRY_PHONE_CODES[formData.country].example}</span>
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Date of Birth */}
                  <div className="space-y-3">
                    <Label htmlFor="dateOfBirth" className="text-base font-semibold text-gray-900 flex items-center gap-2">
                      <Calendar className="w-5 h-5 text-purple-600" />
                      Date de naissance <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="dateOfBirth"
                      type="date"
                      value={formData.dateOfBirth}
                      onChange={(e) => handleChange("dateOfBirth", e.target.value)}
                      className="h-14 text-base rounded-xl border-2 border-gray-200 focus:border-blue-600 transition-colors bg-white"
                      required
                    />
                  </div>

                  <div className="flex gap-4">
                    <Button
                      type="button"
                      onClick={() => setCurrentStep(1)}
                      variant="outline"
                      className="flex-1 h-14 text-base font-semibold rounded-xl border-2 border-gray-300 hover:border-gray-400"
                    >
                      Retour
                    </Button>
                    <Button
                      type="button"
                      onClick={() => setCurrentStep(3)}
                      disabled={!canProceedToStep3}
                      className="flex-1 h-14 text-base font-semibold bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-xl shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Continuer
                      <ArrowRight className="w-5 h-5 ml-2" />
                    </Button>
                  </div>
                </motion.div>
              )}

              {/* Step 3: Profile Picture & Bio */}
              {currentStep === 3 && (
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-6"
                >
                  <div className="text-center mb-8">
                    <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
                      Personnalisez votre profil
                    </h2>
                    <p className="text-gray-600">
                      Dernière étape pour finaliser votre inscription
                    </p>
                  </div>

                  {/* Profile Picture Upload */}
                  <div className="space-y-4">
                    <Label className="text-base font-semibold text-gray-900 flex items-center gap-2">
                      <Camera className="w-5 h-5 text-blue-600" />
                      Photo de profil <span className="text-gray-500 font-normal">(Optionnel)</span>
                    </Label>
                    
                    {/* Profile Picture Preview */}
                    <div className="flex flex-col items-center gap-6">
                      <div className="relative">
                        {formData.profilePicture ? (
                          <div className="relative group">
                            <img
                              src={formData.profilePicture}
                              alt="Aperçu"
                              className="w-40 h-40 rounded-3xl object-cover border-4 border-white shadow-2xl ring-4 ring-blue-100"
                              onError={(e) => {
                                (e.target as HTMLImageElement).src =
                                  "https://images.unsplash.com/photo-1511367461989-f85a21fda167?w=400";
                              }}
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={handleRemoveProfilePicture}
                              className="absolute -top-3 -right-3 bg-red-500 hover:bg-red-600 text-white rounded-full w-10 h-10 shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <X className="w-5 h-5" />
                            </Button>
                          </div>
                        ) : (
                          <div className="w-40 h-40 rounded-3xl bg-gradient-to-br from-blue-100 to-purple-100 border-4 border-dashed border-blue-300 flex flex-col items-center justify-center shadow-inner">
                            <Camera className="w-16 h-16 text-blue-400 mb-2" />
                            <p className="text-xs text-blue-600 font-medium">Photo par défaut</p>
                          </div>
                        )}
                      </div>

                      <div className="w-full space-y-3">
                        <div className="flex gap-3">
                          <div className="flex-1 relative">
                            <LinkIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                            <Input
                              id="profilePicture"
                              type="url"
                              value={formData.profilePicture}
                              onChange={(e) => handleChange("profilePicture", e.target.value)}
                              placeholder="https://example.com/photo.jpg (optionnel)"
                              className="h-14 pl-12 text-base rounded-xl border-2 border-gray-200 focus:border-blue-600 transition-colors bg-white"
                            />
                          </div>
                          <Button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            disabled={uploadingImage}
                            className="h-14 px-6 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-xl shadow-lg hover:shadow-xl transition-all"
                          >
                            <Upload className="w-5 h-5 mr-2" />
                            Upload
                          </Button>
                          <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            onChange={handleFileChange}
                            className="hidden"
                          />
                        </div>
                        <p className="text-sm text-gray-500 flex items-center gap-2">
                          <Shield className="w-4 h-4" />
                          Collez une URL ou téléchargez une image (optionnel • max 5MB) - Une photo par défaut sera utilisée si vous n'en fournissez pas
                        </p>
                      </div>
                    </div>

                    {/* Uploading Indicator */}
                    {uploadingImage && (
                      <div className="p-4 bg-blue-50 rounded-xl border border-blue-200 flex items-center gap-3">
                        <div className="animate-spin rounded-full h-6 w-6 border-3 border-blue-600 border-t-transparent"></div>
                        <span className="text-sm font-medium text-blue-800">Upload en cours...</span>
                      </div>
                    )}
                  </div>

                  {/* Biography */}
                  <div className="space-y-3">
                    <Label htmlFor="biography" className="text-base font-semibold text-gray-900 flex items-center gap-2">
                      <BookOpen className="w-5 h-5 text-purple-600" />
                      Biographie <span className="text-gray-500 font-normal">(Optionnel)</span>
                    </Label>
                    <Textarea
                      id="biography"
                      value={formData.biography}
                      onChange={(e) => handleChange("biography", e.target.value)}
                      placeholder="Parlez-nous un peu de vous, vos passions, vos objectifs..."
                      className="min-h-[120px] text-base rounded-xl border-2 border-gray-200 focus:border-blue-600 transition-colors resize-none bg-white"
                      rows={5}
                    />
                    <p className="text-sm text-gray-500">
                      {formData.biography.length}/500 caractères
                    </p>
                  </div>

                  {/* Country Selection for Teachers - NOW IN STEP 3 */}
                  {(formData.role === "teacher" || formData.role === "both") && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="space-y-3"
                    >
                      <Label htmlFor="country" className="text-base font-semibold text-gray-900 flex items-center gap-2">
                        <CreditCard className="w-5 h-5 text-blue-600" />
                        Pays (pour les paiements) <span className="text-red-500">*</span>
                      </Label>
                      <select
                        id="country"
                        value={formData.country}
                        onChange={(e) => handleChange("country", e.target.value)}
                        className="w-full h-14 px-4 border-2 border-gray-200 rounded-xl bg-white text-base text-gray-900 focus:outline-none focus:border-blue-600 transition-colors cursor-pointer"
                        required
                      >
                        {STRIPE_COUNTRIES.map((country) => (
                          <option key={country.code} value={country.code}>
                            {country.name}
                          </option>
                        ))}
                      </select>
                      
                      {/* Stripe Info Banner */}
                      <div className="p-5 bg-gradient-to-br from-blue-50 to-purple-50 border-2 border-blue-200 rounded-2xl">
                        <div className="flex items-start gap-4">
                          <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center flex-shrink-0">
                            <Zap className="w-6 h-6 text-white" />
                          </div>
                          <div className="flex-1">
                            <h4 className="font-bold text-blue-900 mb-2 flex items-center gap-2">
                              Configuration Stripe automatique
                              <span className="px-2 py-0.5 bg-blue-600 text-white text-xs rounded-full">Nouveau</span>
                            </h4>
                            <p className="text-sm text-blue-800 mb-3">
                              Après avoir créé votre profil, vous serez redirigé vers Stripe pour finaliser votre compte de paiement. Une fois complété, vous pourrez créer des cours immédiatement !
                            </p>
                            <div className="p-4 bg-white rounded-xl border border-blue-200">
                              <p className="text-sm font-semibold text-blue-900 mb-2">
                                📋 Documents requis :
                              </p>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm text-blue-800">
                                <div className="flex items-center gap-2">
                                  <CheckCircle2 className="w-4 h-4 text-blue-600" />
                                  <span>Pièce d'identité</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <CheckCircle2 className="w-4 h-4 text-blue-600" />
                                  <span>Informations bancaires</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <CheckCircle2 className="w-4 h-4 text-blue-600" />
                                  <span>Adresse complète</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <CheckCircle2 className="w-4 h-4 text-blue-600" />
                                  <span>Numéro fiscal</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  <div className="flex gap-4">
                    <Button
                      type="button"
                      onClick={() => setCurrentStep(2)}
                      variant="outline"
                      className="flex-1 h-14 text-base font-semibold rounded-xl border-2 border-gray-300 hover:border-gray-400"
                    >
                      Retour
                    </Button>
                    <Button
                      type="submit"
                      disabled={loading}
                      className="flex-1 h-14 text-base font-semibold bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white rounded-xl shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {loading ? (
                        <>
                          <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent mr-2"></div>
                          Enregistrement...
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="w-5 h-5 mr-2" />
                          Finaliser mon profil
                        </>
                      )}
                    </Button>
                  </div>
                </motion.div>
              )}
            </form>
          </Card>
        </motion.div>

        {/* Footer */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="text-center text-sm text-gray-500 mt-6"
        >
          En continuant, vous acceptez nos conditions d'utilisation et notre politique de confidentialité
        </motion.p>
      </div>
    </div>
  );
}