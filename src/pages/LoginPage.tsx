import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Card } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';
import { Label } from '../components/ui/label';
import { 
  Mail, 
  Lock, 
  AlertCircle, 
  Users, 
  BookOpen, 
  Calendar, 
  MessageCircle,
  TrendingUp,
  Award,
  Zap,
  Globe,
  Shield,
  Sparkles,
  CheckCircle2,
  ArrowRight,
  GraduationCap,
  Video,
  FileText,
  Star
} from 'lucide-react';
import { Alert, AlertDescription } from '../components/ui/alert';
import { EduConnectLogo } from '../components/EduConnectLogo';
import { motion } from 'motion/react';
import { Badge } from '../components/ui/badge';

export function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    try {
      setError('');
      setLoading(true);
      await login(email, password);
    } catch (err: any) {
      if (err.code === 'auth/user-not-found') {
        setError('Aucun compte trouvé avec cette adresse email.');
      } else if (err.code === 'auth/wrong-password') {
        setError('Mot de passe incorrect. Veuillez réessayer.');
      } else if (err.code === 'auth/invalid-email') {
        setError('Adresse email invalide.');
      } else if (err.code === 'auth/too-many-requests') {
        setError('Trop de tentatives échouées. Veuillez réessayer plus tard.');
      } else {
        setError('Échec de la connexion. Vérifiez vos identifiants.');
      }
      setLoading(false);
    }
  }

  const features = [
    {
      icon: Users,
      title: 'Collaboration',
      description: 'Rejoignez des groupes d\'étude et collaborez avec vos pairs',
      color: 'from-blue-500 to-cyan-500'
    },
    {
      icon: BookOpen,
      title: 'Cours & Tutorat',
      description: 'Accédez à des cours répétitifs et vidéos organisés par des enseignants',
      color: 'from-purple-500 to-pink-500'
    },
    {
      icon: Calendar,
      title: 'Sessions',
      description: 'Planifiez et participez à des sessions d\'apprentissage interactives',
      color: 'from-green-500 to-emerald-500'
    },
    {
      icon: MessageCircle,
      title: 'Q&A Intelligent',
      description: 'Posez des questions et recevez des réponses de la communauté',
      color: 'from-orange-500 to-amber-500'
    }
  ];

  const stats = [
    { value: '10K+', label: 'Étudiants actifs' },
    { value: '500+', label: 'Cours disponibles' },
    { value: '1K+', label: 'Sessions/mois' },
    { value: '95%', label: 'Taux de satisfaction' }
  ];

  const benefits = [
    'Système de niveaux et scores pour suivre votre progression',
    'Gestion intelligente de l\'emploi du temps',
    'Paiements sécurisés via Stripe Connect',
    'Notifications en temps réel',
    'Interface responsive et moderne',
    'Support multilingue'
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50 relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          className="absolute top-20 left-10 w-72 h-72 bg-blue-300 rounded-full mix-blend-multiply filter blur-xl opacity-20"
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
          className="absolute top-40 right-10 w-72 h-72 bg-purple-300 rounded-full mix-blend-multiply filter blur-xl opacity-20"
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
          className="absolute -bottom-8 left-1/2 w-72 h-72 bg-pink-300 rounded-full mix-blend-multiply filter blur-xl opacity-20"
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
        <div className="hidden lg:flex lg:w-1/2 p-12 flex-col justify-between">
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
                <p className="text-sm text-gray-600 mt-1">La plateforme qui révolutionne l'apprentissage</p>
              </div>
            </motion.div>

            {/* Main Headline */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="mb-12"
            >
              <Badge className="mb-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white border-0">
                <Sparkles className="w-3 h-3 mr-1" />
                Nouvelle expérience d'apprentissage
              </Badge>
              <h2 className="text-5xl text-gray-900 mb-4 leading-tight">
                Apprenez ensemble,<br />
                <span className="bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
                  réussissez ensemble
                </span>
              </h2>
              <p className="text-xl text-gray-600 leading-relaxed">
                Une plateforme collaborative complète qui connecte étudiants et enseignants 
                pour une expérience d'apprentissage moderne et interactive.
              </p>
            </motion.div>

            {/* Features Grid */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="grid grid-cols-2 gap-4 mb-12"
            >
              {features.map((feature, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.4, delay: 0.5 + index * 0.1 }}
                >
                  <Card className="p-5 border-2 border-gray-200 hover:border-blue-300 transition-all duration-300 hover:shadow-xl group cursor-pointer">
                    <div className={`w-12 h-12 rounded-xl bg-gradient-to-r ${feature.color} flex items-center justify-center mb-3 group-hover:scale-110 transition-transform`}>
                      <feature.icon className="w-6 h-6 text-white" />
                    </div>
                    <h3 className="text-gray-900 mb-1">{feature.title}</h3>
                    <p className="text-sm text-gray-600 leading-relaxed">{feature.description}</p>
                  </Card>
                </motion.div>
              ))}
            </motion.div>

            {/* Stats */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.6 }}
              className="grid grid-cols-4 gap-4"
            >
              {stats.map((stat, index) => (
                <div key={index} className="text-center">
                  <div className="text-3xl text-blue-600 mb-1">{stat.value}</div>
                  <div className="text-sm text-gray-600">{stat.label}</div>
                </div>
              ))}
            </motion.div>
          </div>

          {/* Bottom Features List */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.8 }}
            className="space-y-3"
          >
            {benefits.slice(0, 3).map((benefit, index) => (
              <div key={index} className="flex items-center gap-3">
                <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                  <CheckCircle2 className="w-4 h-4 text-green-600" />
                </div>
                <p className="text-sm text-gray-700">{benefit}</p>
              </div>
            ))}
          </motion.div>
        </div>

        {/* Right Side - Login Form */}
        <div className="w-full lg:w-1/2 flex items-start justify-center p-6 lg:p-12 lg:pt-8">
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
              <h2 className="text-gray-900 mb-2">Bienvenue !</h2>
              <p className="text-gray-600">Connectez-vous pour continuer</p>
            </div>

            {/* Login Card */}
            <Card className="p-8 lg:p-10 bg-white/80 backdrop-blur-lg border-2 border-gray-200 rounded-3xl shadow-2xl">
              <div className="hidden lg:block mb-8">
                <h2 className="text-3xl text-gray-900 mb-2">Bon retour ! 👋</h2>
                <p className="text-gray-600">Connectez-vous pour accéder à votre espace d'apprentissage</p>
              </div>

              {error && (
                <Alert variant="destructive" className="mb-6 border-red-200 bg-red-50">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <form onSubmit={handleSubmit} className="space-y-6">
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
                </div>

                <div className="flex items-center justify-between text-sm">
                  <label className="flex items-center gap-2 cursor-pointer group">
                    <input 
                      type="checkbox" 
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 w-4 h-4" 
                    />
                    <span className="text-gray-600 group-hover:text-gray-900 transition-colors">Se souvenir de moi</span>
                  </label>
                  <Link to="/forgot-password" className="text-blue-600 hover:text-blue-700 font-medium transition-colors">
                    Mot de passe oublié ?
                  </Link>
                </div>

                <Button
                  type="submit"
                  className="w-full h-12 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 text-base group"
                  disabled={loading}
                >
                  {loading ? (
                    'Connexion en cours...'
                  ) : (
                    <>
                      Se connecter
                      <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                    </>
                  )}
                </Button>
              </form>

              <div className="mt-8 pt-6 border-t border-gray-200">
                <p className="text-center text-gray-600">
                  Vous n'avez pas de compte ?{' '}
                  <Link to="/signup" className="text-blue-600 hover:text-blue-700 font-semibold transition-colors">
                    S'inscrire gratuitement
                  </Link>
                </p>
              </div>

              {/* Trust Badges */}
              <div className="mt-6 flex items-center justify-center gap-4 text-xs text-gray-500">
                <div className="flex items-center gap-1">
                  <Shield className="w-4 h-4 text-green-600" />
                  <span>Sécurisé</span>
                </div>
                <div className="flex items-center gap-1">
                  <Globe className="w-4 h-4 text-blue-600" />
                  <span>Accessible 24/7</span>
                </div>
                <div className="flex items-center gap-1">
                  <Star className="w-4 h-4 text-amber-500" />
                  <span>4.9/5 étoiles</span>
                </div>
              </div>
            </Card>

            {/* Additional Info */}
            <p className="text-center text-sm text-gray-500 mt-6">
              En vous connectant, vous acceptez nos{' '}
              <Link to="/terms" className="text-blue-600 hover:underline">
                Conditions d'utilisation
              </Link>{' '}
              et notre{' '}
              <Link to="/privacy" className="text-blue-600 hover:underline">
                Politique de confidentialité
              </Link>
            </p>
          </motion.div>
        </div>
      </div>
    </div>
  );
}