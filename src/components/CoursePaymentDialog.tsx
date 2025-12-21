import { createNotification } from "../utils/notifications";
import { useAuth } from "../contexts/AuthContext";
import { createCoursePaymentIntent, transferToInstructor } from "../services/stripe";
import { PaymentResultDialog } from "./PaymentResultDialog";
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Card } from "./ui/card";
import { Alert, AlertDescription } from "./ui/alert";
import { CreditCard, DollarSign, Lock, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { db } from "../config/firebase";
import { doc, getDoc, addDoc, collection, updateDoc, arrayUnion, serverTimestamp } from "firebase/firestore";

// Helper function to create course sessions in student's schedule
/**
 * PROFESSIONAL: Creates all course sessions in student's schedule
 * - Generates sessions from course start to end date
 * - Adds sessions for all selected weekdays
 * - Both student and teacher appear as participants
 * - Optimized with parallel creation for better performance
 */
const createCourseSessionsForStudent = async (
  courseData: any,
  studentId: string,
  instructorId: string,
  courseId: string
) => {
  try {
    console.log(`🎓 Creating course sessions for student ${studentId} in course ${courseId}`);

    // Extract time from schedule (e.g., "14:00-16:00")
    const schedule = courseData.schedule || "";
    const timeMatch = schedule.match(/(\d{1,2})[h:](\d{2})\s*-\s*(\d{1,2})[h:](\d{2})/);

    if (!timeMatch) {
      console.error("❌ Invalid schedule format:", schedule);
      toast.error("Format d'horaire invalide pour ce cours");
      return;
    }

    const startTime = `${timeMatch[1].padStart(2, "0")}:${timeMatch[2]}`;
    const endTime = `${timeMatch[3].padStart(2, "0")}:${timeMatch[4]}`;

    // Validate weekDays
    const weekDays = courseData.weekDays || [];
    if (weekDays.length === 0) {
      console.error("❌ No weekDays specified for repetitive course");
      toast.error("Aucun jour de la semaine spécifié pour ce cours");
      return;
    }

    // Parse dates with robust handling
    const startDate = courseData.startDate
      ? typeof courseData.startDate === "string"
        ? new Date(courseData.startDate)
        : courseData.startDate.toDate
        ? new Date(courseData.startDate.toDate())
        : new Date(courseData.startDate)
      : new Date();
    
    const endDate = courseData.endDate
      ? typeof courseData.endDate === "string"
        ? new Date(courseData.endDate)
        : courseData.endDate.toDate
        ? new Date(courseData.endDate.toDate())
        : new Date(courseData.endDate)
      : new Date(new Date().setMonth(new Date().getMonth() + 3));

    console.log(`📅 Generating sessions from ${startDate.toLocaleDateString('fr-FR')} to ${endDate.toLocaleDateString('fr-FR')}`);

    // Generate all session dates for selected weekDays
    const sessionDates: string[] = [];
    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
      if (weekDays.includes(d.getDay())) {
        sessionDates.push(new Date(d).toISOString().split("T")[0]);
      }
    }

    if (sessionDates.length === 0) {
      console.warn("⚠️ No sessions generated for selected days in date range");
      toast.warning("Aucune session n'a pu être générée pour ce cours");
      return;
    }

    console.log(`✨ Generating ${sessionDates.length} sessions...`);

    const repetitionId = `course_${courseId}_student_${studentId}`;

    // PROFESSIONAL: Create all sessions in parallel for optimal performance
    const sessionPromises = sessionDates.map(async (sessionDate) => {
      const dateObj = new Date(sessionDate);
      const formattedDate = dateObj.toLocaleDateString("fr-FR", {
        day: "numeric",
        month: "long",
        year: "numeric",
      });

      const sessionData = {
        title: courseData.title,
        description: courseData.description || "",
        organizer: courseData.instructorName || "",
        organizerId: instructorId,
        teacherName: courseData.instructorName || "",
        date: sessionDate,
        formattedDate: formattedDate,
        startTime: startTime,
        endTime: endTime,
        time: `${startTime} - ${endTime}`,
        location: courseData.isOnline ? "En ligne" : (courseData.location || ""),
        meetingLink: courseData.isOnline ? (courseData.onlineLink || "") : null,
        attendees: 2, // Student + teacher
        maxAttendees: 100,
        category: "Cours 📚",
        sessionCategory: "course",
        isOnline: courseData.isOnline || false,
        isGroupSession: false,
        isTutoring: false,
        isEvent: false,
        isGroupMeet: false,
        groupId: null,
        createdAt: serverTimestamp(),
        createdBy: studentId, // Created for the student
        participants: [studentId, instructorId], // BOTH student and teacher
        isRepetitive: true,
        repetitionId: repetitionId,
        repetitionFrequency: "weekly",
        courseId: courseId,
        isCourseSession: true,
        requests: [], // Initialize empty requests array
      };

      return addDoc(collection(db, "sessions"), sessionData);
    });

    // Create all sessions in parallel
    await Promise.all(sessionPromises);

    console.log(`✅ Successfully created ${sessionDates.length} course sessions for student`);
    toast.success(
      `${sessionDates.length} sessions ajoutées à votre emploi du temps!`,
      { duration: 4000 }
    );
  } catch (error) {
    console.error("❌ Error creating course sessions:", error);
    toast.error("Erreur lors de l'ajout des sessions à votre emploi du temps");
    // Don't throw error - course enrollment should still succeed
  }
};

interface CoursePaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  course: {
    id: string;
    title: string;
    instructorId: string;
    instructorName: string;
    basePrice?: number;
    finalPrice?: number;
  };
  onSuccess?: () => void;
}

export function CoursePaymentDialog({ open, onOpenChange, course, onSuccess }: CoursePaymentDialogProps) {
  const { currentUser } = useAuth();
  const [processing, setProcessing] = useState(false);
  const [cardNumber, setCardNumber] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [cvv, setCvv] = useState("");
  const [cardholderName, setCardholderName] = useState("");
  
  const [paymentResultOpen, setPaymentResultOpen] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<"success" | "failed" | "processing">("processing");
  const [paymentError, setPaymentError] = useState<string>("");

  const formatCardNumber = (value: string) => {
    const v = value.replace(/\s+/g, "").replace(/[^0-9]/gi, "");
    const matches = v.match(/\d{4,16}/g);
    const match = (matches && matches[0]) || "";
    const parts = [];

    for (let i = 0, len = match.length; i < len; i += 4) {
      parts.push(match.substring(i, i + 4));
    }

    if (parts.length) {
      return parts.join(" ");
    } else {
      return value;
    }
  };

  const formatExpiryDate = (value: string) => {
    const v = value.replace(/\s+/g, "").replace(/[^0-9]/gi, "");
    if (v.length >= 2) {
      return v.slice(0, 2) + "/" + v.slice(2, 4);
    }
    return v;
  };

  const handleCardNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatCardNumber(e.target.value);
    if (formatted.replace(/\s/g, "").length <= 16) {
      setCardNumber(formatted);
    }
  };

  const handleExpiryDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatExpiryDate(e.target.value);
    if (formatted.replace(/\//g, "").length <= 4) {
      setExpiryDate(formatted);
    }
  };

  const handleCvvChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/[^0-9]/gi, "");
    if (value.length <= 4) {
      setCvv(value);
    }
  };

  const validateForm = () => {
    if (!cardholderName.trim()) {
      toast.error("Veuillez entrer le nom du titulaire");
      return false;
    }
    if (cardNumber.replace(/\s/g, "").length !== 16) {
      toast.error("Numéro de carte invalide");
      return false;
    }
    if (expiryDate.length !== 5 || !expiryDate.includes("/")) {
      toast.error("Date d'expiration invalide");
      return false;
    }
    if (cvv.length < 3) {
      toast.error("CVV invalide");
      return false;
    }
    return true;
  };

  const handlePayment = async () => {
    if (!currentUser || !validateForm()) return;

    setProcessing(true);
    setPaymentStatus("processing");

    try {
      // Get current user data
      const userDoc = await getDoc(doc(db, "users", currentUser.uid));
      if (!userDoc.exists()) {
        setPaymentStatus("failed");
        setPaymentError("Utilisateur non trouvé");
        setPaymentResultOpen(true);
        return;
      }
      const userData = userDoc.data();

      // Get instructor data to get Stripe account
      const instructorDoc = await getDoc(doc(db, "users", course.instructorId));
      if (!instructorDoc.exists()) {
        setPaymentStatus("failed");
        setPaymentError("Professeur non trouvé");
        setPaymentResultOpen(true);
        return;
      }
      const instructorData = instructorDoc.data();

      // Use stripe_account_id (with underscores) as stored in Firestore
      if (!instructorData.stripe_account_id) {
        setPaymentStatus("failed");
        setPaymentError("Le professeur n'a pas configuré son compte de paiement");
        setPaymentResultOpen(true);
        return;
      }

      // Step 1: Create Payment Intent
      toast.loading("Création du paiement...", { id: "payment-process" });
      
      const paymentIntentResult = await createCoursePaymentIntent({
        amount: course.finalPrice || course.basePrice || 0,
        courseId: course.id,
        courseName: course.title,
        studentId: currentUser.uid,
        studentEmail: currentUser.email || "",
        instructorId: course.instructorId,
        instructorStripeAccountId: instructorData.stripe_account_id,
        basePrice: course.basePrice || 0,
      });

      if (!paymentIntentResult.success || !paymentIntentResult.clientSecret) {
        setPaymentStatus("failed");
        setPaymentError(paymentIntentResult.error || "Échec de création du paiement");
        setPaymentResultOpen(true);
        toast.dismiss("payment-process");
        return;
      }

      // Step 2: Simulate card payment with validation
      toast.loading("Traitement du paiement...", { id: "payment-process" });
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Simulate card payment validation
      // Test cards that should FAIL (common decline scenarios)
      const cardNumberClean = cardNumber.replace(/\s/g, "");
      const declineScenarios: Record<string, string> = {
        "4000000000000002": "Carte refusée - Fonds insuffisants",
        "4000000000009995": "Carte refusée - Carte perdue ou volée",
        "4000000000009987": "Carte refusée - Carte expirée",
        "4000000000000069": "Carte refusée - Carte expirée",
        "4000000000000127": "Carte refusée - Code CVV incorrect",
        "4000000000000119": "Carte refusée - Erreur de traitement",
        "4000000000003220": "Carte refusée - Authentification 3D Secure requise",
      };

      // Check if this card should decline
      if (declineScenarios[cardNumberClean]) {
        // Payment FAILED - Show error and DO NOT enroll
        setPaymentStatus("failed");
        setPaymentError(declineScenarios[cardNumberClean]);
        setPaymentResultOpen(true);
        toast.dismiss("payment-process");
        return;
      }

      // Card payment succeeded - continue with the process
      const paymentIntentId = paymentIntentResult.paymentIntentId || "";

      // Step 3: Transfer funds to instructor
      toast.loading("Transfert vers le professeur...", { id: "payment-process" });
      
      const transferResult = await transferToInstructor({
        amount: course.basePrice || 0,
        instructorStripeAccountId: instructorData.stripe_account_id,
        paymentIntentId: paymentIntentId,
        courseId: course.id,
        courseName: course.title,
      });

      let transferStatus = "completed";
      let transferId = transferResult.transferId || null;
      let transferError = null;

      if (!transferResult.success) {
        console.error("Transfer failed:", transferResult.error);
        transferStatus = "pending";
        transferError = transferResult.error;
        // Continue anyway - the payment is completed, transfer can be retried later
        // The instructor will see "pending" funds in their earnings
      }

      // Step 4: Create payment record in database
      const platformFee = (course.finalPrice || 0) - (course.basePrice || 0);
      
      await addDoc(collection(db, "payments"), {
        courseId: course.id,
        courseName: course.title,
        studentId: currentUser.uid,
        studentName: userData.name || "Unknown",
        studentEmail: currentUser.email || "",
        instructorId: course.instructorId,
        instructorName: course.instructorName,
        totalAmount: course.finalPrice || course.basePrice || 0,
        basePrice: course.basePrice || 0,
        platformFee: platformFee,
        instructorAmount: course.basePrice || 0,
        currency: "USD",
        status: "completed",
        transferStatus: transferStatus,
        transferError: transferError,
        paymentMethod: "card",
        cardLast4: cardNumber.slice(-4),
        stripePaymentIntentId: paymentIntentId,
        stripeTransferId: transferId,
        createdAt: serverTimestamp(),
      });

      // Step 5: Add student directly to enrolled students (ONLY after successful payment)
      const courseRef = doc(db, "courses", course.id);
      const courseDoc = await getDoc(courseRef);
      const fullCourseData = courseDoc.data();
      
      await updateDoc(courseRef, {
        enrolledStudents: arrayUnion(currentUser.uid)
      });

      // Step 5.5: If course is repetitive, create sessions automatically for student
      if (fullCourseData?.courseType === "time-based" && fullCourseData?.isRepetitive) {
        await createCourseSessionsForStudent(fullCourseData, currentUser.uid, course.instructorId, course.id);
      }

      // Step 6: Create payment notification for instructor with amount
      await createNotification({
        from: currentUser.uid,
        to: course.instructorId,
        type: "course_payment",
        courseId: course.id,
        courseName: course.title,
        amount: course.basePrice || 0,
      });

      // Step 7: Create enrollment confirmation for student
      await createNotification({
        from: "system",
        to: currentUser.uid,
        type: "course_enrollment_confirmed",
        courseId: course.id,
        courseName: course.title,
      });

      toast.dismiss("payment-process");
      
      // Show success dialog
      setPaymentStatus("success");
      setPaymentResultOpen(true);
      
      onOpenChange(false);
      
      // Reset form
      setCardNumber("");
      setExpiryDate("");
      setCvv("");
      setCardholderName("");

      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      console.error("Error processing payment:", error);
      toast.dismiss("payment-process");
      setPaymentStatus("failed");
      setPaymentError(error instanceof Error ? error.message : "Erreur lors du traitement du paiement");
      setPaymentResultOpen(true);
    } finally {
      setProcessing(false);
    }
  };

  const handlePaymentResultClose = () => {
    setPaymentResultOpen(false);
    if (paymentStatus === "failed") {
      // Reset for retry
      setPaymentStatus("processing");
      setPaymentError("");
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-full sm:max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl sm:text-2xl">Paiement du cours</DialogTitle>
            <DialogDescription className="text-sm">
              Complétez les informations de paiement pour vous inscrire
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 sm:space-y-6 py-4">
            <Card className="p-4 sm:p-6 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950 dark:to-indigo-950 border-blue-200 dark:border-blue-800">
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-900 dark:text-white text-base sm:text-lg truncate">{course.title}</h3>
                    <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mt-1">par {course.instructorName}</p>
                  </div>
                </div>
                <div className="border-t border-blue-200 dark:border-blue-700 pt-3 mt-3">
                  <div className="flex items-center justify-between text-xs sm:text-sm mb-2">
                    <span className="text-gray-600 dark:text-gray-400">Prix du cours</span>
                    <span className="font-medium text-gray-900 dark:text-white">${course.basePrice?.toFixed(2)}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs sm:text-sm mb-2">
                    <span className="text-gray-600 dark:text-gray-400">Frais de plateforme (2.5%)</span>
                    <span className="font-medium text-gray-900 dark:text-white">
                      ${((course.finalPrice || 0) - (course.basePrice || 0)).toFixed(2)}
                    </span>
                  </div>
                  <div className="border-t border-blue-300 dark:border-blue-600 pt-2 mt-2">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-blue-900 dark:text-blue-100 text-sm sm:text-base">Total</span>
                      <span className="font-bold text-blue-900 dark:text-blue-100 text-lg sm:text-2xl">
                        ${course.finalPrice?.toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </Card>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="cardholderName" className="flex items-center gap-2 text-sm sm:text-base">
                  <CreditCard className="w-4 h-4" />
                  Nom du titulaire *
                </Label>
                <Input
                  id="cardholderName"
                  placeholder="John Doe"
                  value={cardholderName}
                  onChange={(e) => setCardholderName(e.target.value)}
                  disabled={processing}
                  className="text-sm sm:text-base"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="cardNumber" className="text-sm sm:text-base">Numéro de carte *</Label>
                <Input
                  id="cardNumber"
                  placeholder="1234 5678 9012 3456"
                  value={cardNumber}
                  onChange={handleCardNumberChange}
                  disabled={processing}
                  maxLength={19}
                  className="text-sm sm:text-base font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-3 sm:gap-4">
                <div className="space-y-2">
                  <Label htmlFor="expiryDate" className="text-sm sm:text-base">Date d'expiration *</Label>
                  <Input
                    id="expiryDate"
                    placeholder="MM/YY"
                    value={expiryDate}
                    onChange={handleExpiryDateChange}
                    disabled={processing}
                    maxLength={5}
                    className="text-sm sm:text-base font-mono"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cvv" className="text-sm sm:text-base">CVV *</Label>
                  <Input
                    id="cvv"
                    type="password"
                    placeholder="123"
                    value={cvv}
                    onChange={handleCvvChange}
                    disabled={processing}
                    maxLength={4}
                    className="text-sm sm:text-base font-mono"
                  />
                </div>
              </div>

              <Alert className="bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
                <Lock className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <AlertDescription className="text-xs sm:text-sm text-blue-900 dark:text-blue-100">
                  Paiement sécurisé. Vos informations sont protégées.
                </AlertDescription>
              </Alert>

              <div className="bg-gray-50 dark:bg-gray-900 p-3 sm:p-4 rounded-lg border border-gray-200 dark:border-gray-700">
                <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mb-2">
                  💳 <strong>Cartes de test (environnement de développement):</strong>
                </p>
                <ul className="text-xs space-y-1 text-gray-500 dark:text-gray-500">
                  <li>✅ Succès: 4242 4242 4242 4242</li>
                  <li>❌ Refusée: 4000 0000 0000 0002</li>
                  <li>⏳ CVV/Date: n'importe quelle valeur valide</li>
                </ul>
              </div>
            </div>
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={processing}
              className="w-full sm:w-auto text-sm sm:text-base"
            >
              Annuler
            </Button>
            <Button
              onClick={handlePayment}
              disabled={processing}
              className="w-full sm:w-auto bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white text-sm sm:text-base"
            >
              {processing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Traitement...
                </>
              ) : (
                <>
                  <Lock className="w-4 h-4 mr-2" />
                  Payer ${course.finalPrice?.toFixed(2)}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <PaymentResultDialog
        open={paymentResultOpen}
        onOpenChange={(open) => {
          setPaymentResultOpen(open);
          if (!open && paymentStatus === "success") {
            onOpenChange(false);
            onSuccess?.();
          }
        }}
        status={paymentStatus}
        amount={course.finalPrice || course.basePrice || 0}
        courseName={course.title}
        error={paymentError}
      />
    </>
  );
}