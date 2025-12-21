import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { collection, query, where, getDocs, limit, orderBy } from "firebase/firestore";
import { db } from "../config/firebase";
import { useAuth } from "../contexts/AuthContext";
import { Card } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Progress } from "../components/ui/progress";
import { Input } from "../components/ui/input";
import {
  DollarSign,
  Calendar,
  Users,
  BookOpen,
  ArrowUpRight,
  Filter,
  Download,
  BarChart3,
  PieChart,
  TrendingUp,
  CreditCard,
  Clock,
  ExternalLink,
  CheckCircle2,
  Search,
  X,
  ChevronDown,
  ArrowDownRight,
  Loader2,
  Receipt,
  Wallet,
  TrendingDown,
  Activity,
  FileText,
  Eye,
  Zap,
  Target,
  Award,
} from "lucide-react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart as RePieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Area,
  AreaChart,
} from "recharts";
import { toast } from "sonner@2.0.3";

interface EarningsData {
  month: string;
  earnings: number;
  students: number;
}

interface PaymentData {
  id?: string;
  studentName: string;
  courseName: string;
  basePrice: number;
  instructorAmount: number;
  createdAt: any;
  status: string;
  transferStatus?: string;
  paymentMethod?: string;
  courseId?: string;
  studentId?: string;
}

const COLORS = ["#3B82F6", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6", "#EC4899"];

export function EarningsStatsPage() {
  const { currentUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [timeRange, setTimeRange] = useState<"week" | "month" | "year">("month");
  const [totalEarnings, setTotalEarnings] = useState(0);
  const [monthlyEarnings, setMonthlyEarnings] = useState(0);
  const [monthlyGrowth, setMonthlyGrowth] = useState(0);
  const [totalStudents, setTotalStudents] = useState(0);
  const [totalCourses, setTotalCourses] = useState(0);
  const [allPayments, setAllPayments] = useState<PaymentData[]>([]);
  const [recentTransactions, setRecentTransactions] = useState<PaymentData[]>([]);
  const [availableFunds, setAvailableFunds] = useState(0);
  const [pendingFunds, setPendingFunds] = useState(0);
  const [cardPayments, setCardPayments] = useState(0);
  const [monthlyData, setMonthlyData] = useState<EarningsData[]>([
    { month: "Jan", earnings: 0, students: 0 },
    { month: "Fév", earnings: 0, students: 0 },
    { month: "Mar", earnings: 0, students: 0 },
    { month: "Avr", earnings: 0, students: 0 },
    { month: "Mai", earnings: 0, students: 0 },
    { month: "Jui", earnings: 0, students: 0 },
    { month: "Jul", earnings: 0, students: 0 },
    { month: "Aoû", earnings: 0, students: 0 },
    { month: "Sep", earnings: 0, students: 0 },
    { month: "Oct", earnings: 0, students: 0 },
    { month: "Nov", earnings: 0, students: 0 },
    { month: "Déc", earnings: 0, students: 0 },
  ]);
  const [courseEarnings, setCourseEarnings] = useState<any[]>([]);

  // Filtres
  const [showFilters, setShowFilters] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [selectedCourse, setSelectedCourse] = useState<string>("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [courses, setCourses] = useState<{ id: string; title: string }[]>([]);
  const [showAllPayments, setShowAllPayments] = useState(false);

  useEffect(() => {
    loadEarningsData();
  }, [currentUser]);

  const loadEarningsData = async () => {
    if (!currentUser) return;

    try {
      setLoading(true);

      // Load teacher's courses
      const coursesQuery = query(
        collection(db, "courses"),
        where("instructorId", "==", currentUser.uid)
      );
      const coursesSnapshot = await getDocs(coursesQuery);
      setTotalCourses(coursesSnapshot.size);

      // Store courses for filter
      const coursesData = coursesSnapshot.docs.map(doc => ({
        id: doc.id,
        title: doc.data().title,
      }));
      setCourses(coursesData);

      // Load payments made to this teacher
      const paymentsQuery = query(
        collection(db, "payments"),
        where("instructorId", "==", currentUser.uid),
        where("status", "==", "completed")
      );
      const paymentsSnapshot = await getDocs(paymentsQuery);
      
      // Calculate total earnings and student count
      let total = 0;
      let monthlyTotal = 0;
      let available = 0;
      let pending = 0;
      let cardPaymentsTotal = 0;
      const studentIds = new Set<string>();
      const currentMonth = new Date().getMonth();
      const currentYear = new Date().getFullYear();
      
      // Initialize monthly data
      const monthlyEarningsMap = new Map<number, { earnings: number; students: Set<string> }>();
      for (let i = 0; i < 12; i++) {
        monthlyEarningsMap.set(i, { earnings: 0, students: new Set() });
      }

      // Initialize course earnings map
      const courseEarningsMap = new Map<string, number>();
      
      // Store all payments
      const payments: PaymentData[] = [];

      paymentsSnapshot.forEach((doc) => {
        const payment = doc.data();
        const instructorAmount = payment.instructorAmount || payment.basePrice || 0;
        
        // Store payment
        payments.push({
          id: doc.id,
          studentName: payment.studentName,
          courseName: payment.courseName,
          basePrice: payment.basePrice,
          instructorAmount: instructorAmount,
          createdAt: payment.createdAt,
          status: payment.status,
          transferStatus: payment.transferStatus,
          paymentMethod: payment.paymentMethod,
          courseId: payment.courseId,
          studentId: payment.studentId,
        });

        // Instructor receives basePrice (the platform keeps the fee)
        total += instructorAmount;
        studentIds.add(payment.studentId);

        // Card payments
        if (payment.paymentMethod === "card") {
          cardPaymentsTotal += instructorAmount;
        }

        // Available vs pending based on transfer status
        if (payment.transferStatus === "completed") {
          available += instructorAmount;
        } else {
          pending += instructorAmount;
        }

        // Monthly data
        const createdAt = payment.createdAt?.toDate();
        if (createdAt && createdAt.getFullYear() === currentYear) {
          const month = createdAt.getMonth();
          const monthData = monthlyEarningsMap.get(month);
          if (monthData) {
            monthData.earnings += instructorAmount;
            monthData.students.add(payment.studentId);
          }

          // Current month earnings
          if (month === currentMonth) {
            monthlyTotal += instructorAmount;
          }
        }

        // Course earnings
        const courseName = payment.courseName;
        const currentEarnings = courseEarningsMap.get(courseName) || 0;
        courseEarningsMap.set(courseName, currentEarnings + instructorAmount);
      });

      setAllPayments(payments);
      setTotalEarnings(total);
      setMonthlyEarnings(monthlyTotal);
      setTotalStudents(studentIds.size);
      setAvailableFunds(available);
      setPendingFunds(pending);
      setCardPayments(cardPaymentsTotal);

      // Update monthly data for charts
      const updatedMonthlyData = monthlyData.map((item, index) => {
        const data = monthlyEarningsMap.get(index);
        return {
          ...item,
          earnings: data?.earnings || 0,
          students: data?.students.size || 0,
        };
      });
      setMonthlyData(updatedMonthlyData);

      // Update course earnings for pie chart
      const topCourses = Array.from(courseEarningsMap.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([name, value], index) => ({
          name: name,
          value: value,
          color: COLORS[index % COLORS.length],
        }));
      
      setCourseEarnings(topCourses);
      
      // Calculate monthly growth (simplified - compare with previous month)
      const currentMonthEarnings = paymentsSnapshot.docs
        .filter(doc => {
          const createdAt = doc.data().createdAt?.toDate();
          return createdAt && createdAt.getMonth() === currentMonth && createdAt.getFullYear() === currentYear;
        })
        .reduce((sum, doc) => sum + (doc.data().instructorAmount || doc.data().basePrice || 0), 0);
      
      const previousMonth = (currentMonth - 1 + 12) % 12;
      const previousMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear;
      const previousMonthEarnings = paymentsSnapshot.docs
        .filter(doc => {
          const createdAt = doc.data().createdAt?.toDate();
          return createdAt && createdAt.getMonth() === previousMonth && createdAt.getFullYear() === previousMonthYear;
        })
        .reduce((sum, doc) => sum + (doc.data().instructorAmount || doc.data().basePrice || 0), 0);
      
      if (previousMonthEarnings > 0) {
        const growth = ((currentMonthEarnings - previousMonthEarnings) / previousMonthEarnings) * 100;
        setMonthlyGrowth(Math.round(growth));
      } else if (currentMonthEarnings > 0) {
        setMonthlyGrowth(100);
      } else {
        setMonthlyGrowth(0);
      }

      // Set recent transactions (first 5)
      const sortedPayments = [...payments].sort((a, b) => {
        const dateA = a.createdAt?.toDate?.() || new Date(a.createdAt || 0);
        const dateB = b.createdAt?.toDate?.() || new Date(b.createdAt || 0);
        return dateB.getTime() - dateA.getTime();
      });
      setRecentTransactions(sortedPayments.slice(0, 5));
    } catch (error) {
      console.error("Error loading earnings data:", error);
      toast.error("Erreur lors du chargement des données");
    } finally {
      setLoading(false);
    }
  };

  // Filtrer les paiements
  const getFilteredPayments = () => {
    return allPayments.filter(payment => {
      // Recherche
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesSearch = 
          payment.studentName?.toLowerCase().includes(query) ||
          payment.courseName?.toLowerCase().includes(query);
        if (!matchesSearch) return false;
      }

      // Statut
      if (selectedStatus !== "all") {
        if (selectedStatus === "completed" && payment.transferStatus !== "completed") return false;
        if (selectedStatus === "pending" && payment.transferStatus === "completed") return false;
      }

      // Cours
      if (selectedCourse !== "all") {
        if (payment.courseId !== selectedCourse) return false;
      }

      // Date from
      if (dateFrom) {
        const paymentDate = payment.createdAt?.toDate?.() || new Date(payment.createdAt);
        const fromDate = new Date(dateFrom);
        if (paymentDate < fromDate) return false;
      }

      // Date to
      if (dateTo) {
        const paymentDate = payment.createdAt?.toDate?.() || new Date(payment.createdAt);
        const toDate = new Date(dateTo);
        toDate.setHours(23, 59, 59, 999);
        if (paymentDate > toDate) return false;
      }

      return true;
    });
  };

  const filteredPayments = getFilteredPayments();

  // Calculer les stats pour les paiements filtrés
  const filteredStats = {
    total: filteredPayments.reduce((sum, p) => sum + p.instructorAmount, 0),
    count: filteredPayments.length,
    students: new Set(filteredPayments.map(p => p.studentId)).size,
  };

  // Reset filters
  const resetFilters = () => {
    setSearchQuery("");
    setSelectedStatus("all");
    setSelectedCourse("all");
    setDateFrom("");
    setDateTo("");
    toast.success("Filtres réinitialisés");
  };

  // Export to PDF
  const exportToPDF = async () => {
    try {
      setExporting(true);
      toast.info("Génération du PDF en cours...");

      const paymentsToExport = filteredPayments.length > 0 ? filteredPayments : allPayments;

      if (paymentsToExport.length === 0) {
        toast.error("Aucun paiement à exporter");
        return;
      }

      // Dynamically import jsPDF and autotable
      const jsPDFModule = await import("jspdf");
      const jsPDF = jsPDFModule.default;
      
      const autoTableModule = await import("jspdf-autotable");
      const autoTable = autoTableModule.default;

      const doc = new jsPDF();
      const now = new Date();
      
      // Title
      doc.setFontSize(20);
      doc.setTextColor(37, 99, 235);
      doc.text("Rapport de Revenus - EduConnect", 14, 20);
      
      // Generation date
      doc.setFontSize(10);
      doc.setTextColor(100, 100, 100);
      doc.text(`Généré le: ${now.toLocaleDateString("fr-FR")} à ${now.toLocaleTimeString("fr-FR")}`, 14, 28);
      
      // Filters applied
      if (searchQuery || selectedStatus !== "all" || selectedCourse !== "all" || dateFrom || dateTo) {
        doc.setFontSize(9);
        doc.setTextColor(200, 100, 100);
        let filterText = "Filtres appliqués: ";
        const filters = [];
        if (searchQuery) filters.push(`Recherche: "${searchQuery}"`);
        if (selectedStatus !== "all") filters.push(`Statut: ${selectedStatus}`);
        if (selectedCourse !== "all") {
          const course = courses.find(c => c.id === selectedCourse);
          filters.push(`Cours: ${course?.title || selectedCourse}`);
        }
        if (dateFrom) filters.push(`Du: ${new Date(dateFrom).toLocaleDateString("fr-FR")}`);
        if (dateTo) filters.push(`Au: ${new Date(dateTo).toLocaleDateString("fr-FR")}`);
        filterText += filters.join(" • ");
        doc.text(filterText, 14, 34);
      }
      
      // Summary section
      doc.setFontSize(14);
      doc.setTextColor(0, 0, 0);
      doc.text("Résumé des Revenus", 14, 45);
      
      doc.setFontSize(10);
      let yPos = 53;
      
      const summaryData = [
        ["Revenus totaux:", `$${totalEarnings.toFixed(2)}`],
        ["Revenus filtrés:", `$${filteredStats.total.toFixed(2)}`],
        ["Revenus ce mois-ci:", `$${monthlyEarnings.toFixed(2)}`],
        ["Fonds disponibles:", `$${availableFunds.toFixed(2)}`],
        ["Fonds en attente:", `$${pendingFunds.toFixed(2)}`],
        ["Croissance mensuelle:", `${monthlyGrowth >= 0 ? '+' : ''}${monthlyGrowth.toFixed(1)}%`],
        ["", ""],
        ["Total de cours:", `${totalCourses}`],
        ["Étudiants actifs:", `${totalStudents}`],
        ["Étudiants filtrés:", `${filteredStats.students}`],
        ["Paiements totaux:", `${allPayments.length}`],
        ["Paiements filtrés:", `${filteredStats.count}`],
      ];
      
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
      
      // Sort payments by date (most recent first)
      const sortedPayments = [...paymentsToExport].sort((a, b) => {
        try {
          const dateA = a.createdAt?.toDate?.() || new Date(a.createdAt || Date.now());
          const dateB = b.createdAt?.toDate?.() || new Date(b.createdAt || Date.now());
          return dateB.getTime() - dateA.getTime();
        } catch (error) {
          return 0;
        }
      });
      
      // Prepare table rows
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
            studentName.substring(0, 25),
            courseName.substring(0, 25) + (courseName.length > 25 ? '...' : ''),
            `$${basePrice.toFixed(2)}`,
            `$${instructorAmount.toFixed(2)}`,
            transferStatus
          ];
        } catch (error) {
          return ["N/A", "Erreur", "Erreur", "$0.00", "$0.00", "N/A"];
        }
      });
      
      autoTable(doc, {
        head: [["Date", "Étudiant", "Cours", "Prix", "Revenu", "Statut"]],
        body: tableRows,
        startY: yPos,
        theme: "grid",
        styles: {
          fontSize: 8,
          cellPadding: 2,
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
          1: { cellWidth: 30 },
          2: { cellWidth: 45 },
          3: { cellWidth: 22, halign: 'right' },
          4: { cellWidth: 22, halign: 'right', fontStyle: 'bold', textColor: [34, 197, 94] },
          5: { cellWidth: 30, halign: 'center' },
        },
      });
      
      // Footer with totals
      yPos = (doc as any).lastAutoTable.finalY + 10;
      
      if (yPos > 250) {
        doc.addPage();
        yPos = 20;
      }
      
      doc.setFillColor(240, 240, 240);
      doc.rect(14, yPos, 182, 25, 'F');
      
      doc.setFontSize(11);
      doc.setTextColor(0, 0, 0);
      doc.setFont(undefined, 'bold');
      doc.text(`Total des paiements exportés: ${paymentsToExport.length}`, 20, yPos + 8);
      doc.text(`Revenu total: $${filteredStats.total.toFixed(2)}`, 20, yPos + 16);
      
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
      
      // Generate filename
      const fileName = `EduConnect_Revenus_${now.toISOString().split('T')[0]}.pdf`;
      doc.save(fileName);
      
      toast.success(`✅ Rapport PDF généré avec succès ! ${paymentsToExport.length} paiements exportés.`);
    } catch (error) {
      console.error("Error exporting PDF:", error);
      const errorMessage = error instanceof Error ? error.message : "Erreur inconnue";
      toast.error(`❌ Erreur lors de l'export du PDF: ${errorMessage}`);
    } finally {
      setExporting(false);
    }
  };

  // Show loading spinner until data is loaded
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="w-16 h-16 border-4 border-blue-600 dark:border-blue-400 border-t-transparent rounded-full mb-4"
        />
        <p className="text-gray-600 dark:text-gray-400">Chargement des statistiques...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-8">
      {/* Professional Header with Gradient */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 dark:from-blue-900 dark:via-indigo-900 dark:to-slate-900 p-8 shadow-2xl"
      >
        <div className="absolute inset-0 bg-grid-white/10 [mask-image:linear-gradient(0deg,transparent,black)]" />
        <div className="relative">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div>
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 }}
                className="flex items-center gap-3 mb-3"
              >
                <div className="p-3 bg-white/20 backdrop-blur-sm rounded-xl">
                  <Activity className="w-8 h-8 text-white" />
                </div>
                <div>
                  <h1 className="text-white text-3xl md:text-4xl">Statistiques de Revenus</h1>
                  <p className="text-blue-100 mt-1 text-sm md:text-base">
                    Suivez vos performances et revenus en temps réel
                  </p>
                </div>
              </motion.div>
              
              {/* Quick Stats in Header */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="flex flex-wrap gap-6 mt-4"
              >
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                  <span className="text-white/90 text-sm">{allPayments.length} paiements</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse" />
                  <span className="text-white/90 text-sm">{totalStudents} étudiants</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-purple-400 rounded-full animate-pulse" />
                  <span className="text-white/90 text-sm">{totalCourses} cours</span>
                </div>
              </motion.div>
            </div>

            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="flex flex-wrap items-center gap-3"
            >
              <Button 
                variant="outline"
                className={`gap-2 border-2 ${showFilters ? 'bg-white text-blue-600 border-white' : 'bg-white/10 text-white border-white/30 hover:bg-white/20'} backdrop-blur-sm transition-all`}
                onClick={() => setShowFilters(!showFilters)}
              >
                <Filter className="w-4 h-4" />
                Filtres
                {(searchQuery || selectedStatus !== "all" || selectedCourse !== "all" || dateFrom || dateTo) && (
                  <Badge className="ml-1 bg-red-500 text-white text-xs px-1.5 py-0 border-0">
                    {[searchQuery, selectedStatus !== "all", selectedCourse !== "all", dateFrom, dateTo].filter(Boolean).length}
                  </Badge>
                )}
              </Button>
              <Button 
                className="gap-2 bg-white text-blue-600 hover:bg-blue-50 shadow-lg transition-all"
                onClick={exportToPDF}
                disabled={exporting}
              >
                {exporting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Download className="w-4 h-4" />
                )}
                {exporting ? "Export..." : "Exporter PDF"}
              </Button>
            </motion.div>
          </div>
        </div>
      </motion.div>

      {/* Filters Panel - Professional Design */}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
          >
            <Card className="p-6 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 shadow-xl">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                    <Filter className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <h3 className="text-gray-900 dark:text-white font-semibold">Filtres de recherche</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Affinez vos résultats</p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={resetFilters}
                  className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/30"
                >
                  <X className="w-4 h-4 mr-1" />
                  Réinitialiser
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                {/* Search */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500" />
                  <Input
                    placeholder="Rechercher..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 bg-gray-50 dark:bg-slate-900 border-gray-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
                  />
                </div>

                {/* Status Filter */}
                <div className="relative">
                  <select
                    value={selectedStatus}
                    onChange={(e) => setSelectedStatus(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 dark:border-slate-700 rounded-md appearance-none bg-gray-50 dark:bg-slate-900 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:outline-none"
                  >
                    <option value="all">Tous les statuts</option>
                    <option value="completed">Transféré</option>
                    <option value="pending">En attente</option>
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500 pointer-events-none" />
                </div>

                {/* Course Filter */}
                <div className="relative">
                  <select
                    value={selectedCourse}
                    onChange={(e) => setSelectedCourse(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 dark:border-slate-700 rounded-md appearance-none bg-gray-50 dark:bg-slate-900 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:outline-none"
                  >
                    <option value="all">Tous les cours</option>
                    {courses.map(course => (
                      <option key={course.id} value={course.id}>
                        {course.title}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500 pointer-events-none" />
                </div>

                {/* Date From */}
                <Input
                  type="date"
                  placeholder="Date de début"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="bg-gray-50 dark:bg-slate-900 border-gray-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
                />

                {/* Date To */}
                <Input
                  type="date"
                  placeholder="Date de fin"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="bg-gray-50 dark:bg-slate-900 border-gray-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
                />
              </div>

              {/* Filtered Results Summary */}
              {(searchQuery || selectedStatus !== "all" || selectedCourse !== "all" || dateFrom || dateTo) && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                      <CheckCircle2 className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                      <span>
                        <strong className="text-gray-900 dark:text-white">{filteredStats.count}</strong> paiement(s) •{" "}
                        <strong className="text-gray-900 dark:text-white">{filteredStats.students}</strong> étudiant(s) •{" "}
                        <strong className="text-green-600 dark:text-green-400">${filteredStats.total.toFixed(2)}</strong>
                      </span>
                    </div>
                  </div>
                </motion.div>
              )}
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Earnings Cards - Professional Hero Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="relative overflow-hidden p-8 bg-gradient-to-br from-emerald-50 via-green-50 to-teal-50 dark:from-emerald-950 dark:via-green-950 dark:to-teal-950 border-emerald-200 dark:border-emerald-800 shadow-xl hover:shadow-2xl transition-all duration-300">
            <div className="absolute -top-10 -right-10 w-40 h-40 bg-emerald-500/10 dark:bg-emerald-500/5 rounded-full blur-3xl" />
            <div className="relative">
              <div className="flex items-start justify-between mb-6">
                <div>
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-3 bg-emerald-500 rounded-xl shadow-lg">
                      <Wallet className="w-6 h-6 text-white" />
                    </div>
                    <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300 border-0">
                      <CheckCircle2 className="w-3 h-3 mr-1" />
                      Disponible
                    </Badge>
                  </div>
                  <h3 className="text-gray-600 dark:text-gray-400 mb-1">Fonds disponibles</h3>
                  <p className="text-4xl font-bold text-emerald-900 dark:text-emerald-100 mb-2">
                    ${availableFunds.toFixed(2)}
                  </p>
                  <p className="text-sm text-emerald-700 dark:text-emerald-300 flex items-center gap-2">
                    <Zap className="w-4 h-4" />
                    Prêt à être retiré
                  </p>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">Disponibilité</span>
                  <span className="font-semibold text-emerald-700 dark:text-emerald-300">
                    {totalEarnings > 0 ? ((availableFunds / totalEarnings) * 100).toFixed(0) : 0}%
                  </span>
                </div>
                <Progress 
                  value={totalEarnings > 0 ? (availableFunds / totalEarnings) * 100 : 0} 
                  className="h-2.5 bg-emerald-200 dark:bg-emerald-900"
                />
              </div>
            </div>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="relative overflow-hidden p-8 bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50 dark:from-amber-950 dark:via-orange-950 dark:to-yellow-950 border-amber-200 dark:border-amber-800 shadow-xl hover:shadow-2xl transition-all duration-300">
            <div className="absolute -top-10 -right-10 w-40 h-40 bg-amber-500/10 dark:bg-amber-500/5 rounded-full blur-3xl" />
            <div className="relative">
              <div className="flex items-start justify-between mb-6">
                <div>
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-3 bg-amber-500 rounded-xl shadow-lg">
                      <Clock className="w-6 h-6 text-white" />
                    </div>
                    <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300 border-0">
                      <Activity className="w-3 h-3 mr-1 animate-pulse" />
                      En cours
                    </Badge>
                  </div>
                  <h3 className="text-gray-600 dark:text-gray-400 mb-1">Fonds en attente</h3>
                  <p className="text-4xl font-bold text-amber-900 dark:text-amber-100 mb-2">
                    ${pendingFunds.toFixed(2)}
                  </p>
                  <p className="text-sm text-amber-700 dark:text-amber-300 flex items-center gap-2">
                    <Target className="w-4 h-4" />
                    Transfert en cours
                  </p>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">En traitement</span>
                  <span className="font-semibold text-amber-700 dark:text-amber-300">
                    {totalEarnings > 0 ? ((pendingFunds / totalEarnings) * 100).toFixed(0) : 0}%
                  </span>
                </div>
                <Progress 
                  value={totalEarnings > 0 ? (pendingFunds / totalEarnings) * 100 : 0} 
                  className="h-2.5 bg-amber-200 dark:bg-amber-900"
                />
              </div>
            </div>
          </Card>
        </motion.div>
      </div>

      {/* Key Metrics - Professional Dashboard Style */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="p-6 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:shadow-xl transition-all duration-300 group">
            <div className="flex items-start justify-between mb-4">
              <div className="p-3 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl shadow-lg group-hover:scale-110 transition-transform">
                <DollarSign className="w-6 h-6 text-white" />
              </div>
              <Badge className={`${monthlyGrowth >= 0 ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300' : 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300'} border-0`}>
                {monthlyGrowth >= 0 ? <ArrowUpRight className="w-3 h-3 mr-1" /> : <ArrowDownRight className="w-3 h-3 mr-1" />}
                {Math.abs(monthlyGrowth)}%
              </Badge>
            </div>
            <h3 className="text-gray-600 dark:text-gray-400 text-sm mb-2">Revenus totaux</h3>
            <p className="text-3xl font-bold text-gray-900 dark:text-white mb-1">
              ${totalEarnings.toFixed(2)}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
              <Award className="w-3 h-3" />
              Tous les temps
            </p>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="p-6 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:shadow-xl transition-all duration-300 group">
            <div className="flex items-start justify-between mb-4">
              <div className="p-3 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl shadow-lg group-hover:scale-110 transition-transform">
                <Calendar className="w-6 h-6 text-white" />
              </div>
              {monthlyGrowth !== 0 && (
                <Badge className={`${monthlyGrowth > 0 ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300' : 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300'} border-0`}>
                  {monthlyGrowth > 0 ? <ArrowUpRight className="w-3 h-3 mr-1" /> : <ArrowDownRight className="w-3 h-3 mr-1" />}
                  {monthlyGrowth > 0 ? '+' : ''}{monthlyGrowth}%
                </Badge>
              )}
            </div>
            <h3 className="text-gray-600 dark:text-gray-400 text-sm mb-2">Ce mois-ci</h3>
            <p className="text-3xl font-bold text-gray-900 dark:text-white mb-1">
              ${monthlyEarnings.toFixed(2)}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {new Date().toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}
            </p>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card className="p-6 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:shadow-xl transition-all duration-300 group">
            <div className="flex items-start justify-between mb-4">
              <div className="p-3 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl shadow-lg group-hover:scale-110 transition-transform">
                <Users className="w-6 h-6 text-white" />
              </div>
            </div>
            <h3 className="text-gray-600 dark:text-gray-400 text-sm mb-2">Étudiants payants</h3>
            <p className="text-3xl font-bold text-gray-900 dark:text-white mb-1">
              {totalStudents}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
              <TrendingUp className="w-3 h-3" />
              Total actifs
            </p>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card className="p-6 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:shadow-xl transition-all duration-300 group">
            <div className="flex items-start justify-between mb-4">
              <div className="p-3 bg-gradient-to-br from-orange-500 to-red-600 rounded-xl shadow-lg group-hover:scale-110 transition-transform">
                <BookOpen className="w-6 h-6 text-white" />
              </div>
            </div>
            <h3 className="text-gray-600 dark:text-gray-400 text-sm mb-2">Cours actifs</h3>
            <p className="text-3xl font-bold text-gray-900 dark:text-white mb-1">
              {totalCourses}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
              <FileText className="w-3 h-3" />
              Cours publiés
            </p>
          </Card>
        </motion.div>
      </div>

      {/* Charts Section - Professional Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Earnings Timeline with Area Chart */}
        <Card className="p-6 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 shadow-xl">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-gray-900 dark:text-white font-semibold flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                Évolution des revenus
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Performance mensuelle de l'année
              </p>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={monthlyData}>
              <defs>
                <linearGradient id="colorEarnings" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" className="dark:stroke-slate-700" />
              <XAxis dataKey="month" stroke="#6B7280" className="dark:stroke-slate-400" />
              <YAxis stroke="#6B7280" className="dark:stroke-slate-400" />
              <Tooltip
                contentStyle={{
                  backgroundColor: "rgb(15 23 42)",
                  border: "1px solid rgb(51 65 85)",
                  borderRadius: "8px",
                  color: "white",
                }}
              />
              <Area
                type="monotone"
                dataKey="earnings"
                stroke="#3B82F6"
                strokeWidth={3}
                fill="url(#colorEarnings)"
                name="Revenus ($)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </Card>

        {/* Students Growth */}
        <Card className="p-6 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 shadow-xl">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-gray-900 dark:text-white font-semibold flex items-center gap-2">
                <Users className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                Croissance des étudiants
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Nouveaux étudiants par mois
              </p>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" className="dark:stroke-slate-700" />
              <XAxis dataKey="month" stroke="#6B7280" className="dark:stroke-slate-400" />
              <YAxis stroke="#6B7280" className="dark:stroke-slate-400" />
              <Tooltip
                contentStyle={{
                  backgroundColor: "rgb(15 23 42)",
                  border: "1px solid rgb(51 65 85)",
                  borderRadius: "8px",
                  color: "white",
                }}
              />
              <Bar
                dataKey="students"
                fill="#8B5CF6"
                radius={[8, 8, 0, 0]}
                name="Étudiants"
              />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* Course Performance - Professional Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue by Course */}
        <Card className="p-6 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 shadow-xl">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-gray-900 dark:text-white font-semibold flex items-center gap-2">
                <PieChart className="w-5 h-5 text-green-600 dark:text-green-400" />
                Revenus par cours
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Top 5 des cours les plus rentables
              </p>
            </div>
          </div>
          {courseEarnings.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <RePieChart>
                <Pie
                  data={courseEarnings}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={(entry) => `${entry.name.substring(0, 12)}${entry.name.length > 12 ? '...' : ''}`}
                  outerRadius={90}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {courseEarnings.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(value: number) => `$${value.toFixed(2)}`}
                  contentStyle={{
                    backgroundColor: "rgb(15 23 42)",
                    border: "1px solid rgb(51 65 85)",
                    borderRadius: "8px",
                    color: "white",
                  }}
                />
              </RePieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[300px] text-gray-400 dark:text-gray-600">
              <div className="text-center">
                <PieChart className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>Aucune donnée disponible</p>
              </div>
            </div>
          )}
        </Card>

        {/* Top Courses List */}
        <Card className="p-6 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 shadow-xl">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-gray-900 dark:text-white font-semibold flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-green-600 dark:text-green-400" />
                Meilleurs cours
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Classement par revenus générés
              </p>
            </div>
          </div>
          {courseEarnings.length > 0 ? (
            <div className="space-y-4">
              {courseEarnings.map((course, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div 
                        className="flex items-center justify-center w-10 h-10 rounded-xl shadow-lg font-bold text-white text-sm"
                        style={{ backgroundColor: course.color }}
                      >
                        #{index + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-gray-900 dark:text-white font-medium truncate">
                          {course.name}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {courseEarnings.length > 0 ? ((course.value / courseEarnings[0].value) * 100).toFixed(0) : 0}% du top
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-gray-900 dark:text-white">
                        ${course.value.toFixed(2)}
                      </p>
                    </div>
                  </div>
                  <div className="relative h-2 bg-gray-200 dark:bg-slate-700 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${courseEarnings.length > 0 ? (course.value / courseEarnings[0].value) * 100 : 0}%` }}
                      transition={{ duration: 1, delay: index * 0.1 }}
                      className="absolute top-0 left-0 h-full rounded-full"
                      style={{ backgroundColor: course.color }}
                    />
                  </div>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="flex items-center justify-center h-[250px] text-gray-400 dark:text-gray-600">
              <div className="text-center">
                <TrendingUp className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>Aucun cours avec revenus</p>
              </div>
            </div>
          )}
        </Card>
      </div>

      {/* Payment Methods - Professional Cards */}
      <Card className="p-6 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 shadow-xl">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-gray-900 dark:text-white font-semibold flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              Méthodes de paiement
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Répartition par type de paiement
            </p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <motion.div 
            whileHover={{ y: -5 }}
            className="p-5 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950 dark:to-indigo-950 rounded-xl border-2 border-blue-200 dark:border-blue-800 shadow-md"
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-blue-500 rounded-lg">
                <CreditCard className="w-5 h-5 text-white" />
              </div>
              <span className="text-sm text-gray-900 dark:text-white font-semibold">Carte de crédit</span>
            </div>
            <p className="text-3xl font-bold text-blue-900 dark:text-blue-100 mb-2">
              ${cardPayments.toFixed(2)}
            </p>
            <div className="flex items-center justify-between text-sm">
              <span className="text-blue-700 dark:text-blue-300">
                {totalEarnings > 0 ? ((cardPayments / totalEarnings) * 100).toFixed(0) : 0}% du total
              </span>
            </div>
            <Progress 
              value={totalEarnings > 0 ? (cardPayments / totalEarnings) * 100 : 0} 
              className="mt-3 h-2 bg-blue-200 dark:bg-blue-900"
            />
          </motion.div>

          <motion.div 
            whileHover={{ y: -5 }}
            className="p-5 bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950 dark:to-pink-950 rounded-xl border-2 border-purple-200 dark:border-purple-800 shadow-md"
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-purple-500 rounded-lg">
                <DollarSign className="w-5 h-5 text-white" />
              </div>
              <span className="text-sm text-gray-900 dark:text-white font-semibold">Virement bancaire</span>
            </div>
            <p className="text-3xl font-bold text-purple-900 dark:text-purple-100 mb-2">
              $0.00
            </p>
            <div className="flex items-center justify-between text-sm">
              <span className="text-purple-700 dark:text-purple-300">0% du total</span>
            </div>
            <Progress 
              value={0} 
              className="mt-3 h-2 bg-purple-200 dark:bg-purple-900"
            />
          </motion.div>

          <motion.div 
            whileHover={{ y: -5 }}
            className="p-5 bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950 dark:to-orange-950 rounded-xl border-2 border-amber-200 dark:border-amber-800 shadow-md"
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-amber-500 rounded-lg">
                <Clock className="w-5 h-5 text-white" />
              </div>
              <span className="text-sm text-gray-900 dark:text-white font-semibold">En attente</span>
            </div>
            <p className="text-3xl font-bold text-amber-900 dark:text-amber-100 mb-2">
              ${pendingFunds.toFixed(2)}
            </p>
            <div className="flex items-center justify-between text-sm">
              <span className="text-amber-700 dark:text-amber-300">
                {totalEarnings > 0 ? ((pendingFunds / totalEarnings) * 100).toFixed(0) : 0}% du total
              </span>
            </div>
            <Progress 
              value={totalEarnings > 0 ? (pendingFunds / totalEarnings) * 100 : 0} 
              className="mt-3 h-2 bg-amber-200 dark:bg-amber-900"
            />
          </motion.div>
        </div>
      </Card>

      {/* Recent Transactions - Professional Table */}
      <Card className="p-6 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 shadow-xl">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-gray-900 dark:text-white font-semibold flex items-center gap-2">
              <Receipt className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              Transactions récentes
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Dernières activités sur votre compte
            </p>
          </div>
          <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300 border-0">
            {recentTransactions.length} transactions
          </Badge>
        </div>
        {recentTransactions.length > 0 ? (
          <div className="space-y-3">
            {recentTransactions.map((transaction, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className="flex items-center justify-between p-4 bg-gray-50 dark:bg-slate-900 rounded-xl hover:bg-gray-100 dark:hover:bg-slate-900/70 transition-all duration-200 border border-gray-200 dark:border-slate-700"
              >
                <div className="flex items-center gap-4">
                  <div 
                    className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center text-white font-bold shadow-lg"
                  >
                    {transaction.studentName?.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">
                      {transaction.studentName}
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {transaction.courseName}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-500 mt-0.5 flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {transaction.createdAt?.toDate?.()?.toLocaleDateString("fr-FR") || "Date inconnue"}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-green-600 dark:text-green-400 mb-1">
                    ${(transaction.instructorAmount || transaction.basePrice || 0).toFixed(2)}
                  </p>
                  <Badge className={`text-xs ${transaction.transferStatus === "completed" ? "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300" : "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300"} border-0`}>
                    {transaction.transferStatus === "completed" ? (
                      <>
                        <CheckCircle2 className="w-3 h-3 mr-1" />
                        Transféré
                      </>
                    ) : (
                      <>
                        <Clock className="w-3 h-3 mr-1" />
                        En attente
                      </>
                    )}
                  </Badge>
                </div>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 text-gray-400 dark:text-gray-600">
            <Receipt className="w-16 h-16 mx-auto mb-3 opacity-50" />
            <p>Aucune transaction récente</p>
          </div>
        )}
      </Card>

      {/* All Payments Table - Professional Data Table */}
      {filteredPayments.length > 0 && (
        <Card className="p-6 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 shadow-xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-3">
            <div className="min-w-0 flex-1">
              <h3 className="text-gray-900 dark:text-white font-semibold flex items-center gap-2 text-sm sm:text-base">
                <FileText className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                <span className="truncate">Historique complet</span>
              </h3>
              <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mt-1 truncate">
                {filteredPayments.length} paiement(s) • ${filteredStats.total.toFixed(2)}
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowAllPayments(!showAllPayments)}
              className="border-blue-200 text-blue-600 hover:bg-blue-50 dark:border-blue-800 dark:text-blue-400 dark:hover:bg-blue-900/30"
            >
              <Eye className="w-4 h-4 mr-1 sm:mr-2" />
              <span className="hidden sm:inline">{showAllPayments ? "Voir moins" : "Voir tout"}</span>
              <span className="sm:hidden">{showAllPayments ? "Moins" : "Tout"}</span>
            </Button>
          </div>
          <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-slate-700">
            <table className="w-full min-w-[640px]">
              <thead className="bg-gray-50 dark:bg-slate-900">
                <tr>
                  <th className="text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider py-3 px-2 sm:px-4">Date</th>
                  <th className="text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider py-3 px-2 sm:px-4">Étudiant</th>
                  <th className="text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider py-3 px-2 sm:px-4 hidden md:table-cell">Cours</th>
                  <th className="text-right text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider py-3 px-2 sm:px-4 hidden sm:table-cell">Prix</th>
                  <th className="text-right text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider py-3 px-2 sm:px-4">Revenu</th>
                  <th className="text-center text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider py-3 px-2 sm:px-4">Statut</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
                {(showAllPayments ? filteredPayments : filteredPayments.slice(0, 20)).map((payment, index) => (
                  <motion.tr
                    key={index}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: index * 0.02 }}
                    className="hover:bg-gray-50 dark:hover:bg-slate-900/50 transition-colors"
                  >
                    <td className="py-3 sm:py-4 px-2 sm:px-4 text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                      {payment.createdAt?.toDate?.()?.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" }) || "N/A"}
                    </td>
                    <td className="py-3 sm:py-4 px-2 sm:px-4 text-xs sm:text-sm text-gray-900 dark:text-white font-medium truncate max-w-[120px]">
                      {payment.studentName}
                    </td>
                    <td className="py-3 sm:py-4 px-2 sm:px-4 text-xs sm:text-sm text-gray-600 dark:text-gray-400 hidden md:table-cell truncate max-w-[150px]">
                      {payment.courseName}
                    </td>
                    <td className="py-3 sm:py-4 px-2 sm:px-4 text-xs sm:text-sm text-gray-900 dark:text-white text-right font-medium hidden sm:table-cell">
                      ${payment.basePrice.toFixed(2)}
                    </td>
                    <td className="py-3 sm:py-4 px-2 sm:px-4 text-xs sm:text-sm font-bold text-green-600 dark:text-green-400 text-right">
                      ${payment.instructorAmount.toFixed(2)}
                    </td>
                    <td className="py-3 sm:py-4 px-2 sm:px-4 text-center">
                      <Badge className={`text-[10px] sm:text-xs px-1.5 sm:px-2 ${payment.transferStatus === "completed" ? "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300" : "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300"} border-0`}>
                        {payment.transferStatus === "completed" ? "OK" : "Att."}
                      </Badge>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
            {!showAllPayments && filteredPayments.length > 20 && (
              <div className="bg-gray-50 dark:bg-slate-900 py-3 px-4 text-center text-xs sm:text-sm text-gray-600 dark:text-gray-400 border-t border-gray-200 dark:border-slate-700">
                Affichage de 20 sur {filteredPayments.length} paiements
              </div>
            )}
            {showAllPayments && (
              <div className="bg-gray-50 dark:bg-slate-900 py-3 px-4 text-center text-xs sm:text-sm text-gray-600 dark:text-gray-400 border-t border-gray-200 dark:border-slate-700">
                Affichage de {filteredPayments.length} paiement(s)
              </div>
            )}
          </div>
        </Card>
      )}
    </div>
  );
}
