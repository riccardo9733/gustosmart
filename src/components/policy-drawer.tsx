"use client";

import { useState, useEffect } from "react";
import { useLocale } from "next-intl";
import {
  ShieldCheck,
  Cookie,
  X,
  Lock,
  Scale,
  Database,
  Eye,
  Mail,
  UserCheck,
  Globe,
  SunMoon,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { selectUserProfile, setUserSuccess } from "@/store/userSlice";
import { getFirebaseDb } from "@/lib/firebase";
import { doc, setDoc } from "firebase/firestore";
import { toast } from "sonner";

interface PolicyDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  type: "privacy" | "cookie" | null;
}

export function PolicyDrawer({ isOpen, onClose, type }: PolicyDrawerProps) {
  const locale = useLocale() as "it" | "en" | "es" | "fr";
  const dispatch = useAppDispatch();
  const profile = useAppSelector(selectUserProfile);
  const [allowTracking, setAllowTracking] = useState(true);

  useEffect(() => {
    if (typeof window !== "undefined" && isOpen) {
      if (profile?.preferences?.hasOwnProperty("allowTracking")) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setAllowTracking(profile.preferences.allowTracking !== false);
      } else {
        const localVal = localStorage.getItem("gustosmart_allow_tracking") !== "false";
        setAllowTracking(localVal);
      }
    }
  }, [profile, isOpen]);

  const handleToggleTracking = async () => {
    const newValue = !allowTracking;
    setAllowTracking(newValue);

    if (typeof window !== "undefined") {
      localStorage.setItem("gustosmart_allow_tracking", String(newValue));
    }

    if (profile) {
      try {
        const db = getFirebaseDb();
        const userRef = doc(db, "users", profile.uid);
        const updatedPreferences = {
          ...profile.preferences,
          allowTracking: newValue,
        };

        await setDoc(
          userRef,
          {
            preferences: updatedPreferences,
            updatedAt: new Date().toISOString(),
          },
          { merge: true }
        );

        dispatch(
          setUserSuccess({
            ...profile,
            preferences: updatedPreferences,
          })
        );

        toast.success(
          locale === "it"
            ? "Preferenze di tracciamento aggiornate"
            : locale === "es"
            ? "Preferencias de seguimiento actualizadas"
            : locale === "fr"
            ? "Préférences de suivi mises à jour"
            : "Tracking preferences updated"
        );
      } catch (error) {
        console.error("Error updating tracking consent:", error);
        toast.error(
          locale === "it"
            ? "Errore durante l'aggiornamento del tracciamento"
            : locale === "es"
            ? "Error al actualizar las preferencias de seguimiento"
            : locale === "fr"
            ? "Erreur lors de la mise à jour des préférences de suivi"
            : "Failed to update tracking preferences"
        );
        setAllowTracking(allowTracking); // revert state
      }
    } else {
      toast.success(
        locale === "it"
          ? "Preferenze salvate localmente"
          : locale === "es"
          ? "Preferencias guardadas localmente"
          : locale === "fr"
          ? "Préférences enregistrées localement"
          : "Preferences saved locally"
      );
    }
  };

  if (!type) return null;

  const content = policiesData[locale]?.[type] || policiesData["en"][type];

  return (
    <Drawer open={isOpen} onOpenChange={(open) => !open && onClose()} repositionInputs={false}>
      <DrawerContent className="max-h-[85vh] p-6 rounded-t-[32px] border-t border-white/20 bg-background dark:bg-surface-container/95 backdrop-blur-xl">
        {/* Screen Reader Only for Accessibility */}
        <div className="sr-only">
          <DrawerTitle>{content.title}</DrawerTitle>
          <DrawerDescription>{content.subtitle}</DrawerDescription>
        </div>

        <div className="flex flex-col gap-5 max-w-2xl mx-auto w-full pb-8">
          <DrawerHeader className="p-0 flex flex-row items-center justify-between border-b border-white/10 pb-4">
            <div className="flex items-center gap-3">
              <div className="bg-primary/10 dark:bg-primary/20 p-2.5 rounded-2xl text-primary shrink-0">
                {type === "privacy" ? (
                  <ShieldCheck className="h-6 w-6" />
                ) : (
                  <Cookie className="h-6 w-6 animate-pulse" />
                )}
              </div>
              <div className="text-left">
                <h2 className="font-heading text-xl font-bold tracking-tight text-foreground">
                  {content.title}
                </h2>
                <p className="text-[11px] font-medium text-muted-foreground">
                  {content.lastUpdated}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-full hover:bg-white/10 dark:hover:bg-white/5 transition-colors cursor-pointer text-muted-foreground hover:text-foreground"
              aria-label="Chiudi"
            >
              <X className="h-5 w-5" />
            </button>
          </DrawerHeader>

          {/* Subtitle intro */}
          <p className="text-sm text-muted-foreground leading-relaxed px-1">
            {content.subtitle}
          </p>

          {/* Scrollable Policy Content */}
          <div className="overflow-y-auto max-h-[55vh] pr-2 space-y-4 scrollbar-thin scrollbar-thumb-muted">
            {/* Render Switch if it is cookie policy */}
            {type === "cookie" && (
              <div className="glass-panel border border-white/20 dark:border-white/10 p-5 rounded-2xl shadow-sm flex items-center justify-between gap-4">
                <div className="space-y-1">
                  <h4 className="font-heading text-sm font-bold text-foreground">
                    {locale === "it"
                      ? "Consenti tracciamento e diagnostica"
                      : locale === "es"
                      ? "Permitir seguimiento y diagnóstico"
                      : locale === "fr"
                      ? "Autoriser le suivi et les diagnostics"
                      : "Allow tracking and diagnostics"}
                  </h4>
                  <p className="text-xs text-muted-foreground leading-normal">
                    {locale === "it"
                      ? "Attivando questa opzione ci aiuti a monitorare le prestazioni (Better Stack) e l'utilizzo dell'app (GA4) per correggere gli errori."
                      : locale === "es"
                      ? "Activar esta opción nos ayuda a supervisar el rendimiento (Better Stack) y el uso de la aplicación (GA4) para corregir errores."
                      : locale === "fr"
                      ? "Activer cette option nous aide à surveiller les performances (Better Stack) et l'utilisation de l'application (GA4) pour corriger les erreurs."
                      : "Enabling this option helps us monitor performance (Better Stack) and app usage (GA4) to resolve errors."}
                  </p>
                </div>
                <button
                  role="switch"
                  aria-checked={allowTracking}
                  onClick={handleToggleTracking}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${
                    allowTracking ? "bg-primary" : "bg-muted-foreground/30"
                  }`}
                >
                  <span
                    aria-hidden="true"
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                      allowTracking ? "translate-x-5" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>
            )}

            {content.sections.map((section, index) => {
              const IconComponent = getIcon(section.icon);
              return (
                <div
                  key={index}
                  className="glass-panel border border-white/20 dark:border-white/10 p-5 rounded-2xl shadow-sm hover:shadow-md transition-shadow duration-300"
                >
                  <div className="flex items-center gap-3 mb-2.5">
                    <div className="text-primary/80 bg-primary/5 p-2 rounded-xl shrink-0">
                      <IconComponent className="h-4.5 w-4.5" />
                    </div>
                    <h3 className="font-heading text-sm font-bold text-foreground">
                      {section.title}
                    </h3>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed whitespace-pre-line pl-0.5">
                    {section.text}
                  </p>
                </div>
              );
            })}

            {/* Render dynamic cookie table if it is cookie policy */}
            {type === "cookie" && content.cookiesList && (
              <div className="glass-panel border border-white/20 dark:border-white/10 p-5 rounded-2xl shadow-sm overflow-x-auto">
                <div className="flex items-center gap-3 mb-4">
                  <div className="text-primary/80 bg-primary/5 p-2 rounded-xl shrink-0">
                    <Database className="h-4.5 w-4.5" />
                  </div>
                  <h3 className="font-heading text-sm font-bold text-foreground">
                    {locale === "it"
                      ? "Elenco dei Cookie Utilizzati"
                      : locale === "es"
                      ? "Lista de Cookies Utilizadas"
                      : locale === "fr"
                      ? "Liste des Cookies Utilisés"
                      : "List of Cookies Used"}
                  </h3>
                </div>
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-white/10 text-muted-foreground font-semibold">
                      <th className="pb-2 pr-3 font-semibold">Cookie</th>
                      <th className="pb-2 px-3 font-semibold">Type</th>
                      <th className="pb-2 px-3 font-semibold">Purpose</th>
                      <th className="pb-2 pl-3 font-semibold">Duration</th>
                    </tr>
                  </thead>
                  <tbody>
                    {content.cookiesList.map((c, i) => (
                      <tr key={i} className="border-b border-white/5 last:border-0">
                        <td className="py-2.5 pr-3 font-mono font-medium text-primary">
                          {c.name}
                        </td>
                        <td className="py-2.5 px-3 text-foreground">{c.type}</td>
                        <td className="py-2.5 px-3 text-muted-foreground leading-normal max-w-xs">
                          {c.purpose}
                        </td>
                        <td className="py-2.5 pl-3 text-muted-foreground whitespace-nowrap">
                          {c.duration}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Close Action Button */}
          <div className="flex justify-end pt-2 border-t border-white/10 mt-1">
            <Button
              onClick={onClose}
              className="terracotta-gradient text-white rounded-xl text-xs font-bold px-6 py-4.5 hover:scale-[1.02] active:scale-[0.98] transition-transform cursor-pointer"
            >
              {locale === "it"
                ? "Ho letto"
                : locale === "es"
                ? "Entendido"
                : locale === "fr"
                ? "Fermer"
                : "Got it"}
            </Button>
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
}

function getIcon(iconName: string) {
  switch (iconName) {
    case "user":
      return UserCheck;
    case "database":
      return Database;
    case "lock":
      return Lock;
    case "scale":
      return Scale;
    case "eye":
      return Eye;
    case "mail":
      return Mail;
    case "globe":
      return Globe;
    case "sunmoon":
      return SunMoon;
    case "zap":
      return Zap;
    default:
      return ShieldCheck;
  }
}

interface PolicySection {
  title: string;
  text: string;
  icon: string;
}

interface CookieRow {
  name: string;
  type: string;
  purpose: string;
  duration: string;
}

interface PolicyLocaleData {
  title: string;
  subtitle: string;
  lastUpdated: string;
  sections: PolicySection[];
  cookiesList?: CookieRow[];
}

const policiesData: Record<
  "it" | "en" | "es" | "fr",
  { privacy: PolicyLocaleData; cookie: PolicyLocaleData }
> = {
  it: {
    privacy: {
      title: "Informativa sulla Privacy",
      subtitle: "GustoSmart tiene alla protezione dei tuoi dati personali. Di seguito trovi le informazioni su quali dati raccogliamo, perché e come li trattiamo quando utilizzi la nostra app.",
      lastUpdated: "Ultimo aggiornamento: Giugno 2026",
      sections: [
        {
          icon: "lock",
          title: "Titolare del Trattamento",
          text: "Il trattamento dei dati personali è gestito da [Titolare del Trattamento] come sviluppatore dell'applicazione GustoSmart. Per qualsiasi domanda o richiesta relativa alla tua privacy, puoi contattarci all'indirizzo email: [Email di Contatto].",
        },
        {
          icon: "user",
          title: "Dati personali che raccogliamo",
          text: "Raccogliamo i seguenti dati forniti direttamente da te o dal tuo account Google:\n• Nome completo e indirizzo email.\n• Foto del profilo (se caricata o ricavata dall'account Google).\n• Preferenze dell'applicazione (lingua selezionata, tema grafico chiaro/scuro e unità di misura metrica/imperiale).\n• Stato e conteggio dei token di utilizzo per l'importazione delle ricette.",
        },
        {
          icon: "database",
          title: "Dati culinari e di utilizzo",
          text: "Per offrirti le funzionalità smart, salviamo nei nostri database:\n• I link dei video e delle pagine web che decidi di scansionare.\n• Le ricette generate dall'IA, comprensive di ingredienti, passaggi, valori nutrizionali stimati, porzioni e categorie.\n• Le tue cartelle personalizzate e l'elenco degli ingredienti salvati nella lista della spesa.",
        },
        {
          icon: "zap",
          title: "Finalità del trattamento",
          text: "I tuoi dati vengono trattati esclusivamente per:\n• Consentirti l'accesso sicuro e il salvataggio persistente del tuo ricettario.\n• Fornirti il servizio di scansione automatica delle ricette tramite intelligenza artificiale.\n• Permetterti di creare varianti personalizzate delle ricette (es. versioni vegane, senza glutine, light) e generare la lista della spesa.\n• Gestire le notifiche relative ai timer di cottura attivi.",
        },
        {
          icon: "eye",
          title: "Condivisione con terze parti",
          text: "GustoSmart non vende i tuoi dati personali. Per il funzionamento dell'app, ci avvaliamo di fornitori tecnologici esterni:\n• Google Firebase/Firestore: per l'autenticazione sicura e il salvataggio del database in cloud.\n• API di Intelligenza Artificiale (es. OpenAI): per estrarre e strutturare gli ingredienti e i passaggi a partire da video e pagine web in modo anonimo.\n• ScrapeCreators API: per recuperare i testi pubblici dei video social che decidi di importare.",
        },
        {
          icon: "scale",
          title: "I tuoi diritti e cancellazione dei dati",
          text: "Ai sensi del GDPR, hai il diritto di accedere ai tuoi dati personali, correggerli o richiederne la cancellazione. Puoi eliminare definitivamente il tuo account e tutti i dati ad esso collegati in qualsiasi momento cliccando sul pulsante \"Elimina Account\" situato all'interno della pagina del tuo profilo.",
        },
      ],
    },
    cookie: {
      title: "Informativa sui Cookie",
      subtitle: "GustoSmart utilizza esclusivamente cookie tecnici essenziali. Non utilizziamo cookie di tracciamento, profilazione o pubblicità di terze parti. Di seguito trovi i dettagli su come gestiamo queste informazioni.",
      lastUpdated: "Ultimo aggiornamento: Giugno 2026",
      sections: [
        {
          icon: "lock",
          title: "Cosa sono i cookie tecnici?",
          text: "I cookie sono piccoli file di testo salvati sul tuo dispositivo durante la navigazione. I cookie tecnici servono unicamente a far funzionare l'applicazione o a salvare le tue preferenze d'uso. Poiché sono strettamente necessari per l'erogazione del servizio, la normativa (GDPR) non richiede il tuo consenso esplicito per la loro attivazione, ma è fondamentale darti modo di conoscerli.",
        },
        {
          icon: "database",
          title: "Come gestiamo i cookie",
          text: "I cookie tecnici usati da GustoSmart servono a mantenere attiva la tua sessione di login, ricordare la lingua dell'interfaccia e salvare il tema visivo selezionato. Se decidi di disattivare questi cookie tramite le impostazioni del tuo browser, non potrai effettuare l'accesso a GustoSmart o salvare le tue preferenze.",
        },
      ],
      cookiesList: [
        {
          name: "firebase_auth",
          type: "Tecnico / Sessione",
          purpose: "Mantiene l'autenticazione e la sessione dell'utente attiva per evitare di dover reinserire le credenziali ad ogni accesso.",
          duration: "Persistente / Sessione",
        },
        {
          name: "NEXT_LOCALE",
          type: "Tecnico / Preferenza",
          purpose: "Memorizza la lingua selezionata dall'utente (Italiano, Inglese, Spagnolo, Francese) per visualizzare correttamente i testi dell'app.",
          duration: "1 anno",
        },
        {
          name: "theme",
          type: "Tecnico / Preferenza",
          purpose: "Memorizza la scelta del tema grafico dell'utente (Chiaro, Scuro, Sistema) gestito tramite next-themes.",
          duration: "Persistente",
        },
      ],
    },
  },
  en: {
    privacy: {
      title: "Privacy Policy",
      subtitle: "GustoSmart is committed to protecting your personal data. Below is information on what data we collect, why, and how we process it when you use our app.",
      lastUpdated: "Last updated: June 2026",
      sections: [
        {
          icon: "lock",
          title: "Data Controller",
          text: "Personal data processing is managed by [Titolare del Trattamento] as the developer of the GustoSmart application. For any questions or requests regarding your privacy, you can contact us at: [Email di Contatto].",
        },
        {
          icon: "user",
          title: "Personal Data We Collect",
          text: "We collect the following data provided directly by you or retrieved from your Google account:\n• Full name and email address.\n• Profile picture (if uploaded or retrieved from your Google account).\n• Application preferences (selected language, light/dark graphic theme, and metric/imperial measurement unit).\n• Status and count of usage tokens for recipe imports.",
        },
        {
          icon: "database",
          title: "Culinary and Usage Data",
          text: "To provide smart features, we save in our databases:\n• The links to videos and web pages you choose to scan.\n• AI-generated recipes, including ingredients, preparation steps, estimated nutritional values, servings, and categories.\n• Your custom recipe folders and the items in your shopping list.",
        },
        {
          icon: "zap",
          title: "Purposes of Processing",
          text: "Your data is processed exclusively to:\n• Allow secure login and persistent saving of your recipe book.\n• Provide the automated recipe scanning service via artificial intelligence.\n• Allow you to generate personalized recipe variants (e.g., vegan, gluten-free, light versions) and create your smart shopping list.\n• Manage active cooking timer notifications.",
        },
        {
          icon: "eye",
          title: "Sharing with Third Parties",
          text: "GustoSmart does not sell your personal data. To run the app, we use external technology providers:\n• Google Firebase/Firestore: for secure authentication and cloud database storage.\n• Artificial Intelligence APIs (e.g., OpenAI): to anonymously extract and structure ingredients and steps from videos and web pages.\n• ScrapeCreators API: to retrieve public texts from social media posts you choose to import.",
        },
        {
          icon: "scale",
          title: "Your Rights and Data Deletion",
          text: "Under GDPR, you have the right to access, correct, or request the deletion of your personal data. You can permanently delete your account and all associated data at any time by clicking the \"Delete Account\" button in your Profile Settings page.",
        },
      ],
    },
    cookie: {
      title: "Cookie Policy",
      subtitle: "GustoSmart uses strictly technical cookies. We do not use tracking, profiling, or third-party advertising cookies. Below are the details of how we handle this information.",
      lastUpdated: "Last updated: June 2026",
      sections: [
        {
          icon: "lock",
          title: "What are technical cookies?",
          text: "Cookies are small text files saved on your device during browsing. Technical cookies are used solely to make the application work or to save your usage preferences. Since they are strictly necessary to provide the service, GDPR does not require your explicit consent to enable them, but it is essential to let you know about them.",
        },
        {
          icon: "database",
          title: "How we manage cookies",
          text: "The technical cookies used by GustoSmart serve to keep your login session active, remember the interface language, and save the selected visual theme. If you decide to disable these cookies through your browser settings, you will not be able to log in to GustoSmart or save your preferences.",
        },
      ],
      cookiesList: [
        {
          name: "firebase_auth",
          type: "Technical / Session",
          purpose: "Maintains user authentication and keeps your session active to avoid having to re-enter credentials on every visit.",
          duration: "Persistent / Session",
        },
        {
          name: "NEXT_LOCALE",
          type: "Technical / Preference",
          purpose: "Stores the user's selected language (Italian, English, Spanish, French) to display translation strings properly.",
          duration: "1 year",
        },
        {
          name: "theme",
          type: "Technical / Preference",
          purpose: "Stores the user's graphic theme preference (Light, Dark, System) managed via next-themes.",
          duration: "Persistent",
        },
      ],
    },
  },
  es: {
    privacy: {
      title: "Política de Privacidad",
      subtitle: "GustoSmart se compromete a proteger sus datos personales. A continuación, se detalla qué datos recopilamos, por qué y cómo los tratamos al usar nuestra app.",
      lastUpdated: "Última actualización: Junio 2026",
      sections: [
        {
          icon: "lock",
          title: "Responsable del Tratamiento",
          text: "El tratamiento de los datos personales está gestionado por [Titolare del Trattamento] como desarrollador de la aplicación GustoSmart. Para cualquier pregunta o solicitud relacionada con su privacidad, puede contactarnos en: [Email di Contatto].",
        },
        {
          icon: "user",
          title: "Datos Personales que Recopilamos",
          text: "Recopilamos los siguientes datos proporcionados directamente por usted o recuperados de su cuenta de Google:\n• Nombre completo y dirección de correo electrónico.\n• Foto de perfil (si se sube o se obtiene de su cuenta de Google).\n• Preferencias de la aplicación (idioma seleccionado, tema gráfico claro/oscuro y unidad de medida métrica/imperial).\n• Estado y conteo de tokens de uso para las importaciones de recetas.",
        },
        {
          icon: "database",
          title: "Datos Culinarios y de Uso",
          text: "Para ofrecer funciones inteligentes, guardamos en nuestras bases de datos:\n• Los enlaces a videos y páginas web que elija escanear.\n• Recetas generadas por IA, incluidos ingredientes, pasos de preparación, valores nutricionales estimados, porciones y categorías.\n• Sus carpetas de recetas personalizadas y los artículos de su lista de la compra.",
        },
        {
          icon: "zap",
          title: "Finalidades del Tratamiento",
          text: "Sus datos se procesan exclusivamente para:\n• Permitir el acceso seguro y el guardado persistente de su libro de recetas.\n• Proporcionar el servicio de escaneo automático de recetas mediante inteligencia artificial.\n• Permitirle generar variantes de recetas personalizadas (ej. versiones veganas, sin gluten, light) y crear su lista de compra inteligente.\n• Gestionar las notificaciones de los temporizadores de cocina activos.",
        },
        {
          icon: "eye",
          title: "Compartir con Terceros",
          text: "GustoSmart no vende sus datos personales. Para el funcionamiento de la app, utilizamos proveedores de tecnología externos:\n• Google Firebase/Firestore: para autenticación segura y almacenamiento de la base de datos en la nube.\n• API de Inteligencia Artificial (ej. OpenAI): para extraer y estructurar de forma anónima ingredientes y pasos de videos y páginas web.\n• ScrapeCreators API: para recuperar textos públicos de publicaciones de redes sociales que elija importar.",
        },
        {
          icon: "scale",
          title: "Sus Derechos y Eliminación de Datos",
          text: "Según el GDPR, tiene derecho a acceder, corregir o solicitar la eliminación de sus datos personales. Puede eliminar de forma permanente su cuenta y todos los datos asociados en cualquier momento haciendo clic en el botón \"Eliminar Cuenta\" dentro de la página de Perfil.",
        },
      ],
    },
    cookie: {
      title: "Política de Cookies",
      subtitle: "GustoSmart utiliza exclusivamente cookies técnicas esenciales. No utilizamos cookies de seguimiento, creación de perfiles ni publicidad de terceros. A continuación se detallan cómo tratamos esta información.",
      lastUpdated: "Última actualización: Junio 2026",
      sections: [
        {
          icon: "lock",
          title: "¿Qué son las cookies técnicas?",
          text: "Las cookies son pequeños archivos de texto que se guardan en su dispositivo al navegar. Las cookies técnicas sirven únicamente para que la aplicación funcione o para guardar sus preferencias de uso. Dado que son estrictamente necesarias para prestar el servicio, el GDPR no requiere su consentimiento explícito para habilitarlas, pero es fundamental que las conozca.",
        },
        {
          icon: "database",
          title: "Cómo gestionamos las cookies",
          text: "Las cookies técnicas utilizadas por GustoSmart sirven para mantener activa su sesión de inicio de sesión, recordar el idioma de la interfaz y guardar el tema visual seleccionado. Si decide desactivar estas cookies a través de la configuración de su navegador, no podrá iniciar sesión en GustoSmart ni guardar sus preferencias.",
        },
      ],
      cookiesList: [
        {
          name: "firebase_auth",
          type: "Técnica / Sesión",
          purpose: "Mantiene la autenticación y la sesión del usuario activa para evitar tener que volver a introducir credenciales en cada visita.",
          duration: "Persistente / Sesión",
        },
        {
          name: "NEXT_LOCALE",
          type: "Técnica / Preferencia",
          purpose: "Memoriza el idioma seleccionado por el usuario (italiano, inglés, español, francés) para mostrar correctamente los textos de la app.",
          duration: "1 año",
        },
        {
          name: "theme",
          type: "Técnica / Preferencia",
          purpose: "Memoriza la preferencia de tema gráfico del usuario (claro, oscuro, sistema) gestionado a través de next-themes.",
          duration: "Persistente",
        },
      ],
    },
  },
  fr: {
    privacy: {
      title: "Politique de Confidentialité",
      subtitle: "GustoSmart s'engage à protéger vos données personnelles. Vous trouverez ci-dessous des informations sur les données que nous collectons, pourquoi et comment nous les traitons lorsque vous utilisez notre application.",
      lastUpdated: "Dernière mise à jour: Juin 2026",
      sections: [
        {
          icon: "lock",
          title: "Responsable du Traitement",
          text: "Le traitement des données personnelles est géré par [Titolare del Trattamento] en tant que développeur de l'application GustoSmart. Pour toute question ou demande concernant votre vie privée, vous pouvez nous contacter à: [Email di Contatto].",
        },
        {
          icon: "user",
          title: "Données Personnelles que Nous Collectons",
          text: "Nous collectons les données suivantes fournies directement par vous ou récupérées à partir de votre compte Google :\n• Nom complet et adresse e-mail.\n• Photo de profil (si elle est téléchargée ou récupérée à partir de votre compte Google).\n• Préférences de l'application (langue sélectionnée, thème graphique clair/sombre et unité de mesure métrique/impériale).\n• Statut et nombre de jetons d'utilisation pour les importations de recettes.",
        },
        {
          icon: "database",
          title: "Données Culinaires et d'Utilisation",
          text: "Pour vous proposer des fonctionnalités intelligentes, nous sauvegardons dans nos bases de données :\n• Les liens vers les vidéos et les pages web que vous choisissez de scanner.\n• Les recettes générées par l'IA, y compris les ingrédients, les étapes de préparation, les valeurs nutritionnelles estimées, les portions et les catégories.\n• Vos dossiers de recettes personnalisés et les articles de votre liste de courses.",
        },
        {
          icon: "zap",
          title: "Finalités du Traitement",
          text: "Vos données sont traitées exclusivement pour :\n• Permettre une connexion sécurisée et une sauvegarde persistante de votre carnet de recettes.\n• Fournir le service de scan automatique de recettes via l'intelligence artificielle.\n• Vous permettre de générer des variantes de recettes personnalisées (ex. versions végétaliennes, sans gluten, légères) et de créer votre liste de courses intelligente.\n• Gérer les notifications de minuteurs de cuisson actifs.",
        },
        {
          icon: "eye",
          title: "Partage avec des Tiers",
          text: "GustoSmart ne vend pas vos données personnelles. Pour faire fonctionner l'application, nous utilisons des prestataires technologiques externes :\n• Google Firebase/Firestore : pour l'authentification sécurisée et le stockage de la base de données dans le cloud.\n• API d'Intelligence Artificielle (ex. OpenAI) : pour extraire et structurer de manière anonyme les ingrédients et les étapes à partir de vidéos et de pages web.\n• ScrapeCreators API : pour récupérer les textes publics des publications sur les réseaux sociaux que vous choisissez d'importer.",
        },
        {
          icon: "scale",
          title: "Vos Droits et Suppression des Données",
          text: "Conformément au RGPD, vous disposez d'un droit d'accès, de rectification et de suppression de vos données personnelles. Vous pouvez supprimer définitivement votre compte et toutes les données associées à tout moment en cliquant sur le bouton \"Supprimer le Compte\" sur la page de votre Profil.",
        },
      ],
    },
    cookie: {
      title: "Politique de Cookies",
      subtitle: "GustoSmart utilise uniquement des cookies techniques essentiels. Nous n'utilisons pas de cookies de suivi, de profilage ou de publicité de tiers. Vous trouverez ci-dessous les détails sur la manière dont nous gérons ces informations.",
      lastUpdated: "Dernière mise à jour: Juin 2026",
      sections: [
        {
          icon: "lock",
          title: "Que sont les cookies techniques?",
          text: "Les cookies sont de petits fichiers texte enregistrés sur votre appareil lors de votre navigation. Les cookies techniques servent uniquement à faire fonctionner l'application ou à enregistrer vos préférences d'utilisation. Comme ils sont strictement nécessaires pour fournir le service, le RGPD ne requiert pas votre consentement explicite pour les activer, mais il est essentiel de vous en informer.",
        },
        {
          icon: "database",
          title: "Comment nous gérons les cookies",
          text: "Les cookies techniques utilisés par GustoSmart servent à maintenir votre session de connexion active, à mémoriser la langue de l'interface et à enregistrer le thème visuel sélectionné. Si vous décidez de désactiver ces cookies via les paramètres de votre navigateur, vous ne pourrez pas vous connecter à GustoSmart ni enregistrer vos préférences.",
        },
      ],
      cookiesList: [
        {
          name: "firebase_auth",
          type: "Technique / Session",
          purpose: "Maintient l'authentification et maintient votre session active pour éviter d'avoir à saisir à nouveau vos identifiants à chaque visite.",
          duration: "Persistant / Session",
        },
        {
          name: "NEXT_LOCALE",
          type: "Technique / Préférence",
          purpose: "Mémorise la langue sélectionnée par l'utilisateur (italien, anglais, espagnol, français) pour afficher correctement les textes de l'application.",
          duration: "1 an",
        },
        {
          name: "theme",
          type: "Technique / Préférence",
          purpose: "Mémorise la préférence de thème graphique de l'utilisateur (clair, sombre, système) géré via next-themes.",
          duration: "Persistant",
        },
      ],
    },
  },
};
