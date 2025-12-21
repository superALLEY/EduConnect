import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Card } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';
import { Label } from '../components/ui/label';
import { Mail, ArrowLeft, CheckCircle, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '../components/ui/alert';
import { sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '../config/firebase';
import { toast } from 'sonner@2.0.3';
import { EduConnectLogo } from '../components/EduConnectLogo';

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!email.trim()) {
      setError('Veuillez entrer votre adresse email');
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError('Veuillez entrer une adresse email valide');
      return;
    }

    try {
      setError('');
      setLoading(true);
      
      await sendPasswordResetEmail(auth, email, {
        url: window.location.origin + '/login',
        handleCodeInApp: false,
      });

      setEmailSent(true);
      toast.success('Email de réinitialisation envoyé avec succès !');
    } catch (err: any) {
      console.error('Error sending password reset email:', err);
      
      if (err.code === 'auth/user-not-found') {
        setError('Aucun compte trouvé avec cette adresse email.');
      } else if (err.code === 'auth/invalid-email') {
        setError('Adresse email invalide.');
      } else if (err.code === 'auth/too-many-requests') {
        setError('Trop de tentatives. Veuillez réessayer plus tard.');
      } else {
        setError('Erreur lors de l\'envoi de l\'email. Veuillez réessayer.');
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo and Title */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <EduConnectLogo />
            <h1 className="text-blue-600 text-3xl">EduConnect</h1>
          </div>
          <h2 className="text-gray-900 mb-2">Mot de passe oublié ?</h2>
          <p className="text-gray-600">
            Entrez votre adresse email et nous vous enverrons un lien pour réinitialiser votre mot de passe
          </p>
        </div>

        {/* Forgot Password Card */}
        <Card className="p-8 bg-white border border-gray-200 rounded-2xl shadow-xl">
          {emailSent ? (
            <div className="text-center space-y-4">
              <div className="flex justify-center">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                  <CheckCircle className="w-10 h-10 text-green-600" />
                </div>
              </div>
              <h3 className="text-gray-900">Email envoyé !</h3>
              <p className="text-gray-600 text-sm">
                Nous avons envoyé un lien de réinitialisation à <strong>{email}</strong>
              </p>
              <p className="text-gray-600 text-sm">
                Vérifiez votre boîte de réception et suivez les instructions pour réinitialiser votre mot de passe.
              </p>
              <div className="pt-4 space-y-3">
                <Button
                  onClick={() => {
                    setEmailSent(false);
                    setEmail('');
                  }}
                  variant="outline"
                  className="w-full"
                >
                  Envoyer à nouveau
                </Button>
                <Link to="/login" className="block">
                  <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white">
                    Retour à la connexion
                  </Button>
                </Link>
              </div>
            </div>
          ) : (
            <>
              {error && (
                <Alert variant="destructive" className="mb-6">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="email">Adresse Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="vous@universite.fr"
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        setError('');
                      }}
                      className="pl-10"
                      required
                      disabled={loading}
                      autoFocus
                    />
                  </div>
                  <p className="text-xs text-gray-500">
                    Entrez l'adresse email associée à votre compte
                  </p>
                </div>

                <Button
                  type="submit"
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <div className="w-4 h-4 mr-2 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Envoi en cours...
                    </>
                  ) : (
                    'Envoyer le lien de réinitialisation'
                  )}
                </Button>

                <Link to="/login" className="block">
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    disabled={loading}
                  >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Retour à la connexion
                  </Button>
                </Link>
              </form>
            </>
          )}
        </Card>

        {/* Additional Info */}
        <p className="text-center text-sm text-gray-500 mt-6">
          Si vous ne recevez pas l'email dans quelques minutes, vérifiez votre dossier spam ou réessayez
        </p>
      </div>
    </div>
  );
}