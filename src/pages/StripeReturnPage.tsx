import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { doc, updateDoc, getDoc, query, collection, where, getDocs } from "firebase/firestore";
import { db } from "../config/firebase";
import { checkStripeAccountStatus } from "../services/stripe";
import { Card } from "../components/ui/card";
import { Loader2, CheckCircle, AlertCircle } from "lucide-react";
import { Button } from "../components/ui/button";
import { toast } from "sonner@2.0.3";

export function StripeReturnPage() {
  const { currentUser, refreshUserData } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("Vérification de votre compte Stripe...");

  useEffect(() => {
    const verifyStripeAccount = async () => {
      if (!currentUser) {
        setStatus("error");
        setMessage("Utilisateur non connecté");
        return;
      }

      try {
        // Check if this is a refresh (user was asked to complete more info)
        const isRefresh = searchParams.get('refresh') === 'true';
        const isSuccess = searchParams.get('success') === 'true';

        // Get user document using query (since document ID might not be currentUser.uid)
        const usersQuery = query(
          collection(db, "users"),
          where("uid", "==", currentUser.uid)
        );
        const usersSnapshot = await getDocs(usersQuery);

        if (usersSnapshot.empty) {
          setStatus("error");
          setMessage("Profil utilisateur introuvable");
          return;
        }

        const userDocRef = doc(db, "users", usersSnapshot.docs[0].id);
        const userData = usersSnapshot.docs[0].data();
        const stripeAccountId = userData.stripe_account_id;

        if (!stripeAccountId) {
          setStatus("error");
          setMessage("ID de compte Stripe introuvable");
          return;
        }

        // Check Stripe account status
        setMessage("Vérification du statut de votre compte Stripe...");
        console.log("Checking Stripe account:", stripeAccountId);
        
        const accountStatus = await checkStripeAccountStatus(stripeAccountId);
        console.log("Account status:", accountStatus);

        if (accountStatus.error) {
          console.error("Stripe account check error:", accountStatus.error);
          setStatus("error");
          setMessage("Erreur lors de la vérification du compte Stripe");
          return;
        }

        // AUTOMATIC ACTIVATION: Once user completes Stripe onboarding, automatically activate all flags
        const updateData: any = {
          stripe_setup_pending: false,
          stripe_onboarding_complete: true,
          stripe_charges_enabled: true,
          stripe_payouts_enabled: true,
        };

        console.log("Updating Firestore with:", updateData);
        await updateDoc(userDocRef, updateData);
        console.log("Firestore updated successfully");

        // Clear the signup flag if still present AND mark Stripe as completed
        sessionStorage.removeItem('justSignedUp');
        sessionStorage.setItem('stripeCompleted', 'true');

        // Refresh user data to ensure AuthContext has the latest data
        setMessage("Finalisation de votre compte...");
        await refreshUserData();

        // Show success notification
        toast.success("🎉 Compte Stripe activé! Vous pouvez maintenant créer des cours.");
        
        // Wait a bit to ensure userData is fully loaded before redirecting
        setTimeout(() => {
          sessionStorage.removeItem('stripeCompleted'); // Clean up the flag
          navigate("/");
        }, 1000);

      } catch (error) {
        console.error("Error verifying Stripe account:", error);
        setStatus("error");
        setMessage("Une erreur s'est produite lors de la vérification");
      }
    };

    verifyStripeAccount();
  }, [currentUser, navigate, searchParams]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <Card className="max-w-md w-full p-8">
        <div className="text-center space-y-6">
          {status === "loading" && (
            <>
              <div className="flex justify-center">
                <Loader2 className="w-16 h-16 text-blue-600 animate-spin" />
              </div>
              <h2 className="text-gray-900">Vérification en cours</h2>
              <p className="text-gray-600">{message}</p>
            </>
          )}

          {status === "success" && (
            <>
              <div className="flex justify-center">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                  <CheckCircle className="w-10 h-10 text-green-600" />
                </div>
              </div>
              <h2 className="text-gray-900">Configuration réussie !</h2>
              <p className="text-gray-600">{message}</p>
              <p className="text-sm text-gray-500">
                Redirection vers la page d'accueil...
              </p>
            </>
          )}

          {status === "error" && (
            <>
              <div className="flex justify-center">
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
                  <AlertCircle className="w-10 h-10 text-red-600" />
                </div>
              </div>
              <h2 className="text-gray-900">Erreur de configuration</h2>
              <p className="text-gray-600">{message}</p>
              <div className="flex flex-col gap-2">
                <Button
                  onClick={() => navigate("/settings")}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  Aller aux paramètres
                </Button>
                <Button
                  variant="outline"
                  onClick={() => navigate("/profile")}
                >
                  Retour au profil
                </Button>
              </div>
            </>
          )}
        </div>
      </Card>
    </div>
  );
}