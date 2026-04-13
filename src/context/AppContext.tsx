import React, { createContext, useContext, useState, useEffect } from 'react';

type Language = 'en' | 'es' | 'fr' | 'de' | 'hi';

interface AppContextType {
  darkMode: boolean;
  setDarkMode: (dark: boolean) => void;
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const translations: Record<Language, Record<string, string>> = {
  en: {
    settings: 'Settings',
    profile: 'Profile',
    preferences: 'Preferences',
    security: 'Security',
    notifications: 'Notifications',
    appearance: 'Appearance',
    darkMode: 'Dark Mode',
    language: 'Language',
    savePreferences: 'Save Preferences',
    saveSecurity: 'Save Security Settings',
    emailNotifications: 'Email Notifications',
    pushNotifications: 'Push Notifications',
    systemUpdates: 'System Updates',
    twoFactor: 'Two-Factor Auth',
    verifiedEmail: 'Verified Email',
    passwordManagement: 'Password Management',
    changePassword: 'Change Password',
    welcome: 'Welcome back',
    dashboard: 'Dashboard',
    home: 'Home',
    attendance: 'Attendance',
    grades: 'Grades',
    exams: 'Exams',
    announcements: 'Announcements',
    schedule: 'Schedule',
    logout: 'Logout',
    users: 'Users',
    classes: 'Classes',
    resources: 'Resources',
    students: 'Students',
    overview: 'Overview',
    manageProfile: 'Manage your profile, preferences and security',
    profileDetails: 'Profile Details',
    updateInfo: 'Update your personal and professional information',
    configureAlerts: 'Configure how you receive alerts',
    receiveEmail: 'Receive updates via email',
    receivePush: 'Receive alerts on your device',
    importantNews: 'Important platform news',
    customizeVisual: 'Customize your visual experience',
    switchDark: 'Switch to a darker theme',
    preferredLanguage: 'Preferred display language',
    keepProfileSafe: 'Keep your profile safe and secure',
    extraLayer: 'Add an extra layer of security',
    passwordLastChanged: 'Your password was last changed 3 months ago. We recommend updating it every 6 months.',
    academyName: 'Academy Name',
    rollNo: 'Roll No',
    class: 'Class'
  },
  es: {
    settings: 'Ajustes',
    profile: 'Perfil',
    preferences: 'Preferencias',
    security: 'Seguridad',
    notifications: 'Notificaciones',
    appearance: 'Apariencia',
    darkMode: 'Modo Oscuro',
    language: 'Idioma',
    savePreferences: 'Guardar Preferencias',
    saveSecurity: 'Guardar Ajustes de Seguridad',
    emailNotifications: 'Notificaciones por Correo',
    pushNotifications: 'Notificaciones Push',
    systemUpdates: 'Actualizaciones del Sistema',
    twoFactor: 'Autenticación de Dos Factores',
    verifiedEmail: 'Correo Verificado',
    passwordManagement: 'Gestión de Contraseñas',
    changePassword: 'Cambiar Contraseña',
    welcome: 'Bienvenido de nuevo',
    dashboard: 'Tablero',
    home: 'Inicio',
    attendance: 'Asistencia',
    grades: 'Calificaciones',
    exams: 'Exámenes',
    announcements: 'Anuncios',
    schedule: 'Horario',
    logout: 'Cerrar Sesión',
    users: 'Usuarios',
    classes: 'Clases',
    resources: 'Recursos',
    students: 'Estudiantes',
    overview: 'Resumen',
    manageProfile: 'Gestiona tu perfil, preferencias y seguridad',
    profileDetails: 'Detalles del Perfil',
    updateInfo: 'Actualiza tu información personal y profesional',
    configureAlerts: 'Configura cómo recibes las alertas',
    receiveEmail: 'Recibe actualizaciones por correo electrónico',
    receivePush: 'Recibe alertas en tu dispositivo',
    importantNews: 'Noticias importantes de la plataforma',
    customizeVisual: 'Personaliza tu experiencia visual',
    switchDark: 'Cambia a un tema más oscuro',
    preferredLanguage: 'Idioma de visualización preferido',
    keepProfileSafe: 'Mantén tu perfil seguro y protegido',
    extraLayer: 'Añade una capa extra de seguridad',
    passwordLastChanged: 'Tu contraseña fue cambiada por última vez hace 3 meses. Recomendamos actualizarla cada 6 meses.',
    academyName: 'Nombre de la Academia',
    rollNo: 'Número de Lista',
    class: 'Clase'
  },
  fr: {
    settings: 'Paramètres',
    profile: 'Profil',
    preferences: 'Préférences',
    security: 'Sécurité',
    notifications: 'Notifications',
    appearance: 'Apparence',
    darkMode: 'Mode Sombre',
    language: 'Langue',
    savePreferences: 'Enregistrer les Préférences',
    saveSecurity: 'Enregistrer les Paramètres de Sécurité',
    emailNotifications: 'Notifications par Email',
    pushNotifications: 'Notifications Push',
    systemUpdates: 'Mises à jour du Système',
    twoFactor: 'Authentification à Deux Facteurs',
    verifiedEmail: 'Email Vérifié',
    passwordManagement: 'Gestion des Mots de Passe',
    changePassword: 'Modifier le Mot de Passe',
    welcome: 'Bon retour',
    dashboard: 'Tableau de Bord',
    home: 'Accueil',
    attendance: 'Présence',
    grades: 'Notes',
    exams: 'Examens',
    announcements: 'Annonces',
    schedule: 'Emploi du Temps',
    logout: 'Déconnexion',
    users: 'Utilisateurs',
    classes: 'Classes',
    resources: 'Ressources',
    students: 'Étudiants',
    overview: 'Aperçu',
    manageProfile: 'Gérez votre profil, vos préférences et votre sécurité',
    profileDetails: 'Détails du Profil',
    updateInfo: 'Mettez à jour vos informations personnelles et professionnelles',
    configureAlerts: 'Configurez la manière dont vous recevez les alertes',
    receiveEmail: 'Recevez des mises à jour par email',
    receivePush: 'Recevez des alertes sur votre appareil',
    importantNews: 'Nouvelles importantes de la plateforme',
    customizeVisual: 'Personnalisez votre expérience visuelle',
    switchDark: 'Passez à un thème plus sombre',
    preferredLanguage: 'Langue d\'affichage préférée',
    keepProfileSafe: 'Gardez votre profil sûr et sécurisé',
    extraLayer: 'Ajoutez une couche de sécurité supplémentaire',
    passwordLastChanged: 'Votre mot de passe a été modifié pour la dernière fois il y a 3 mois. Nous vous recommandons de le mettre à jour tous les 6 mois.',
    academyName: 'Nom de l\'Académie',
    rollNo: 'N° de Rôle',
    class: 'Classe'
  },
  de: {
    settings: 'Einstellungen',
    profile: 'Profil',
    preferences: 'Präferenzen',
    security: 'Sicherheit',
    notifications: 'Benachrichtigungen',
    appearance: 'Erscheinungsbild',
    darkMode: 'Dunkelmodus',
    language: 'Sprache',
    savePreferences: 'Präferenzen Speichern',
    saveSecurity: 'Sicherheitseinstellungen Speichern',
    emailNotifications: 'E-Mail-Benachrichtigungen',
    pushNotifications: 'Push-Benachrichtigungen',
    systemUpdates: 'System-Updates',
    twoFactor: 'Zwei-Faktor-Authentifizierung',
    verifiedEmail: 'Verifizierte E-Mail',
    passwordManagement: 'Passwort-Management',
    changePassword: 'Passwort Ändern',
    welcome: 'Willkommen zurück',
    dashboard: 'Dashboard',
    home: 'Startseite',
    attendance: 'Anwesenheit',
    grades: 'Noten',
    exams: 'Prüfungen',
    announcements: 'Ankündigungen',
    schedule: 'Zeitplan',
    logout: 'Abmelden',
    users: 'Benutzer',
    classes: 'Klassen',
    resources: 'Ressourcen',
    students: 'Schüler',
    overview: 'Übersicht',
    manageProfile: 'Verwalten Sie Ihr Profil, Ihre Präferenzen und Ihre Sicherheit',
    profileDetails: 'Profil-Details',
    updateInfo: 'Aktualisieren Sie Ihre persönlichen und beruflichen Informationen',
    configureAlerts: 'Konfigurieren Sie, wie Sie Alarme erhalten',
    receiveEmail: 'Erhalten Sie Updates per E-Mail',
    receivePush: 'Erhalten Sie Alarme auf Ihrem Gerät',
    importantNews: 'Wichtige Plattform-Neuigkeiten',
    customizeVisual: 'Passen Sie Ihr visuelles Erlebnis an',
    switchDark: 'Wechseln Sie zu einem dunkleren Thema',
    preferredLanguage: 'Bevorzugte Anzeigesprache',
    keepProfileSafe: 'Halten Sie Ihr Profil sicher und geschützt',
    extraLayer: 'Fügen Sie eine zusätzliche Sicherheitsebene hinzu',
    passwordLastChanged: 'Ihr Passwort wurde zuletzt vor 3 Monaten geändert. Wir empfehlen, es alle 6 Monate zu aktualisieren.',
    academyName: 'Name der Akademie',
    rollNo: 'Rollennummer',
    class: 'Klasse'
  },
  hi: {
    settings: 'सेटिंग्स',
    profile: 'प्रोफ़ाइल',
    preferences: 'प्राथमिकताएं',
    security: 'सुरक्षा',
    notifications: 'सूचनाएं',
    appearance: 'दिखावट',
    darkMode: 'डार्क मोड',
    language: 'भाषा',
    savePreferences: 'प्राथमिकताएं सहेजें',
    saveSecurity: 'सुरक्षा सेटिंग्स सहेजें',
    emailNotifications: 'ईमेल सूचनाएं',
    pushNotifications: 'पुश सूचनाएं',
    systemUpdates: 'सिस्टम अपडेट',
    twoFactor: 'टू-फैक्टर ऑथेंटिकेशन',
    verifiedEmail: 'सत्यापित ईमेल',
    passwordManagement: 'पासवर्ड प्रबंधन',
    changePassword: 'पासवर्ड बदलें',
    welcome: 'वापसी पर स्वागत है',
    dashboard: 'डैशबोर्ड',
    home: 'होम',
    attendance: 'उपस्थिति',
    grades: 'ग्रेड',
    exams: 'परीक्षाएं',
    announcements: 'घोषणाएं',
    schedule: 'अनुसूची',
    logout: 'लॉगआउट',
    users: 'उपयोगकर्ता',
    classes: 'कक्षाएं',
    resources: 'संसाधन',
    students: 'छात्र',
    overview: 'अवलोकन',
    manageProfile: 'अपनी प्रोफ़ाइल, प्राथमिकताओं और सुरक्षा का प्रबंधन करें',
    profileDetails: 'प्रोफ़ाइल विवरण',
    updateInfo: 'अपनी व्यक्तिगत और व्यावसायिक जानकारी अपडेट करें',
    configureAlerts: 'कॉन्फ़िगर करें कि आप अलर्ट कैसे प्राप्त करते हैं',
    receiveEmail: 'ईमेल के माध्यम से अपडेट प्राप्त करें',
    receivePush: 'अपने डिवाइस पर अलर्ट प्राप्त करें',
    importantNews: 'महत्वपूर्ण प्लेटफॉर्म समाचार',
    customizeVisual: 'अपने दृश्य अनुभव को अनुकूलित करें',
    switchDark: 'डार्क थीम पर स्विच करें',
    preferredLanguage: 'पसंदीदा प्रदर्शन भाषा',
    keepProfileSafe: 'अपनी प्रोफ़ाइल को सुरक्षित रखें',
    extraLayer: 'सुरक्षा की एक अतिरिक्त परत जोड़ें',
    passwordLastChanged: 'आपका पासवर्ड आखिरी बार 3 महीने पहले बदला गया था। हम इसे हर 6 महीने में अपडेट करने की सलाह देते हैं।',
    academyName: 'अकादमी का नाम',
    rollNo: 'रोल नंबर',
    class: 'कक्षा'
  }
};

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [darkMode, setDarkModeState] = useState(() => {
    return localStorage.getItem('darkMode') === 'true';
  });
  const [language, setLanguageState] = useState<Language>(() => {
    return (localStorage.getItem('language') as Language) || 'en';
  });

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('darkMode', darkMode.toString());
  }, [darkMode]);

  useEffect(() => {
    localStorage.setItem('language', language);
  }, [language]);

  const setDarkMode = (dark: boolean) => setDarkModeState(dark);
  const setLanguage = (lang: Language) => setLanguageState(lang);

  const t = (key: string) => {
    return translations[language][key] || translations['en'][key] || key;
  };

  return (
    <AppContext.Provider value={{ darkMode, setDarkMode, language, setLanguage, t }}>
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
};
