import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Card } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';
import { Label } from '../components/ui/label';
import { 
  Mail, 
  Lock, 
  AlertCircle, 
  Check, 
  X,
  Users,
  BookOpen,
  Award,
  Zap,
  TrendingUp,
  Shield,
  Sparkles,
  ArrowRight,
  CheckCircle2,
  Star,
  Globe,
  Calendar,
  MessageCircle,
  Gift,
  Crown,
  Rocket
} from 'lucide-react';
import { Alert, AlertDescription } from '../components/ui/alert';
import { EduConnectLogo } from '../components/EduConnectLogo';
import { motion } from 'motion/react';
import { Badge } from '../components/ui/badge';

export function SignupPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { signup } = useAuth();
  const navigate = useNavigate();

  // Validation du mot de passe
  const passwordValidation = {
    minLength: password.length >= 8,
    hasUpperCase: /[A-Z]/.test(password),
    hasLowerCase: /[a-z]/.test(password),
    hasNumber: /\d/.test(password),
    hasSpecialChar: /[!@#$%^&*(),.?":{}|<>]/.test(password),
  };

  const isPasswordValid = Object.values(passwordValidation).every(Boolean);
  const passwordsMatch = password === confirmPassword && password.length > 0;
  const canSubmit = isPasswordValid && passwordsMatch;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (password !== confirmPassword) {
      return setError('Les mots de passe ne correspondent pas');
    }

    if (!isPasswordValid) {
      return setError('Le mot de passe ne respecte pas tous les critères requis');
    }

    try {
      setError('');
      setLoading(true);
      await signup(email, password, email.split('@')[0]);
      navigate('/complete-profile');
    } catch (err: any) {
      if (err.code === 'auth/email-already-in-use') {
        setError('Un compte avec cette adresse email existe déjà.');
      } else if (err.code === 'auth/invalid-email') {
        setError('Adresse email invalide.');
      } else if (err.code === 'auth/weak-password') {
        setError('Le mot de passe est trop faible.');
      } else {
        setError('Échec de la création du compte. Veuillez réessayer.');
      }
    } finally {
      setLoading(false);
    }
  }

  const features = [
    {
      icon: Users,
      title: 'Communauté Active',
      description: 'Rejoignez plus de 10 000 étudiants qui apprennent ensemble',
      color: 'from-blue-500 to-cyan-500'
    },
    {
      icon: BookOpen,
      title: 'Cours Illimités',
      description: 'Accédez à des centaines de cours répétitifs et vidéos',
      color: 'from-purple-500 to-pink-500'
    },
    {
      icon: Calendar,
      title: 'Sessions Live',
      description: 'Participez à des sessions interactives avec des experts',
      color: 'from-green-500 to-emerald-500'
    },
    {
      icon: Award,
      title: 'Système de Niveaux',
      description: 'Gagnez des points et débloquez des récompenses',
      color: 'from-orange-500 to-amber-500'
    },
    {
      icon: MessageCircle,
      title: 'Q&A Instantané',
      description: 'Obtenez des réponses rapides à vos questions',
      color: 'from-red-500 to-rose-500'
    },
    {
      icon: TrendingUp,
      title: 'Suivi Progression',
      description: 'Analysez votre évolution avec des statistiques détaillées',
      color: 'from-indigo-500 to-purple-500'
    }
  ];

  const benefits = [
    {
      icon: Gift,
      title: 'Gratuit pour toujours',
      description: 'Aucune carte bancaire requise'
    },
    {
      icon: Zap,
      title: 'Accès instantané',
      description: 'Commencez à apprendre immédiatement'
    },
    {
      icon: Shield,
      title: 'Données sécurisées',
      description: 'Vos informations sont protégées'
    },
    {
      icon: Crown,
      title: 'Fonctionnalités premium',
      description: 'Incluses gratuitement pour tous'
    }
  ];

  const testimonials = [
    {
      name: 'Marie D.',
      role: 'Étudiante en Informatique',
      content: 'EduConnect a transformé ma façon d\'étudier. Les sessions de groupe sont incroyables !',
      rating: 5
    },
    {
      name: 'Thomas L.',
      role: 'Enseignant',
      content: 'Une plateforme intuitive qui facilite vraiment l\'enseignement à distance.',
      rating: 5
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50 relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          className="absolute top-20 left-10 w-96 h-96 bg-blue-300 rounded-full mix-blend-multiply filter blur-xl opacity-20"
          animate={{
            x: [0, 100, 0],
            y: [0, -50, 0],
          }}
          transition={{
            duration: 20,
            repeat: Infinity,
            ease: "linear"
          }}
        />
        <motion.div
          className="absolute top-40 right-10 w-96 h-96 bg-purple-300 rounded-full mix-blend-multiply filter blur-xl opacity-20"
          animate={{
            x: [0, -100, 0],
            y: [0, 100, 0],
          }}
          transition={{
            duration: 15,
            repeat: Infinity,
            ease: "linear"
          }}
        />
        <motion.div
          className="absolute -bottom-8 left-1/2 w-96 h-96 bg-pink-300 rounded-full mix-blend-multiply filter blur-xl opacity-20"
          animate={{
            x: [0, 50, 0],
            y: [0, -100, 0],
          }}
          transition={{
            duration: 25,
            repeat: Infinity,
            ease: "linear"
          }}
        />
      </div>

      <div className="relative z-10 min-h-screen flex">
        {/* Left Side - Features & Info */}
        <div className="hidden lg:flex lg:w-1/2 p-12 flex-col justify-between overflow-y-auto">
          <div>
            {/* Logo & Brand */}
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="flex items-center gap-3 mb-12"
            >
              <EduConnectLogo size={64} />
              <div>
                <h1 className="text-4xl text-gray-900">EduConnect</h1>
                <p className="text-sm text-gray-600 mt-1">Rejoignez la révolution de l'apprentissage</p>
              </div>
            </motion.div>

            {/* Main Headline */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="mb-10"
            >
              <Badge className="mb-4 bg-gradient-to-r from-green-600 to-emerald-600 text-white border-0">
                <Rocket className="w-3 h-3 mr-1" />
                Inscription gratuite • Pas de carte bancaire
              </Badge>
              <h2 className="text-5xl text-gray-900 mb-4 leading-tight">
                Commencez votre<br />
                <span className="bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
                  voyage d'apprentissage
                </span>
              </h2>
              <p className="text-xl text-gray-600 leading-relaxed">
                Créez votre compte gratuitement et accédez instantanément à une 
                plateforme complète dédiée à votre réussite académique.
              </p>
            </motion.div>

            {/* Benefits Cards */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="grid grid-cols-2 gap-4 mb-10"
            >
              {benefits.map((benefit, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.4, delay: 0.4 + index * 0.1 }}
                >
                  <Card className="p-4 border-2 border-gray-200 hover:border-blue-300 transition-all duration-300 hover:shadow-lg group cursor-pointer">
                    <benefit.icon className="w-8 h-8 text-blue-600 mb-2 group-hover:scale-110 transition-transform" />
                    <h3 className="text-gray-900 mb-1 text-sm">{benefit.title}</h3>
                    <p className="text-xs text-gray-600">{benefit.description}</p>
                  </Card>
                </motion.div>
              ))}
            </motion.div>

            {/* Features Grid */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.5 }}
              className="mb-10"
            >
              <h3 className="text-2xl text-gray-900 mb-6 flex items-center gap-2">
                <Sparkles className="w-6 h-6 text-blue-600" />
                Ce qui vous attend
              </h3>
              <div className="grid grid-cols-2 gap-3">
                {features.map((feature, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.4, delay: 0.6 + index * 0.1 }}
                    className="flex items-start gap-3 p-3 bg-white/60 backdrop-blur-sm rounded-xl border border-gray-200"
                  >
                    <div className={`w-10 h-10 rounded-lg bg-gradient-to-r ${feature.color} flex items-center justify-center flex-shrink-0`}>
                      <feature.icon className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h4 className="text-sm text-gray-900 mb-0.5">{feature.title}</h4>
                      <p className="text-xs text-gray-600 leading-relaxed">{feature.description}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>

            {/* Testimonials */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.7 }}
              className="space-y-4"
            >
              <h3 className="text-xl text-gray-900 mb-4">Ce que disent nos utilisateurs</h3>
              {testimonials.map((testimonial, index) => (
                <Card key={index} className="p-4 border-2 border-gray-200 bg-white/60 backdrop-blur-sm">
                  <div className="flex items-center gap-1 mb-2">
                    {[...Array(testimonial.rating)].map((_, i) => (
                      <Star key={i} className="w-4 h-4 fill-amber-500 text-amber-500" />
                    ))}
                  </div>
                  <p className="text-sm text-gray-700 mb-3 italic">"{testimonial.content}"</p>
                  <div>
                    <p className="text-sm text-gray-900">{testimonial.name}</p>
                    <p className="text-xs text-gray-600">{testimonial.role}</p>
                  </div>
                </Card>
              ))}
            </motion.div>
          </div>
        </div>

        {/* Right Side - Signup Form */}
        <div className="w-full lg:w-1/2 flex items-start justify-center p-6 lg:p-12 lg:pt-8 overflow-y-auto">
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
            className="w-full max-w-md"
          >
            {/* Mobile Logo */}
            <div className="lg:hidden text-center mb-8">
              <div className="flex items-center justify-center gap-3 mb-4">
                <EduConnectLogo size={56} />
                <h1 className="text-blue-600 text-3xl">EduConnect</h1>
              </div>
              <h2 className="text-gray-900 mb-2">Créez votre compte</h2>
              <p className="text-gray-600">Rejoignez la communauté dès maintenant</p>
            </div>

            {/* Signup Card */}
            <Card className="p-8 lg:p-10 bg-white/80 backdrop-blur-lg border-2 border-gray-200 rounded-3xl shadow-2xl">
              <div className="hidden lg:block mb-8">
                <h2 className="text-3xl text-gray-900 mb-2">Créez votre compte 🚀</h2>
                <p className="text-gray-600">Commencez votre parcours d'apprentissage gratuitement</p>
              </div>

              {error && (
                <Alert variant="destructive" className="mb-6 border-red-200 bg-red-50">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-gray-900">Adresse Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="vous@universite.fr"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-12 h-12 border-2 border-gray-200 focus:border-blue-500 rounded-xl"
                      required
                      disabled={loading}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password" className="text-gray-900">Mot de passe</Label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <Input
                      id="password"
                      type="password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pl-12 h-12 border-2 border-gray-200 focus:border-blue-500 rounded-xl"
                      required
                      disabled={loading}
                    />
                  </div>
                  
                  {/* Password Requirements */}
                  {password && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className="mt-3 p-4 bg-gradient-to-br from-blue-50 to-purple-50 rounded-xl border-2 border-blue-100 space-y-2"
                    >
                      <p className="text-xs text-gray-700 mb-2 font-medium">Critères de sécurité :</p>
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2 text-xs">
                          {passwordValidation.minLength ? (
                            <CheckCircle2 className="w-4 h-4 text-green-600" />
                          ) : (
                            <X className="w-4 h-4 text-gray-400" />
                          )}
                          <span className={passwordValidation.minLength ? "text-green-700 font-medium" : "text-gray-600"}>
                            Au moins 8 caractères
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-xs">
                          {passwordValidation.hasUpperCase ? (
                            <CheckCircle2 className="w-4 h-4 text-green-600" />
                          ) : (
                            <X className="w-4 h-4 text-gray-400" />
                          )}
                          <span className={passwordValidation.hasUpperCase ? "text-green-700 font-medium" : "text-gray-600"}>
                            Une lettre majuscule (A-Z)
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-xs">
                          {passwordValidation.hasLowerCase ? (
                            <CheckCircle2 className="w-4 h-4 text-green-600" />
                          ) : (
                            <X className="w-4 h-4 text-gray-400" />
                          )}
                          <span className={passwordValidation.hasLowerCase ? "text-green-700 font-medium" : "text-gray-600"}>
                            Une lettre minuscule (a-z)
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-xs">
                          {passwordValidation.hasNumber ? (
                            <CheckCircle2 className="w-4 h-4 text-green-600" />
                          ) : (
                            <X className="w-4 h-4 text-gray-400" />
                          )}
                          <span className={passwordValidation.hasNumber ? "text-green-700 font-medium" : "text-gray-600"}>
                            Un chiffre (0-9)
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-xs">
                          {passwordValidation.hasSpecialChar ? (
                            <CheckCircle2 className="w-4 h-4 text-green-600" />
                          ) : (
                            <X className="w-4 h-4 text-gray-400" />
                          )}
                          <span className={passwordValidation.hasSpecialChar ? "text-green-700 font-medium" : "text-gray-600"}>
                            Un caractère spécial (!@#$%^&*...)
                          </span>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword" className="text-gray-900">Confirmer le mot de passe</Label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <Input
                      id="confirmPassword"
                      type="password"
                      placeholder="••••••••"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="pl-12 h-12 border-2 border-gray-200 focus:border-blue-500 rounded-xl"
                      required
                      disabled={loading}
                    />
                  </div>
                  {confirmPassword && password !== confirmPassword && (
                    <motion.p
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="text-xs text-red-600 flex items-center gap-1 mt-2 bg-red-50 p-2 rounded-lg"
                    >
                      <X className="w-3 h-3" />
                      Les mots de passe ne correspondent pas
                    </motion.p>
                  )}
                  {confirmPassword && password === confirmPassword && (
                    <motion.p
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="text-xs text-green-600 flex items-center gap-1 mt-2 bg-green-50 p-2 rounded-lg"
                    >
                      <CheckCircle2 className="w-3 h-3" />
                      Les mots de passe correspondent
                    </motion.p>
                  )}
                </div>

                <div className="flex items-start gap-3 text-sm p-4 bg-blue-50 rounded-xl border-2 border-blue-100">
                  <input 
                    type="checkbox" 
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 w-4 h-4 mt-0.5" 
                    required 
                  />
                  <span className="text-gray-700 leading-relaxed">
                    J'accepte les{' '}
                    <Link to="/terms" className="text-blue-600 hover:text-blue-700 font-medium underline">
                      Conditions d'utilisation
                    </Link>{' '}
                    et la{' '}
                    <Link to="/privacy" className="text-blue-600 hover:text-blue-700 font-medium underline">
                      Politique de confidentialité
                    </Link>
                  </span>
                </div>

                <Button
                  type="submit"
                  className="w-full h-12 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 text-base group"
                  disabled={loading || !canSubmit}
                >
                  {loading ? (
                    'Création du compte...'
                  ) : (
                    <>
                      Créer mon compte gratuitement
                      <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                    </>
                  )}
                </Button>
              </form>

              <div className="mt-8 pt-6 border-t border-gray-200">
                <p className="text-center text-gray-600">
                  Vous avez déjà un compte ?{' '}
                  <Link to="/login" className="text-blue-600 hover:text-blue-700 font-semibold transition-colors">
                    Se connecter
                  </Link>
                </p>
              </div>

              {/* Trust Badges */}
              <div className="mt-6 flex items-center justify-center gap-4 text-xs text-gray-500">
                <div className="flex items-center gap-1">
                  <Shield className="w-4 h-4 text-green-600" />
                  <span>100% Gratuit</span>
                </div>
                <div className="flex items-center gap-1">
                  <Globe className="w-4 h-4 text-blue-600" />
                  <span>10K+ membres</span>
                </div>
                <div className="flex items-center gap-1">
                  <Star className="w-4 h-4 text-amber-500" />
                  <span>4.9/5 étoiles</span>
                </div>
              </div>
            </Card>

            {/* Additional Info */}
            <div className="mt-6 text-center">
              <p className="text-sm text-gray-600 mb-3">
                ✨ Gratuit pour toujours • Aucune carte bancaire requise • Accès instantané
              </p>
              <p className="text-xs text-gray-500">
                Des milliers d'étudiants nous font confiance pour leur apprentissage quotidien
              </p>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}