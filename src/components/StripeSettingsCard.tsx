import { useState, useEffect } from "react";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { CreditCard, ExternalLink, CheckCircle, AlertCircle } from "lucide-react";
import { createStripeConnectAccount, checkStripeAccountStatus } from "../services/stripe";
import { toast } from "sonner@2.0.3";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "../config/firebase";

interface StripeSettingsCardProps {
  userId: string;
  userEmail: string;
  userName: string;
  userRole: string;
}

export function StripeSettingsCard({ userId, userEmail, userName, userRole }: StripeSettingsCardProps) {
  const [stripeAccountId, setStripeAccountId] = useState<string | null>(null);
  const [stripeOnboardingComplete, setStripeOnboardingComplete] = useState(false);
  const [stripeSetupPending, setStripeSetupPending] = useState(false);
  const [setupStripeLoading, setSetupStripeLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [verifyingStripe, setVerifyingStripe] = useState(false);

  // Check if user is a teacher
  const isTeacher = userRole === "teacher" || userRole === "both";

  useEffect(() => {
    const loadStripeData = async () => {
      try {
        setLoading(true);
        const userDoc = await getDoc(doc(db, "users", userId));
        if (userDoc.exists()) {
          const data = userDoc.data();
          const accountId = data.stripe_account_id || null;
          setStripeAccountId(accountId);
          setStripeOnboardingComplete(data.stripe_onboarding_complete || false);
          setStripeSetupPending(data.stripe_setup_pending || false);

          // If account exists but stripe_payouts_enabled is not set, check and update it
          if (accountId && data.stripe_onboarding_complete && data.stripe_payouts_enabled === undefined) {
            console.log("Checking Stripe account status to update stripe_payouts_enabled...");
            try {
              const accountStatus = await checkStripeAccountStatus(accountId);
              if (accountStatus.details?.payouts_enabled !== undefined) {
                const userDocRef = doc(db, "users", userId);
                await updateDoc(userDocRef, {
                  stripe_payouts_enabled: accountStatus.details.payouts_enabled
                });
                console.log("Updated stripe_payouts_enabled to:", accountStatus.details.payouts_enabled);
                toast.success("Statut Stripe mis à jour");
              }
            } catch (error) {
              console.error("Error checking Stripe account status:", error);
            }
          }
        }
      } catch (error) {
        console.error("Error loading Stripe data:", error);
      } finally {
        setLoading(false);
      }
    };

    loadStripeData();
  }, [userId]);

  const handleSetupStripe = async () => {
    try {
      setSetupStripeLoading(true);
      toast.info("Configuration de votre compte Stripe...");

      const stripeResult = await createStripeConnectAccount({
        email: userEmail,
        name: userName,
        userId: userId,
      });

      if (stripeResult.success && stripeResult.accountId && stripeResult.onboardingUrl) {
        // Save Stripe account ID to Firestore
        const userDocRef = doc(db, "users", userId);
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

  const handleVerifyStripeConfiguration = async () => {
    if (!stripeAccountId) {
      toast.error("Aucun compte Stripe trouvé");
      return;
    }

    try {
      setVerifyingStripe(true);
      toast.info("Vérification de votre configuration Stripe...");

      // Check Stripe account status
      const accountStatus = await checkStripeAccountStatus(stripeAccountId);
      console.log("Stripe account verification:", accountStatus);

      if (accountStatus.error) {
        toast.error("Erreur lors de la vérification du compte Stripe");
        return;
      }

      // Check if the account is fully complete
      const isComplete = accountStatus.details?.details_submitted;
      
      if (isComplete) {
        // Account is complete - activate all flags
        const userDocRef = doc(db, "users", userId);
        await updateDoc(userDocRef, {
          stripe_onboarding_complete: true,
          stripe_charges_enabled: true,
          stripe_payouts_enabled: true,
          stripe_setup_pending: false,
        });

        // Update local state
        setStripeOnboardingComplete(true);
        setStripeSetupPending(false);

        toast.success("✅ Configuration Stripe vérifiée et activée! Vous pouvez maintenant créer des cours payants.");
        
        // Refresh page to update UI
        setTimeout(() => {
          window.location.reload();
        }, 1500);
      } else {
        // Account is not complete - redirect to Stripe to finish
        toast.warning("⚠️ Configuration incomplète. Redirection vers Stripe...");
        
        // Create a new onboarding link
        const stripeResult = await createStripeConnectAccount({
          email: userEmail,
          name: userName,
          userId: userId,
        });

        if (stripeResult.onboardingUrl) {
          setTimeout(() => {
            window.location.href = stripeResult.onboardingUrl!;
          }, 1500);
        } else {
          toast.error("Impossible de créer un lien de configuration Stripe");
        }
      }
    } catch (error) {
      console.error("Error verifying Stripe configuration:", error);
      toast.error("Erreur lors de la vérification de la configuration");
    } finally {
      setVerifyingStripe(false);
    }
  };

  if (!isTeacher) {
    return null;
  }

  if (loading) {
    return (
      <div className="border border-gray-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <div className="p-3 bg-gray-100 rounded-lg">
            <CreditCard className="w-6 h-6 text-gray-400" />
          </div>
          <div className="flex-1">
            <p className="text-gray-600">Chargement des informations Stripe...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`border rounded-lg p-4 ${
      stripeOnboardingComplete 
        ? "border-green-200 bg-green-50" 
        : "border-orange-200 bg-orange-50"
    }`}>
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-start gap-3">
          <div className={`p-3 rounded-lg ${
            stripeOnboardingComplete 
              ? "bg-green-100" 
              : "bg-orange-100"
          }`}>
            <CreditCard className={`w-6 h-6 ${
              stripeOnboardingComplete 
                ? "text-green-600" 
                : "text-orange-600"
            }`} />
          </div>
          <div>
            <h4 className={
              stripeOnboardingComplete 
                ? "text-green-900" 
                : "text-orange-900"
            }>
              Configuration Stripe Connect
            </h4>
            <p className={`text-sm mt-1 ${
              stripeOnboardingComplete 
                ? "text-green-700" 
                : "text-orange-700"
            }`}>
              {stripeOnboardingComplete 
                ? "Votre compte de paiement est configuré et prêt à recevoir des paiements" 
                : "Configurez votre compte pour recevoir des paiements de vos étudiants"}
            </p>
          </div>
        </div>
        {stripeOnboardingComplete ? (
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

      {!stripeOnboardingComplete && (
        <div className="space-y-3">
          <div className={`p-4 rounded-lg border ${
            stripeOnboardingComplete 
              ? "bg-green-100 border-green-200" 
              : "bg-blue-50 border-blue-200"
          }`}>
            <p className={`text-sm ${
              stripeOnboardingComplete 
                ? "text-green-900" 
                : "text-blue-900"
            }`}>
              <strong>Pourquoi Stripe Connect ?</strong>
            </p>
            <ul className={`text-xs mt-2 space-y-1 ml-4 list-disc ${
              stripeOnboardingComplete 
                ? "text-green-700" 
                : "text-blue-700"
            }`}>
              <li>Recevez des paiements sécurisés de vos étudiants</li>
              <li>Virements automatiques vers votre compte bancaire</li>
              <li>Suivi de vos revenus en temps réel</li>
              <li>Protection contre la fraude</li>
            </ul>
          </div>
          <Button
            onClick={handleSetupStripe}
            disabled={setupStripeLoading || verifyingStripe}
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
          
          {/* Verify Button - Show if account exists but not complete */}
          {stripeAccountId && stripeSetupPending && (
            <>
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-gray-300" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-orange-50 px-2 text-gray-500">ou</span>
                </div>
              </div>
              <Button
                onClick={handleVerifyStripeConfiguration}
                disabled={verifyingStripe || setupStripeLoading}
                variant="outline"
                className="w-full border-blue-600 text-blue-700 hover:bg-blue-50"
              >
                {verifyingStripe ? (
                  <>
                    <div className="w-4 h-4 mr-2 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                    Vérification en cours...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Vérifier la configuration Stripe
                  </>
                )}
              </Button>
              <p className="text-xs text-blue-700 text-center">
                Cliquez ici si vous avez déjà complété votre configuration Stripe
              </p>
            </>
          )}
          
          {!stripeAccountId && (
            <p className="text-xs text-gray-600 text-center">
              Vous serez redirigé vers Stripe pour compléter votre configuration
            </p>
          )}
        </div>
      )}

      {stripeOnboardingComplete && stripeAccountId && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm text-green-700">
            <CheckCircle className="w-4 h-4 text-green-600" />
            <span>ID de compte : {stripeAccountId.substring(0, 20)}...</span>
          </div>
          <Button
            variant="outline"
            className="w-full border-green-600 text-green-700 hover:bg-green-50"
            onClick={() => window.open("https://dashboard.stripe.com", "_blank")}
          >
            <ExternalLink className="w-4 h-4 mr-2" />
            Ouvrir le Dashboard Stripe
          </Button>
          <p className="text-xs text-green-600 text-center">
            Gérez vos paiements et vos revenus sur le dashboard Stripe
          </p>
        </div>
      )}
    </div>
  );
}