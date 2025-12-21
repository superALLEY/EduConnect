import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "./ui/dialog";
import { Button } from "./ui/button";
import { CheckCircle2, XCircle, AlertCircle } from "lucide-react";
import { motion } from "motion/react";

interface PaymentResultDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  status: "success" | "failed" | "processing";
  amount?: number;
  courseName?: string;
  errorMessage?: string;
  onClose?: () => void;
}

export function PaymentResultDialog({
  open,
  onOpenChange,
  status,
  amount,
  courseName,
  errorMessage,
  onClose,
}: PaymentResultDialogProps) {
  const handleClose = () => {
    onOpenChange(false);
    if (onClose) onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {status === "success" && "Paiement confirmé"}
            {status === "failed" && "Paiement refusé"}
            {status === "processing" && "Traitement en cours"}
          </DialogTitle>
          <DialogDescription>
            {status === "success" && `Vous êtes inscrit au cours "${courseName}"`}
            {status === "failed" && "Le paiement n'a pas pu être traité"}
            {status === "processing" && "Votre paiement est en cours de traitement"}
          </DialogDescription>
        </DialogHeader>
        <div className="text-center py-6">
          {status === "success" && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", duration: 0.5 }}
            >
              <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                <CheckCircle2 className="w-10 h-10 text-green-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Paiement confirmé !
              </h2>
              <p className="text-gray-600 mb-4">
                Votre paiement de <span className="font-semibold">${amount?.toFixed(2)}</span> a été traité avec succès.
              </p>
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
                <p className="text-sm text-green-800">
                  ✓ Paiement traité<br />
                  ✓ Inscription confirmée<br />
                  ✓ Notification envoyée au professeur
                </p>
              </div>
              <Button
                onClick={handleClose}
                className="w-full bg-green-600 hover:bg-green-700 text-white"
              >
                Continuer
              </Button>
            </motion.div>
          )}

          {status === "failed" && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", duration: 0.5 }}
            >
              <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
                <XCircle className="w-10 h-10 text-red-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Paiement refusé
              </h2>
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                <p className="text-sm font-semibold text-red-800 mb-2">
                  Raison du refus :
                </p>
                <p className="text-sm text-red-700">
                  {errorMessage || "Une erreur inconnue s'est produite"}
                </p>
              </div>
              <div className="space-y-2">
                <p className="text-sm text-gray-600">
                  Suggestions :
                </p>
                <ul className="text-sm text-gray-600 text-left list-disc list-inside">
                  <li>Vérifiez les informations de votre carte</li>
                  <li>Assurez-vous d'avoir suffisamment de fonds</li>
                  <li>Contactez votre banque si le problème persiste</li>
                </ul>
              </div>
              <div className="flex gap-3 mt-6">
                <Button
                  variant="outline"
                  onClick={handleClose}
                  className="flex-1"
                >
                  Annuler
                </Button>
                <Button
                  onClick={handleClose}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                >
                  Réessayer
                </Button>
              </div>
            </motion.div>
          )}

          {status === "processing" && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
                <AlertCircle className="w-10 h-10 text-blue-600 animate-pulse" />
              </div>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                <p className="text-sm text-blue-800">
                  Veuillez patienter pendant que nous vérifions votre paiement...
                </p>
              </div>
            </motion.div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}