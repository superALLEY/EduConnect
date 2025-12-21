import { useState, useEffect } from 'react';
import { db } from '../config/firebase';
import { collection, query, where, getDocs, doc, updateDoc } from 'firebase/firestore';
import { motion } from 'motion/react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
import { 
  DollarSign, 
  TrendingUp, 
  Calendar, 
  Clock, 
  Users, 
  BookOpen, 
  Download, 
  CreditCard, 
  CheckCircle, 
  AlertCircle, 
  AlertTriangle, 
  ExternalLink, 
  RefreshCw 
} from 'lucide-react';
import { toast } from "sonner@2.0.3";
import { createStripeConnectAccount, checkStripeAccountStatus, createAccountLink } from '../services/stripeService';

interface TeacherEarningsSectionProps {
  userId: string;
  stripeAccountId?: string | null;
  stripeOnboardingComplete?: boolean;
  stripeSetupPending?: boolean;
}

interface EnrollmentData {
  id: string;
  courseId: string;
  courseName: string;
  studentId: string;
  studentName: string;
  enrolledAt: any;
  status: string;
}

interface PaymentData {
  id: string;
  studentName: string;
  courseName: string;
  basePrice: number;
  instructorAmount: number;
  createdAt: any;
  status: string;
  transferStatus?: string;
}

export function TeacherEarningsSection({ 
  userId, 
  stripeAccountId, 
  stripeOnboardingComplete,
  stripeSetupPending 
}: TeacherEarningsSectionProps) {
  const [loading, setLoading] = useState(true);
  const [totalCourses, setTotalCourses] = useState(0);
  const [totalStudents, setTotalStudents] = useState(0);
  const [enrollments, setEnrollments] = useState<EnrollmentData[]>([]);
  const [setupStripeLoading, setSetupStripeLoading] = useState(false);
  const [refreshingStatus, setRefreshingStatus] = useState(false);
  const [localStripeComplete, setLocalStripeComplete] = useState(stripeOnboardingComplete);

  // Real earnings data from payments
  const [totalEarnings, setTotalEarnings] = useState(0);
  const [monthlyEarnings, setMonthlyEarnings] = useState(0);
  const [availableFunds, setAvailableFunds] = useState(0);
  const [pendingFunds, setPendingFunds] = useState(0);
  const [monthlyGrowth, setMonthlyGrowth] = useState(0);
  const [recentPayments, setRecentPayments] = useState<PaymentData[]>([]);
  const [allPayments, setAllPayments] = useState<PaymentData[]>([]);

  useEffect(() => {
    loadTeacherData();
  }, [userId]);

  const loadTeacherData = async () => {
    try {
      setLoading(true);

      // Load teacher's courses
      const coursesQuery = query(
        collection(db, "courses"),
        where("instructorId", "==", userId)
      );
      const coursesSnapshot = await getDocs(coursesQuery);
      setTotalCourses(coursesSnapshot.size);

      // Load payments data first (this is our source of truth for paid enrollments)
      const paymentsQuery = query(
        collection(db, "payments"),
        where("instructorId", "==", userId),
        where("status", "==", "completed")
      );
      const paymentsSnapshot = await getDocs(paymentsQuery);
      const allPayments: PaymentData[] = [];
      const paidStudentIds = new Set<string>();
      const allEnrollments: EnrollmentData[] = [];

      paymentsSnapshot.forEach((doc) => {
        const data = doc.data();
        allPayments.push({
          id: doc.id,
          studentName: data.studentName,
          courseName: data.courseName,
          basePrice: data.basePrice,
          instructorAmount: data.instructorAmount,
          createdAt: data.createdAt,
          status: data.status,
          transferStatus: data.transferStatus,
        });

        // Create enrollment entry from payment
        allEnrollments.push({
          id: doc.id,
          courseId: data.courseId,
          courseName: data.courseName,
          studentId: data.studentId,
          studentName: data.studentName,
          enrolledAt: data.createdAt,
          status: "enrolled",
        });
        paidStudentIds.add(data.studentId);
      });

      // Also load free enrollments from course_enrollments
      for (const courseDoc of coursesSnapshot.docs) {
        const courseData = courseDoc.data();
        
        // Get enrollment details from course_enrollments (for free courses)
        const enrollmentsQuery = query(
          collection(db, "course_enrollments"),
          where("courseId", "==", courseDoc.id),
          where("status", "==", "enrolled")
        );
        const enrollmentsSnapshot = await getDocs(enrollmentsQuery);
        
        enrollmentsSnapshot.forEach((doc) => {
          const data = doc.data();
          // Only add if not already in paid students
          if (!paidStudentIds.has(data.studentId)) {
            allEnrollments.push({
              id: doc.id,
              courseId: courseDoc.id,
              courseName: courseData.title,
              studentId: data.studentId,
              studentName: data.studentName,
              enrolledAt: data.enrolledAt,
              status: data.status,
            });
            paidStudentIds.add(data.studentId);
          }
        });
      }

      setEnrollments(allEnrollments);
      setTotalStudents(paidStudentIds.size);
      setRecentPayments(allPayments.slice(0, 5));
      setAllPayments(allPayments);

      // Calculate total earnings
      const totalEarnings = allPayments.reduce((sum, payment) => sum + payment.instructorAmount, 0);
      setTotalEarnings(totalEarnings);

      // Calculate monthly earnings
      const now = new Date();
      const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

      const thisMonthPayments = allPayments.filter(payment => {
        const date = payment.createdAt?.toDate?.() || new Date(payment.createdAt);
        return date >= thisMonth;
      });
      const lastMonthPayments = allPayments.filter(payment => {
        const date = payment.createdAt?.toDate?.() || new Date(payment.createdAt);
        return date >= lastMonth && date < thisMonth;
      });

      const thisMonthEarnings = thisMonthPayments.reduce((sum, payment) => sum + payment.instructorAmount, 0);
      const lastMonthEarnings = lastMonthPayments.reduce((sum, payment) => sum + payment.instructorAmount, 0);
      setMonthlyEarnings(thisMonthEarnings);

      // Calculate monthly growth
      if (lastMonthEarnings > 0) {
        setMonthlyGrowth(((thisMonthEarnings - lastMonthEarnings) / lastMonthEarnings) * 100);
      } else {
        setMonthlyGrowth(100);
      }

      // Calculate available and pending funds
      const availableFunds = allPayments.filter(payment => payment.transferStatus === "completed").reduce((sum, payment) => sum + payment.instructorAmount, 0);
      const pendingFunds = allPayments.filter(payment => payment.transferStatus !== "completed").reduce((sum, payment) => sum + payment.instructorAmount, 0);
      setAvailableFunds(availableFunds);
      setPendingFunds(pendingFunds);
    } catch (error) {
      console.error("Error loading teacher data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSetupStripe = async () => {
    try {
      setSetupStripeLoading(true);
      toast.info("Configuration de votre compte Stripe...");

      // Get user document reference
      const userQuery = query(collection(db, "users"), where("uid", "==", userId));
      const userSnapshot = await getDocs(userQuery);
      
      if (userSnapshot.empty) {
        toast.error("Impossible de récupérer vos informations");
        return;
      }

      const userDocRef = doc(db, "users", userSnapshot.docs[0].id);
      const userData = userSnapshot.docs[0].data();
      
      const stripeResult = await createStripeConnectAccount({
        email: userData.email || "",
        name: userData.name || "",
        userId: userId,
      });

      if (stripeResult.success && stripeResult.accountId && stripeResult.onboardingUrl) {
        // Save Stripe account ID to Firestore
        await updateDoc(userDocRef, {
          stripe_account_id: stripeResult.accountId,
          stripe_setup_pending: true,
          stripe_onboarding_complete: false,
        });

        toast.success("Redirection vers Stripe...");
        setTimeout(() => {
          window.location.href = stripeResult.onboardingUrl!;
        }, 1000);
      } else {
        toast.error("La configuration Stripe n'est pas disponible pour le moment");
      }
    } catch (error) {
      console.error("Error setting up Stripe:", error);
      toast.error("Erreur lors de la configuration Stripe");
    } finally {
      setSetupStripeLoading(false);
    }
  };

  const refreshStripeStatus = async () => {
    if (!stripeAccountId) {
      toast.error("Aucun compte Stripe trouvé");
      return;
    }

    try {
      setRefreshingStatus(true);
      toast.info("Vérification du statut Stripe...");

      const accountStatus = await checkStripeAccountStatus(stripeAccountId);
      
      console.log("Full account status:", accountStatus);
      
      if (accountStatus.error) {
        toast.error("Erreur lors de la vérification du statut");
        return;
      }

      // Get user document reference
      const userQuery = query(collection(db, "users"), where("uid", "==", userId));
      const userSnapshot = await getDocs(userQuery);
      
      if (userSnapshot.empty) {
        toast.error("Impossible de récupérer vos informations");
        return;
      }

      const userDocRef = doc(db, "users", userSnapshot.docs[0].id);

      if (accountStatus.isComplete) {
        // Update Firestore with the onboarding status
        await updateDoc(userDocRef, {
          stripe_onboarding_complete: true,
          stripe_setup_pending: false,
        });
        
        setLocalStripeComplete(true);
        toast.success("Votre compte Stripe est maintenant actif !");
        
        // Reload the page to reflect changes
        setTimeout(() => {
          window.location.reload();
        }, 1500);
      } else {
        // Show detailed status
        const details = accountStatus.details;
        if (details) {
          let message = "Statut Stripe:\n";
          if (!details.charges_enabled) message += "• Paiements: En attente\n";
          if (!details.payouts_enabled) message += "• Virements: En attente\n";
          if (!details.details_submitted) message += "• Informations: Incomplètes\n";
          
          if (details.requirements?.currently_due?.length > 0) {
            message += `\nInformations manquantes: ${details.requirements.currently_due.length}`;
            console.log("Missing requirements:", details.requirements.currently_due);
          }
          
          console.log(message);
          
          // If there are missing requirements, suggest going back to Stripe
          if (details.requirements?.currently_due?.length > 0 || !details.payouts_enabled) {
            toast.error("Des informations sont manquantes. Cliquez sur 'Compléter sur Stripe' pour les fournir.");
          } else if (accountStatus.requiresAction) {
            toast.error("Configuration incomplète. Veuillez retourner sur Stripe pour terminer.");
          } else {
            toast.warning("Configuration en cours de vérification par Stripe. Cela peut prendre quelques minutes. Réessayez dans quelques instants.");
          }
        } else {
          toast.warning("Votre configuration Stripe n'est pas encore complète. Veuillez terminer la configuration sur Stripe.");
        }
      }
    } catch (error) {
      console.error("Error refreshing Stripe status:", error);
      toast.error("Erreur lors de la vérification Stripe");
    } finally {
      setRefreshingStatus(false);
    }
  };

  const handleCompleteStripeSetup = async () => {
    if (!stripeAccountId) {
      toast.error("Aucun compte Stripe trouvé");
      return;
    }

    try {
      setSetupStripeLoading(true);
      toast.info("Création du lien Stripe...");

      const onboardingUrl = await createAccountLink(stripeAccountId);

      if (onboardingUrl) {
        toast.success("Redirection vers Stripe...");
        setTimeout(() => {
          window.location.href = onboardingUrl;
        }, 1000);
      } else {
        toast.error("Impossible de créer le lien Stripe");
      }
    } catch (error) {
      console.error("Error creating account link:", error);
      toast.error("Erreur lors de la création du lien Stripe");
    } finally {
      setSetupStripeLoading(false);
    }
  };

  const getRecentEnrollments = () => {
    return enrollments
      .sort((a, b) => {
        const dateA = a.enrolledAt?.toDate?.() || new Date(a.enrolledAt);
        const dateB = b.enrolledAt?.toDate?.() || new Date(b.enrolledAt);
        return dateB.getTime() - dateA.getTime();
      })
      .slice(0, 5);
  };

  const getEnrollmentGrowth = () => {
    const now = new Date();
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const lastMonthCount = enrollments.filter(e => {
      const date = e.enrolledAt?.toDate?.() || new Date(e.enrolledAt);
      return date >= lastMonth && date < thisMonth;
    }).length;

    const thisMonthCount = enrollments.filter(e => {
      const date = e.enrolledAt?.toDate?.() || new Date(e.enrolledAt);
      return date >= thisMonth;
    }).length;

    if (lastMonthCount === 0) return 100;
    return Math.round(((thisMonthCount - lastMonthCount) / lastMonthCount) * 100);
  };

  const exportPaymentsToPDF = async () => {
    console.log("=== EXPORT PDF STARTED ===");
    console.log("All payments count:", allPayments?.length);
    console.log("All payments data:", allPayments);
    
    try {
      if (!allPayments || allPayments.length === 0) {
        console.log("No payments to export");
        toast.error("Aucun paiement à exporter");
        return;
      }

      console.log("Step 1: Showing loading toast");
      toast.info("Génération du PDF en cours...");

      console.log("Step 2: Loading jsPDF and autotable");
      // Dynamically import jsPDF and autotable
      const jsPDFModule = await import("jspdf");
      const jsPDF = jsPDFModule.default;
      
      console.log("Step 3: Loading autoTable");
      const autoTableModule = await import("jspdf-autotable");
      const autoTable = autoTableModule.default;
      
      console.log("Step 4: jsPDF loaded:", typeof jsPDF);
      console.log("Step 5: autoTable loaded:", typeof autoTable);

      console.log("Step 6: Creating new jsPDF instance");
      const doc = new jsPDF();
      const now = new Date();
      
      console.log("Step 7: Adding title");
      // Title
      doc.setFontSize(20);
      doc.setTextColor(37, 99, 235); // Blue color
      doc.text("Rapport de Revenus - EduConnect", 14, 20);
      
      // Generation date
      doc.setFontSize(10);
      doc.setTextColor(100, 100, 100);
      doc.text(`Généré le: ${now.toLocaleDateString("fr-FR")} à ${now.toLocaleTimeString("fr-FR")}`, 14, 28);
      
      // Summary section
      doc.setFontSize(14);
      doc.setTextColor(0, 0, 0);
      doc.text("Résumé des Revenus", 14, 40);
      
      doc.setFontSize(10);
      let yPos = 48;
      
      console.log("Step 8: Creating summary data");
      // Summary boxes - avec validation des données
      const summaryData = [
        ["Revenus totaux:", `$${(totalEarnings || 0).toFixed(2)}`],
        ["Revenus ce mois-ci:", `$${(monthlyEarnings || 0).toFixed(2)}`],
        ["Fonds disponibles:", `$${(availableFunds || 0).toFixed(2)}`],
        ["Fonds en attente:", `$${(pendingFunds || 0).toFixed(2)}`],
        ["Croissance mensuelle:", `${(monthlyGrowth || 0) >= 0 ? '+' : ''}${(monthlyGrowth || 0).toFixed(1)}%`],
        ["", ""],
        ["Total de cours:", `${totalCourses || 0}`],
        ["Étudiants actifs:", `${totalStudents || 0}`],
        ["Total d'inscriptions:", `${enrollments?.length || 0}`],
        ["Nombre de paiements:", `${allPayments.length}`],
      ];
      
      console.log("Step 9: Adding summary table");
      autoTable(doc, {
        body: summaryData,
        startY: yPos,
        theme: 'plain',
        styles: {
          fontSize: 10,
          cellPadding: 2,
        },
        columnStyles: {
          0: { fontStyle: 'bold', textColor: [80, 80, 80] },
          1: { textColor: [0, 0, 0], fontStyle: 'bold' },
        },
      });
      
      // Payments table
      yPos = (doc as any).lastAutoTable.finalY + 15;
      
      doc.setFontSize(14);
      doc.text("Historique Détaillé des Paiements", 14, yPos);
      
      yPos += 8;
      
      console.log("Step 10: Sorting payments");
      // Sort payments by date (most recent first) avec validation
      const sortedPayments = [...allPayments].sort((a, b) => {
        try {
          const dateA = a.createdAt?.toDate?.() || new Date(a.createdAt || Date.now());
          const dateB = b.createdAt?.toDate?.() || new Date(b.createdAt || Date.now());
          return dateB.getTime() - dateA.getTime();
        } catch (error) {
          console.error("Error sorting payments:", error);
          return 0;
        }
      });
      
      console.log("Step 11: Preparing table rows");
      // Préparer les lignes du tableau avec gestion des données manquantes
      const tableRows = sortedPayments.map(payment => {
        try {
          const date = payment.createdAt?.toDate?.() || new Date(payment.createdAt || Date.now());
          const studentName = payment.studentName || "Étudiant inconnu";
          const courseName = payment.courseName || "Cours sans nom";
          const basePrice = payment.basePrice || 0;
          const instructorAmount = payment.instructorAmount || 0;
          const transferStatus = payment.transferStatus === "completed" ? "Transféré" : "En attente";
          
          return [
            date.toLocaleDateString("fr-FR"),
            studentName.substring(0, 35),
            courseName.substring(0, 30) + (courseName.length > 30 ? '...' : ''),
            `$${basePrice.toFixed(2)}`,
            `$${instructorAmount.toFixed(2)}`,
            transferStatus
          ];
        } catch (error) {
          console.error("Error processing payment row:", error);
          return ["N/A", "Erreur", "Erreur", "$0.00", "$0.00", "N/A"];
        }
      });
      
      console.log("Step 12: Adding payments table");
      autoTable(doc, {
        head: [["Date", "Étudiant", "Cours", "Prix", "Revenu", "Statut"]],
        body: tableRows,
        startY: yPos,
        theme: "grid",
        styles: {
          fontSize: 9,
          cellPadding: 3,
          overflow: 'linebreak',
        },
        headStyles: {
          fillColor: [37, 99, 235],
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          halign: 'left',
        },
        alternateRowStyles: {
          fillColor: [245, 247, 250],
        },
        columnStyles: {
          0: { cellWidth: 25 },
          1: { cellWidth: 35 },
          2: { cellWidth: 50 },
          3: { cellWidth: 22, halign: 'right' },
          4: { cellWidth: 22, halign: 'right', fontStyle: 'bold', textColor: [34, 197, 94] },
          5: { cellWidth: 30, halign: 'center' },
        },
      });
      
      // Footer with totals
      yPos = (doc as any).lastAutoTable.finalY + 10;
      
      // S'assurer que le footer n'est pas trop bas
      if (yPos > 250) {
        doc.addPage();
        yPos = 20;
      }
      
      console.log("Step 13: Adding footer");
      doc.setFillColor(240, 240, 240);
      doc.rect(14, yPos, 182, 25, 'F');
      
      doc.setFontSize(11);
      doc.setTextColor(0, 0, 0);
      doc.setFont(undefined, 'bold');
      doc.text(`Total des paiements: ${allPayments.length}`, 20, yPos + 8);
      doc.text(`Revenu total: $${(totalEarnings || 0).toFixed(2)}`, 20, yPos + 16);
      
      console.log("Step 14: Adding page numbers");
      // Page numbers
      const pageCount = (doc as any).internal.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(150, 150, 150);
        doc.text(
          `Page ${i} sur ${pageCount}`,
          doc.internal.pageSize.width / 2,
          doc.internal.pageSize.height - 10,
          { align: 'center' }
        );
      }
      
      // Générer le nom de fichier avec la date
      const fileName = `EduConnect_Revenus_${now.toISOString().split('T')[0]}.pdf`;
      
      console.log("Step 15: Saving PDF with filename:", fileName);
      doc.save(fileName);
      
      console.log("Step 16: PDF saved successfully!");
      console.log("=== EXPORT PDF COMPLETED ===");
      toast.success(`✅ Rapport PDF généré avec succès ! ${allPayments.length} paiements exportés.`);
    } catch (error) {
      console.error("=== ERROR IN EXPORT PDF ===");
      console.error("Error details:", error);
      console.error("Error stack:", error instanceof Error ? error.stack : "No stack trace");
      const errorMessage = error instanceof Error ? error.message : "Erreur inconnue";
      toast.error(`❌ Erreur lors de l'export du PDF: ${errorMessage}`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Stripe Setup Status */}
      <Card className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className={`p-3 rounded-lg ${
              localStripeComplete 
                ? "bg-green-100" 
                : "bg-orange-100"
            }`}>
              <CreditCard className={`w-6 h-6 ${
                localStripeComplete 
                  ? "text-green-600" 
                  : "text-orange-600"
              }`} />
            </div>
            <div>
              <h3 className="text-gray-900">Configuration Stripe</h3>
              <p className="text-sm text-gray-600">
                {localStripeComplete 
                  ? "Votre compte de paiement est configuré" 
                  : "Configurez votre compte pour recevoir des paiements"}
              </p>
            </div>
          </div>
          {localStripeComplete ? (
            <Badge className="bg-green-100 text-green-700 border-green-200">
              <CheckCircle className="w-3 h-3 mr-1" />
              Actif
            </Badge>
          ) : (
            <Badge className="bg-orange-100 text-orange-700 border-orange-200">
              <AlertCircle className="w-3 h-3 mr-1" />
              En attente
            </Badge>
          )}
        </div>

        {!localStripeComplete && (
          <div className="space-y-3">
            {stripeAccountId && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm text-red-900">
                    <strong>Action requise :</strong> Des informations supplémentaires sont nécessaires pour activer les virements sur votre compte Stripe.
                  </p>
                  <p className="text-xs text-red-700 mt-1">
                    Paiements: ✅ Activés • Virements: ❌ En attente
                  </p>
                </div>
              </div>
            )}
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-900">
                <strong>Prochaine étape :</strong> Complétez votre configuration Stripe pour commencer à recevoir des paiements de vos étudiants.
              </p>
              <ul className="text-xs text-blue-700 mt-2 space-y-1 ml-4 list-disc">
                <li>Informations bancaires pour les virements</li>
                <li>Vérification d'identité</li>
                <li>Détails fiscaux</li>
              </ul>
            </div>
            {stripeAccountId ? (
              <>
                <Button
                  onClick={handleCompleteStripeSetup}
                  disabled={setupStripeLoading}
                  className="w-full bg-orange-600 hover:bg-orange-700 text-white"
                >
                  {setupStripeLoading ? (
                    <>Redirection en cours...</>
                  ) : (
                    <>
                      <AlertTriangle className="w-4 h-4 mr-2" />
                      Compléter sur Stripe
                    </>
                  )}
                </Button>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={refreshStripeStatus}
                  disabled={refreshingStatus}
                >
                  {refreshingStatus ? (
                    <>Vérification en cours...</>
                  ) : (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2" />
                      J'ai terminé - Vérifier le statut
                    </>
                  )}
                </Button>
              </>
            ) : (
              <Button
                onClick={handleSetupStripe}
                disabled={setupStripeLoading}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white"
              >
                {setupStripeLoading ? (
                  <>Configuration en cours...</>
                ) : (
                  <>
                    <ExternalLink className="w-4 h-4 mr-2" />
                    Configurer Stripe Connect
                  </>
                )}
              </Button>
            )}
          </div>
        )}

        {localStripeComplete && stripeAccountId && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <CheckCircle className="w-4 h-4 text-green-600" />
              <span>ID de compte : {stripeAccountId.substring(0, 20)}...</span>
            </div>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => window.open("https://dashboard.stripe.com", "_blank")}
            >
              <ExternalLink className="w-4 h-4 mr-2" />
              Ouvrir le Dashboard Stripe
            </Button>
            <Button
              variant="outline"
              className="w-full"
              onClick={refreshStripeStatus}
              disabled={refreshingStatus}
            >
              {refreshingStatus ? (
                <>Vérification en cours...</>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Vérifier le statut Stripe
                </>
              )}
            </Button>
          </div>
        )}
      </Card>

      {/* Earnings Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="p-5 bg-gradient-to-br from-green-50 to-green-100 border-green-200 hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-between mb-2">
              <div className="p-2 bg-green-500 rounded-lg">
                <DollarSign className="w-5 h-5 text-white" />
              </div>
              <TrendingUp className="w-5 h-5 text-green-600" />
            </div>
            <h3 className="text-gray-900">Revenus totaux</h3>
            <p className="text-2xl font-bold text-gray-900 mt-1">
              ${totalEarnings.toFixed(2)}
            </p>
            <p className="text-xs text-gray-600 mt-1">Tous les temps</p>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="p-5 bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200 hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-between mb-2">
              <div className="p-2 bg-blue-500 rounded-lg">
                <Calendar className="w-5 h-5 text-white" />
              </div>
              <Badge className="bg-blue-500 text-white text-xs">
                +{Math.abs(monthlyGrowth)}%
              </Badge>
            </div>
            <h3 className="text-gray-900">Ce mois-ci</h3>
            <p className="text-2xl font-bold text-gray-900 mt-1">
              ${monthlyEarnings.toFixed(2)}
            </p>
            <p className="text-xs text-gray-600 mt-1">Décembre 2024</p>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card className="p-5 bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200 hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-between mb-2">
              <div className="p-2 bg-orange-500 rounded-lg">
                <Clock className="w-5 h-5 text-white" />
              </div>
            </div>
            <h3 className="text-gray-900">En attente</h3>
            <p className="text-2xl font-bold text-gray-900 mt-1">
              ${pendingFunds.toFixed(2)}
            </p>
            <p className="text-xs text-gray-600 mt-1">Transfert en cours</p>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card className="p-5 bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200 hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-between mb-2">
              <div className="p-2 bg-purple-500 rounded-lg">
                <Users className="w-5 h-5 text-white" />
              </div>
              <Badge className="bg-purple-500 text-white text-xs">
                +{getEnrollmentGrowth()}%
              </Badge>
            </div>
            <h3 className="text-gray-900">Étudiants actifs</h3>
            <p className="text-2xl font-bold text-gray-900 mt-1">{totalStudents}</p>
            <p className="text-xs text-gray-600 mt-1">Dans {totalCourses} cours</p>
          </Card>
        </motion.div>
      </div>

      {/* Course Performance */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-gray-900">Performance des cours</h3>
            <p className="text-sm text-gray-600 mt-1">
              Vue d'ensemble de vos cours et inscriptions
            </p>
          </div>
          <Button
            variant="outline"
            onClick={() => window.location.href = "/courses"}
          >
            <BookOpen className="w-4 h-4 mr-2" />
            Mes cours
          </Button>
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-600">Cours publiés</span>
                <BookOpen className="w-4 h-4 text-gray-400" />
              </div>
              <p className="text-2xl font-bold text-gray-900">{totalCourses}</p>
              <Progress value={(totalCourses / 10) * 100} className="mt-2" />
              <p className="text-xs text-gray-500 mt-1">Objectif : 10 cours</p>
            </div>

            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-600">Inscriptions totales</span>
                <Users className="w-4 h-4 text-gray-400" />
              </div>
              <p className="text-2xl font-bold text-gray-900">{enrollments.length}</p>
              <Progress value={(enrollments.length / 50) * 100} className="mt-2" />
              <p className="text-xs text-gray-500 mt-1">Objectif : 50 inscriptions</p>
            </div>
          </div>
        </div>
      </Card>

      {/* Recent Enrollments */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-gray-900">Inscriptions récentes</h3>
            <p className="text-sm text-gray-600 mt-1">
              Les 5 dernières inscriptions à vos cours
            </p>
          </div>
          <Button
            variant="outline"
            onClick={exportPaymentsToPDF}
          >
            <Download className="w-4 h-4 mr-2" />
            Exporter les paiements
          </Button>
        </div>

        {loading ? (
          <div className="text-center py-8 text-gray-500">
            Chargement...
          </div>
        ) : getRecentEnrollments().length === 0 ? (
          <div className="text-center py-8">
            <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">Aucune inscription pour le moment</p>
            <p className="text-sm text-gray-400 mt-1">
              Vos étudiants apparaîtront ici dès qu'ils s'inscriront
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {getRecentEnrollments().map((enrollment) => (
              <div
                key={enrollment.id}
                className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center text-white font-semibold">
                    {enrollment.studentName.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{enrollment.studentName}</p>
                    <p className="text-sm text-gray-600">{enrollment.courseName}</p>
                  </div>
                </div>
                <div className="text-right">
                  <Badge className="bg-green-100 text-green-700 border-green-200">
                    Inscrit
                  </Badge>
                  <p className="text-xs text-gray-500 mt-1">
                    {enrollment.enrolledAt?.toDate ? 
                      enrollment.enrolledAt.toDate().toLocaleDateString("fr-FR") :
                      new Date(enrollment.enrolledAt).toLocaleDateString("fr-FR")
                    }
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}