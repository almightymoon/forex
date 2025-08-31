'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export type Language = 'en' | 'es' | 'fr' | 'de' | 'ar';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

// Translation dictionary
const translations: Record<Language, Record<string, string>> = {
  en: {
    // Common
    'save': 'Save',
    'cancel': 'Cancel',
    'loading': 'Loading...',
    'error': 'Error',
    'success': 'Success',
    'close': 'Close',
    
    // Navigation
    'dashboard': 'Dashboard',
    'profile': 'Profile',
    'settings': 'Settings',
    'notifications': 'Notifications',
    'logout': 'Logout',
    'account': 'Account',
    'welcomeBack': 'Welcome back',
    'overview': 'Overview',
    'myCourses': 'My Courses',
    'browseCourses': 'Browse Courses',
    'liveSessions': 'Live Sessions',
    'tradingSignals': 'Trading Signals',
    'assignments': 'Assignments',
               'certificates': 'Certificates',
           'community': 'Community',
           'students': 'Students',
           'lessons': 'Lessons',
           'view': 'View',
           'availableCourses': 'Available Courses',
           'courseDescription': 'Discover expert-led courses designed to accelerate your forex trading journey',
           'loadingCourses': 'Loading courses...',
           'instructor': 'Instructor',
           'level': 'Level',
           'duration': 'Duration',
           'viewCourse': 'View Course',
           'enroll': 'Enroll',
           'noSignalsAvailable': 'No trading signals available',
           'checkBackLater': 'Check back later for new trading opportunities and market insights from our expert instructors',
           'myEnrolledCourses': 'My Enrolled Courses',
           'noCoursesEnrolled': 'No courses enrolled yet',
           'startLearningJourney': 'Start your learning journey by enrolling in our expert-led forex trading courses',
           'progress': 'Progress',
           'quizzes': 'Quizzes',
           'averageGrade': 'Average Grade',
           'category': 'Category',
           'certificateEligible': 'Certificate Eligible',
           'certificateEarned': 'Certificate Earned',
           'continueLearning': 'Continue Learning',
           'myEnrolledSessions': 'My Enrolled Sessions',
           'refresh': 'Refresh',
           'noSessionsEnrolled': 'You haven\'t signed up for any live sessions yet',
           'browseSessionsBelow': 'Browse available sessions below and sign up for the ones that interest you',
           'enrolled': 'Enrolled',
           'joinLiveSession': 'Join Live Session',
           'joinRoom': 'Join Room',
           'joinMeeting': 'Join Meeting',
           'availableLiveSessions': 'Available Live Sessions',
           'noLiveSessionsAvailable': 'No live sessions available',
           'checkBackForSessions': 'Check back later for upcoming live trading sessions and Q&A sessions',
           'date': 'Date',
           'time': 'Time',
    
    // Profile
    'firstName': 'First Name',
    'lastName': 'Last Name',
    'email': 'Email',
    'phone': 'Phone',
    'dateOfBirth': 'Date of Birth',
    'address': 'Address',
    'bio': 'Bio',
    'edit': 'Edit',
    'saveChanges': 'Save Changes',
    'cancelEdit': 'Cancel Edit',
    
    // Settings
    'emailNotifications': 'Email Notifications',
    'pushNotifications': 'Push Notifications',
    'marketingEmails': 'Marketing Emails',
    'appearance': 'Appearance',
    'theme': 'Theme',
    'light': 'Light',
    'dark': 'Dark',
    'auto': 'Auto (System)',
    'regional': 'Regional',
    'language': 'Language',
    'timezone': 'Timezone',
    'security': 'Security',
    'password': 'Password',
    'changePassword': 'Change Password',
    'twoFactorAuth': 'Two-Factor Authentication',
    'enable': 'Enable',
    'disable': 'Disable',
    
    // Security
    'currentPassword': 'Current Password',
    'newPassword': 'New Password',
    'confirmPassword': 'Confirm Password',
    'passwordRequirements': 'Password must be at least 6 characters long',
    'passwordsDoNotMatch': 'Passwords do not match',
    'passwordChanged': 'Password changed successfully',
    'invalidCurrentPassword': 'Invalid current password',
    
    // 2FA
    'setup2FA': 'Set up Two-Factor Authentication',
    'scanQRCode': 'Scan this QR code with your authenticator app',
    'enterCode': 'Enter the 6-digit code from your app',
    'verify': 'Verify',
    'backupCodes': 'Backup Codes',
    'saveBackupCodes': 'Save these backup codes in a secure location',
    '2FAEnabled': 'Two-Factor Authentication enabled successfully',
    '2FADisabled': 'Two-Factor Authentication disabled',
    
    // Timezones
    'UTC': 'UTC',
    'easternTime': 'Eastern Time',
    'centralTime': 'Central Time',
    'mountainTime': 'Mountain Time',
    'pacificTime': 'Pacific Time',
    'pakistanTime': 'Pakistan Time',
    'london': 'London',
  },
  es: {
    // Common
    'save': 'Guardar',
    'cancel': 'Cancelar',
    'loading': 'Cargando...',
    'error': 'Error',
    'success': 'Éxito',
    'close': 'Cerrar',
    
    // Navigation
    'dashboard': 'Panel',
    'profile': 'Perfil',
    'settings': 'Configuración',
    'notifications': 'Notificaciones',
    'logout': 'Cerrar Sesión',
    'account': 'Cuenta',
    'welcomeBack': 'Bienvenido de vuelta',
    'overview': 'Resumen',
    'myCourses': 'Mis Cursos',
    'browseCourses': 'Explorar Cursos',
    'liveSessions': 'Sesiones en Vivo',
    'tradingSignals': 'Señales de Trading',
    'assignments': 'Tareas',
               'certificates': 'Certificados',
           'community': 'Comunidad',
           'students': 'Estudiantes',
           'lessons': 'Lecciones',
           'view': 'Ver',
           'availableCourses': 'Cursos Disponibles',
           'courseDescription': 'Descubre cursos dirigidos por expertos diseñados para acelerar tu viaje de trading forex',
           'loadingCourses': 'Cargando cursos...',
           'instructor': 'Instructor',
           'level': 'Nivel',
           'duration': 'Duración',
           'viewCourse': 'Ver Curso',
           'enroll': 'Inscribirse',
           'noSignalsAvailable': 'No hay señales de trading disponibles',
           'checkBackLater': 'Vuelve más tarde para nuevas oportunidades de trading e información del mercado de nuestros instructores expertos',
           'myEnrolledCourses': 'Mis Cursos Inscritos',
           'noCoursesEnrolled': 'Aún no te has inscrito en ningún curso',
           'startLearningJourney': 'Comienza tu viaje de aprendizaje inscribiéndote en nuestros cursos de trading forex dirigidos por expertos',
           'progress': 'Progreso',
           'quizzes': 'Cuestionarios',
           'averageGrade': 'Calificación Promedio',
           'category': 'Categoría',
           'certificateEligible': 'Elegible para Certificado',
           'certificateEarned': 'Certificado Obtenido',
           'continueLearning': 'Continuar Aprendiendo',
           'myEnrolledSessions': 'Mis Sesiones Inscritas',
           'refresh': 'Actualizar',
           'noSessionsEnrolled': 'Aún no te has inscrito en ninguna sesión en vivo',
           'browseSessionsBelow': 'Explora las sesiones disponibles a continuación e inscríbete en las que te interesen',
           'enrolled': 'Inscrito',
           'joinLiveSession': 'Unirse a Sesión en Vivo',
           'joinRoom': 'Unirse a Sala',
           'joinMeeting': 'Unirse a Reunión',
           'availableLiveSessions': 'Sesiones en Vivo Disponibles',
           'noLiveSessionsAvailable': 'No hay sesiones en vivo disponibles',
           'checkBackForSessions': 'Vuelve más tarde para próximas sesiones de trading en vivo y sesiones de preguntas y respuestas',
           'date': 'Fecha',
           'time': 'Hora',
    
    // Profile
    'firstName': 'Nombre',
    'lastName': 'Apellido',
    'email': 'Correo Electrónico',
    'phone': 'Teléfono',
    'dateOfBirth': 'Fecha de Nacimiento',
    'address': 'Dirección',
    'bio': 'Biografía',
    'edit': 'Editar',
    'saveChanges': 'Guardar Cambios',
    'cancelEdit': 'Cancelar Edición',
    
    // Settings
    'emailNotifications': 'Notificaciones por Correo',
    'pushNotifications': 'Notificaciones Push',
    'marketingEmails': 'Correos de Marketing',
    'appearance': 'Apariencia',
    'theme': 'Tema',
    'light': 'Claro',
    'dark': 'Oscuro',
    'auto': 'Automático (Sistema)',
    'regional': 'Regional',
    'language': 'Idioma',
    'timezone': 'Zona Horaria',
    'security': 'Seguridad',
    'password': 'Contraseña',
    'changePassword': 'Cambiar Contraseña',
    'twoFactorAuth': 'Autenticación de Dos Factores',
    'enable': 'Habilitar',
    'disable': 'Deshabilitar',
    
    // Security
    'currentPassword': 'Contraseña Actual',
    'newPassword': 'Nueva Contraseña',
    'confirmPassword': 'Confirmar Contraseña',
    'passwordRequirements': 'La contraseña debe tener al menos 6 caracteres',
    'passwordsDoNotMatch': 'Las contraseñas no coinciden',
    'passwordChanged': 'Contraseña cambiada exitosamente',
    'invalidCurrentPassword': 'Contraseña actual inválida',
    
    // 2FA
    'setup2FA': 'Configurar Autenticación de Dos Factores',
    'scanQRCode': 'Escanee este código QR con su aplicación autenticadora',
    'enterCode': 'Ingrese el código de 6 dígitos de su aplicación',
    'verify': 'Verificar',
    'backupCodes': 'Códigos de Respaldo',
    'saveBackupCodes': 'Guarde estos códigos de respaldo en un lugar seguro',
    '2FAEnabled': 'Autenticación de Dos Factores habilitada exitosamente',
    '2FADisabled': 'Autenticación de Dos Factores deshabilitada',
    
    // Timezones
    'UTC': 'UTC',
    'easternTime': 'Hora del Este',
    'centralTime': 'Hora Central',
    'mountainTime': 'Hora de la Montaña',
    'pacificTime': 'Hora del Pacífico',
    'pakistanTime': 'Hora de Pakistán',
    'london': 'Londres',
  },
  fr: {
    // Common
    'save': 'Sauvegarder',
    'cancel': 'Annuler',
    'loading': 'Chargement...',
    'error': 'Erreur',
    'success': 'Succès',
    'close': 'Fermer',
    
    // Navigation
    'dashboard': 'Tableau de Bord',
    'profile': 'Profil',
    'settings': 'Paramètres',
    'notifications': 'Notifications',
    'logout': 'Déconnexion',
    'account': 'Compte',
    'welcomeBack': 'Bon retour',
    'overview': 'Aperçu',
    'myCourses': 'Mes Cours',
    'browseCourses': 'Parcourir les Cours',
    'liveSessions': 'Sessions en Direct',
    'tradingSignals': 'Signaux de Trading',
    'assignments': 'Devoirs',
               'certificates': 'Certificats',
           'community': 'Communauté',
           'students': 'Étudiants',
           'lessons': 'Leçons',
           'view': 'Voir',
           'availableCourses': 'Cours Disponibles',
           'courseDescription': 'Découvrez des cours dirigés par des experts conçus pour accélérer votre parcours de trading forex',
           'loadingCourses': 'Chargement des cours...',
           'instructor': 'Instructeur',
           'level': 'Niveau',
           'duration': 'Durée',
           'viewCourse': 'Voir le Cours',
           'enroll': 'S\'inscrire',
           'noSignalsAvailable': 'Aucun signal de trading disponible',
           'checkBackLater': 'Revenez plus tard pour de nouvelles opportunités de trading et des informations de marché de nos instructeurs experts',
    
    // Profile
    'firstName': 'Prénom',
    'lastName': 'Nom de Famille',
    'email': 'E-mail',
    'phone': 'Téléphone',
    'dateOfBirth': 'Date de Naissance',
    'address': 'Adresse',
    'bio': 'Biographie',
    'edit': 'Modifier',
    'saveChanges': 'Sauvegarder les Modifications',
    'cancelEdit': 'Annuler la Modification',
    
    // Settings
    'emailNotifications': 'Notifications par E-mail',
    'pushNotifications': 'Notifications Push',
    'marketingEmails': 'E-mails Marketing',
    'appearance': 'Apparence',
    'theme': 'Thème',
    'light': 'Clair',
    'dark': 'Sombre',
    'auto': 'Automatique (Système)',
    'regional': 'Régional',
    'language': 'Langue',
    'timezone': 'Fuseau Horaire',
    'security': 'Sécurité',
    'password': 'Mot de Passe',
    'changePassword': 'Changer le Mot de Passe',
    'twoFactorAuth': 'Authentification à Deux Facteurs',
    'enable': 'Activer',
    'disable': 'Désactiver',
    
    // Security
    'currentPassword': 'Mot de Passe Actuel',
    'newPassword': 'Nouveau Mot de Passe',
    'confirmPassword': 'Confirmer le Mot de Passe',
    'passwordRequirements': 'Le mot de passe doit contenir au moins 6 caractères',
    'passwordsDoNotMatch': 'Les mots de passe ne correspondent pas',
    'passwordChanged': 'Mot de passe modifié avec succès',
    'invalidCurrentPassword': 'Mot de passe actuel invalide',
    
    // 2FA
    'setup2FA': 'Configurer l\'Authentification à Deux Facteurs',
    'scanQRCode': 'Scannez ce code QR avec votre application d\'authentification',
    'enterCode': 'Entrez le code à 6 chiffres de votre application',
    'verify': 'Vérifier',
    'backupCodes': 'Codes de Sauvegarde',
    'saveBackupCodes': 'Sauvegardez ces codes de sauvegarde dans un endroit sûr',
    '2FAEnabled': 'Authentification à Deux Facteurs activée avec succès',
    '2FADisabled': 'Authentification à Deux Facteurs désactivée',
    
    // Timezones
    'UTC': 'UTC',
    'easternTime': 'Heure de l\'Est',
    'centralTime': 'Heure Centrale',
    'mountainTime': 'Heure des Montagnes',
    'pacificTime': 'Heure du Pacifique',
    'pakistanTime': 'Heure du Pakistan',
    'london': 'Londres',
  },
  de: {
    // Common
    'save': 'Speichern',
    'cancel': 'Abbrechen',
    'loading': 'Lädt...',
    'error': 'Fehler',
    'success': 'Erfolg',
    'close': 'Schließen',
    
    // Navigation
    'dashboard': 'Dashboard',
    'profile': 'Profil',
    'settings': 'Einstellungen',
    'notifications': 'Benachrichtigungen',
    'logout': 'Abmelden',
    'account': 'Konto',
    'welcomeBack': 'Willkommen zurück',
    'overview': 'Übersicht',
    'myCourses': 'Meine Kurse',
    'browseCourses': 'Kurse durchsuchen',
    'liveSessions': 'Live-Sitzungen',
    'tradingSignals': 'Trading-Signale',
    'assignments': 'Aufgaben',
    'certificates': 'Zertifikate',
    'community': 'Community',
               'students': 'Studenten',
           'lessons': 'Lektionen',
           'view': 'Anzeigen',
           'availableCourses': 'Verfügbare Kurse',
           'courseDescription': 'Entdecken Sie von Experten geleitete Kurse, die entwickelt wurden, um Ihre Forex-Trading-Reise zu beschleunigen',
           'loadingCourses': 'Kurse werden geladen...',
           'instructor': 'Ausbilder',
           'level': 'Niveau',
           'duration': 'Dauer',
           'viewCourse': 'Kurs Anzeigen',
           'enroll': 'Einschreiben',
           'noSignalsAvailable': 'Keine Trading-Signale verfügbar',
           'checkBackLater': 'Schauen Sie später wieder vorbei für neue Trading-Möglichkeiten und Markteinblicke von unseren Experten-Ausbildern',
    
    // Profile
    'firstName': 'Vorname',
    'lastName': 'Nachname',
    'email': 'E-Mail',
    'phone': 'Telefon',
    'dateOfBirth': 'Geburtsdatum',
    'address': 'Adresse',
    'bio': 'Biografie',
    'edit': 'Bearbeiten',
    'saveChanges': 'Änderungen Speichern',
    'cancelEdit': 'Bearbeitung Abbrechen',
    
    // Settings
    'emailNotifications': 'E-Mail-Benachrichtigungen',
    'pushNotifications': 'Push-Benachrichtigungen',
    'marketingEmails': 'Marketing-E-Mails',
    'appearance': 'Erscheinungsbild',
    'theme': 'Design',
    'light': 'Hell',
    'dark': 'Dunkel',
    'auto': 'Automatisch (System)',
    'regional': 'Regional',
    'language': 'Sprache',
    'timezone': 'Zeitzone',
    'security': 'Sicherheit',
    'password': 'Passwort',
    'changePassword': 'Passwort Ändern',
    'twoFactorAuth': 'Zwei-Faktor-Authentifizierung',
    'enable': 'Aktivieren',
    'disable': 'Deaktivieren',
    
    // Security
    'currentPassword': 'Aktuelles Passwort',
    'newPassword': 'Neues Passwort',
    'confirmPassword': 'Passwort Bestätigen',
    'passwordRequirements': 'Das Passwort muss mindestens 6 Zeichen lang sein',
    'passwordsDoNotMatch': 'Passwörter stimmen nicht überein',
    'passwordChanged': 'Passwort erfolgreich geändert',
    'invalidCurrentPassword': 'Ungültiges aktuelles Passwort',
    
    // 2FA
    'setup2FA': 'Zwei-Faktor-Authentifizierung Einrichten',
    'scanQRCode': 'Scannen Sie diesen QR-Code mit Ihrer Authentifizierungs-App',
    'enterCode': 'Geben Sie den 6-stelligen Code aus Ihrer App ein',
    'verify': 'Verifizieren',
    'backupCodes': 'Backup-Codes',
    'saveBackupCodes': 'Speichern Sie diese Backup-Codes an einem sicheren Ort',
    '2FAEnabled': 'Zwei-Faktor-Authentifizierung erfolgreich aktiviert',
    '2FADisabled': 'Zwei-Faktor-Authentifizierung deaktiviert',
    
    // Timezones
    'UTC': 'UTC',
    'easternTime': 'Ostzeit',
    'centralTime': 'Zentralzeit',
    'mountainTime': 'Bergzeit',
    'pacificTime': 'Pazifikzeit',
    'pakistanTime': 'Pakistan-Zeit',
    'london': 'London',
  },
  ar: {
    // Common
    'save': 'حفظ',
    'cancel': 'إلغاء',
    'loading': 'جاري التحميل...',
    'error': 'خطأ',
    'success': 'نجح',
    'close': 'إغلاق',
    
    // Navigation
    'dashboard': 'لوحة التحكم',
    'profile': 'الملف الشخصي',
    'settings': 'الإعدادات',
    'notifications': 'الإشعارات',
    'logout': 'تسجيل الخروج',
    'account': 'الحساب',
    'welcomeBack': 'مرحباً بعودتك',
    'overview': 'نظرة عامة',
    'myCourses': 'دوراتي',
    'browseCourses': 'تصفح الدورات',
    'liveSessions': 'الجلسات المباشرة',
    'tradingSignals': 'إشارات التداول',
    'assignments': 'المهام',
    'certificates': 'الشهادات',
    'community': 'المجتمع',
    'students': 'الطلاب',
    'lessons': 'الدروس',
    'view': 'عرض',
    'availableCourses': 'الدورات المتاحة',
    'courseDescription': 'اكتشف الدورات التي يقودها الخبراء والمصممة لتسريع رحلة التداول في الفوركس',
    'loadingCourses': 'جاري تحميل الدورات...',
    'instructor': 'المدرب',
    'level': 'المستوى',
    'duration': 'المدة',
    'viewCourse': 'عرض الدورة',
    'enroll': 'التسجيل',
    'noSignalsAvailable': 'لا توجد إشارات تداول متاحة',
    'checkBackLater': 'عد لاحقاً للحصول على فرص تداول جديدة ورؤى السوق من مدربينا الخبراء',
    
    // Profile
    'firstName': 'الاسم الأول',
    'lastName': 'اسم العائلة',
    'email': 'البريد الإلكتروني',
    'phone': 'الهاتف',
    'dateOfBirth': 'تاريخ الميلاد',
    'address': 'العنوان',
    'bio': 'السيرة الذاتية',
    'edit': 'تعديل',
    'saveChanges': 'حفظ التغييرات',
    'cancelEdit': 'إلغاء التعديل',
    
    // Settings
    'emailNotifications': 'إشعارات البريد الإلكتروني',
    'pushNotifications': 'الإشعارات الفورية',
    'marketingEmails': 'رسائل التسويق',
    'appearance': 'المظهر',
    'theme': 'المظهر',
    'light': 'فاتح',
    'dark': 'داكن',
    'auto': 'تلقائي (النظام)',
    'regional': 'إقليمي',
    'language': 'اللغة',
    'timezone': 'المنطقة الزمنية',
    'security': 'الأمان',
    'password': 'كلمة المرور',
    'changePassword': 'تغيير كلمة المرور',
    'twoFactorAuth': 'المصادقة الثنائية',
    'enable': 'تفعيل',
    'disable': 'إلغاء التفعيل',
    
    // Security
    'currentPassword': 'كلمة المرور الحالية',
    'newPassword': 'كلمة المرور الجديدة',
    'confirmPassword': 'تأكيد كلمة المرور',
    'passwordRequirements': 'يجب أن تكون كلمة المرور 6 أحرف على الأقل',
    'passwordsDoNotMatch': 'كلمات المرور غير متطابقة',
    'passwordChanged': 'تم تغيير كلمة المرور بنجاح',
    'invalidCurrentPassword': 'كلمة المرور الحالية غير صحيحة',
    
    // 2FA
    'setup2FA': 'إعداد المصادقة الثنائية',
    'scanQRCode': 'امسح رمز QR هذا باستخدام تطبيق المصادقة الخاص بك',
    'enterCode': 'أدخل الرمز المكون من 6 أرقام من تطبيقك',
    'verify': 'تحقق',
    'backupCodes': 'رموز النسخ الاحتياطي',
    'saveBackupCodes': 'احفظ رموز النسخ الاحتياطي هذه في مكان آمن',
    '2FAEnabled': 'تم تفعيل المصادقة الثنائية بنجاح',
    '2FADisabled': 'تم إلغاء تفعيل المصادقة الثنائية',
    
    // Timezones
    'UTC': 'التوقيت العالمي',
    'easternTime': 'التوقيت الشرقي',
    'centralTime': 'التوقيت المركزي',
    'mountainTime': 'توقيت الجبال',
    'pacificTime': 'التوقيت الباسيفيكي',
    'pakistanTime': 'توقيت باكستان',
    'london': 'لندن',
  }
};

export const LanguageProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>('en');

  useEffect(() => {
    // Load language from localStorage on mount
    const savedLanguage = localStorage.getItem('language') as Language;
    if (savedLanguage && translations[savedLanguage]) {
      setLanguageState(savedLanguage);
      // Update document direction immediately
      if (savedLanguage === 'ar') {
        document.documentElement.dir = 'rtl';
      } else {
        document.documentElement.dir = 'ltr';
      }
    }
    
    // Listen for language changes from other components
    const handleLanguageChange = (event: CustomEvent) => {
      const newLang = event.detail as Language;
      if (newLang && translations[newLang] && newLang !== language) {
        setLanguageState(newLang);
        localStorage.setItem('language', newLang);
        if (newLang === 'ar') {
          document.documentElement.dir = 'rtl';
        } else {
          document.documentElement.dir = 'ltr';
        }
      }
    };
    
    window.addEventListener('languageChanged', handleLanguageChange as EventListener);
    
    return () => {
      window.removeEventListener('languageChanged', handleLanguageChange as EventListener);
    };
  }, [language]);

  const setLanguage = (lang: Language) => {
    console.log('Language changing to:', lang);
    setLanguageState(lang);
    localStorage.setItem('language', lang);
    
    // Update document direction for RTL languages
    if (lang === 'ar') {
      document.documentElement.dir = 'rtl';
    } else {
      document.documentElement.dir = 'ltr';
    }
    
    // Force a re-render of all components using this context
    window.dispatchEvent(new CustomEvent('languageChanged', { detail: lang }));
    console.log('Language change event dispatched');
  };

  const t = (key: string): string => {
    return translations[language][key] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = (): LanguageContextType => {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
