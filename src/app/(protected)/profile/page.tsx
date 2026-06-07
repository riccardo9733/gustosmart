"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { signOut } from "firebase/auth";
import { useTranslations } from "next-intl";
import { 
  Pencil, 
  Globe, 
  ChevronRight, 
  Ruler, 
  Bell, 
  Utensils, 
  LogOut, 
  Trash2,
  Check,
  Zap
} from "lucide-react";
import { getFirebaseAuth, getFirebaseDb } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { selectUserProfile, setUserSuccess } from "@/store/userSlice";
import { doc, updateDoc, collection, getDocs, query, where } from "firebase/firestore";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function ProfilePage() {
  const dispatch = useAppDispatch();
  const profile = useAppSelector(selectUserProfile);
  const t = useTranslations("Profile");

  const [metricUnit, setMetricUnit] = useState(true);
  const [timerAlerts, setTimerAlerts] = useState(true);
  const [recipeRecs, setRecipeRecs] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const [languages, setLanguages] = useState<any[]>([
    { code: "it", name: "Italiano", flag: "🇮🇹" },
    { code: "en", name: "English", flag: "🇺🇸" },
    { code: "es", name: "Español", flag: "🇪🇸" },
    { code: "fr", name: "Français", flag: "🇫🇷" }
  ]);

  useEffect(() => {
    const fetchLanguages = async () => {
      try {
        const db = getFirebaseDb();
        const languagesColRef = collection(db, "language");
        const q = query(languagesColRef, where("enabled", "==", true));
        const querySnapshot = await getDocs(q);
        
        if (!querySnapshot.empty) {
          const fetchedLanguages = querySnapshot.docs.map((docSnap) => {
            const data = docSnap.data();
            return {
              code: data.code || docSnap.id,
              name: data.name || "",
              flag: data.flag || "🌐",
              enabled: data.enabled !== false
            };
          });
          
          // Ordina alfabeticamente per nome
          fetchedLanguages.sort((a, b) => a.name.localeCompare(b.name));
          setLanguages(fetchedLanguages);
        }
      } catch (error) {
        console.error("Errore durante il recupero delle lingue da Firestore:", error);
      }
    };
    
    fetchLanguages();
  }, []);

  useEffect(() => {
    if (profile?.preferences?.measurementSystem) {
      setMetricUnit(profile.preferences.measurementSystem === "metric");
    }
  }, [profile]);

  const handleLanguageChange = async (langCode: string) => {
    if (!profile) return;
    try {
      const db = getFirebaseDb();
      const userRef = doc(db, "users", profile.uid);
      const updatedPreferences = {
        ...profile.preferences,
        language: langCode,
      };

      await updateDoc(userRef, {
        preferences: updatedPreferences,
        updatedAt: new Date().toISOString(),
      });

      dispatch(
        setUserSuccess({
          ...profile,
          preferences: updatedPreferences,
        })
      );

      // Imposta il cookie NEXT_LOCALE per next-intl
      document.cookie = `NEXT_LOCALE=${langCode}; path=/; max-age=31536000; SameSite=Lax`;
      
      toast.success(t("langUpdated"));

      // Ricarica la finestra per applicare la nuova lingua
      setTimeout(() => {
        window.location.reload();
      }, 500);
    } catch (error) {
      console.error("Errore durante l'aggiornamento della lingua:", error);
      toast.error(t("langUpdateFailed"));
    }
  };

  const handleUnitChange = async (isMetric: boolean) => {
    setMetricUnit(isMetric);
    if (!profile) return;
    try {
      const db = getFirebaseDb();
      const userRef = doc(db, "users", profile.uid);
      const updatedPreferences = {
        ...profile.preferences,
        measurementSystem: isMetric ? ("metric" as const) : ("imperial" as const),
      };

      await updateDoc(userRef, {
        preferences: updatedPreferences,
        updatedAt: new Date().toISOString(),
      });

      dispatch(
        setUserSuccess({
          ...profile,
          preferences: updatedPreferences,
        })
      );
      toast.success(t("unitsUpdated"));
    } catch (error) {
      console.error("Errore durante l'aggiornamento dell'unità di misura:", error);
      toast.error(t("unitsUpdateFailed"));
      // Ripristina lo stato locale precedente
      setMetricUnit(profile.preferences.measurementSystem === "metric");
    }
  };

  const handleLogout = async () => {
    if (isLoggingOut) return;
    setIsLoggingOut(true);
    try {
      const auth = getFirebaseAuth();
      await signOut(auth);
    } catch (error) {
      console.error("Error signing out:", error);
      setIsLoggingOut(false);
    }
  };

  const currentLangObj = languages.find(l => l.code === profile?.preferences?.language) || { code: "it", name: "Italiano", flag: "🇮🇹" };

  return (
    <div className="max-w-2xl mx-auto space-y-8 pb-10 animate-in fade-in duration-500">
      {/* User Profile Header */}
      <section className="flex flex-col items-center text-center space-y-4">
        <div className="relative group">
          <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-white shadow-xl relative">
            <Image 
              src={profile?.photoURL || "https://lh3.googleusercontent.com/aida-public/AB6AXuAlB9fZRWwbOPOZ7TZacLV3xx6oP8Rr4PhFnhygSn1hctWwwohqDbXROhA5oUjZDl9nPkp6NbYqi42KanTEW4sVWUmeHClSUQVgC7FuCQF2Fp2rna8sOBbFCFWTXPwJ7EHdpBzY9H_Qn4fcQdxX4sfziriwLLAKBDP-zRAXbMCti1BjIM0-Ct_xWvGYP3nCOAfb7vF-sMmbjugOe1OtZWpLUZyFP53wBYO2QnY6JnL5-WUUbvh2FeYYmbNLibwO8PU7fbdWBzduyA"}
              alt={`${profile?.displayName || "Chef"} profile avatar`}
              fill
              sizes="96px"
              className="object-cover"
              priority
            />
          </div>
          <button className="absolute bottom-0 right-0 bg-primary text-white p-2 rounded-full shadow-lg border-2 border-white hover:scale-110 active:scale-95 transition-transform">
            <Pencil className="h-3.5 w-3.5" />
          </button>
        </div>
        <div>
          <h2 className="font-heading text-2xl font-bold text-foreground">{profile?.displayName || "Chef Gusto"}</h2>
          <p className="text-sm text-muted-foreground">{profile?.email || ""}</p>
        </div>
      </section>

      {/* Settings Groups */}
      <div className="space-y-6">
        {/* Token Usage Section */}
        <div className="space-y-2">
          <h3 className="text-xs font-bold px-1 text-primary uppercase tracking-wider opacity-80">
            {t("usage")}
          </h3>
          <div className="glass-panel rounded-[24px] p-6 border border-white/20 dark:border-white/10 shadow-lg shadow-primary/5 flex flex-col gap-4">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="bg-primary/10 dark:bg-primary/20 p-2.5 rounded-2xl">
                  <Zap className="h-5 w-5 text-primary fill-primary animate-pulse" />
                </div>
                <div>
                  <h4 className="font-heading text-base font-bold text-foreground">{t("tokensTitle")}</h4>
                  <p className="text-xs text-muted-foreground">{t("tokensSubtitle")}</p>
                </div>
              </div>
              <div className="flex flex-col items-end">
                <span className="text-2xl font-extrabold text-primary leading-none">
                  {profile?.tokens ?? 10}
                </span>
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mt-1">
                  {t("tokensRemaining")}
                </span>
              </div>
            </div>

            {/* Custom progress bar */}
            <div className="w-full bg-surface-container-low dark:bg-surface-container h-3 rounded-full overflow-hidden border border-white/5 relative">
              <div 
                className="terracotta-gradient h-full rounded-full transition-all duration-500 shadow-sm"
                style={{ width: `${Math.min(100, Math.max(0, ((profile?.tokens ?? 10) / 10) * 100))}%` }}
              />
            </div>
            
            <div className="flex justify-between text-[11px] font-semibold text-muted-foreground px-1">
              <span>0 / 10 Scans</span>
              <span>10 / 10 Scans</span>
            </div>
          </div>
        </div>

        {/* Preferences Section */}
        <div className="space-y-2">
          <h3 className="text-xs font-bold px-1 text-primary uppercase tracking-wider opacity-80">
            {t("kitchenPreferences")}
          </h3>
          <div className="glass-panel rounded-[20px] overflow-hidden border border-white/20 dark:border-white/10 shadow-lg shadow-primary/5">
            {/* Language Selector */}
            <DropdownMenu>
              <DropdownMenuTrigger render={
                <div className="flex items-center justify-between p-5 border-b border-white/10 hover:bg-white/40 dark:hover:bg-white/5 transition-colors cursor-pointer group">
                  <div className="flex items-center gap-4">
                    <Globe className="h-5 w-5 text-muted-foreground" />
                    <span className="font-medium text-foreground">{t("appLanguage")}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1.5 px-3 py-1 bg-white/50 dark:bg-white/5 rounded-full border border-white/25">
                      <span className="text-sm">
                        {currentLangObj.flag}
                      </span>
                      <span className="text-xs font-semibold text-foreground">
                        {currentLangObj.name}
                      </span>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              } />
              <DropdownMenuContent align="end" className="w-48 rounded-[16px] p-1.5 shadow-xl bg-popover text-popover-foreground border border-white/10">
                {languages.map((lang) => (
                  <DropdownMenuItem
                    key={lang.code}
                    onClick={() => handleLanguageChange(lang.code)}
                    className="flex items-center justify-between rounded-xl px-3.5 py-2.5 text-sm cursor-pointer hover:bg-accent hover:text-accent-foreground"
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="text-base leading-none">{lang.flag}</span>
                      <span className="font-medium">{lang.name}</span>
                    </div>
                    {currentLangObj.code === lang.code && (
                      <Check className="h-4 w-4 text-primary shrink-0" />
                    )}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            {/* Measurement Toggle */}
            <div className="flex items-center justify-between p-5">
              <div className="flex items-center gap-4">
                <Ruler className="h-5 w-5 text-muted-foreground" />
                <span className="font-medium text-foreground">{t("measurementUnits")}</span>
              </div>
              <div className="flex bg-surface-container-low dark:bg-surface-container p-1 rounded-full border border-white/10">
                <button 
                  onClick={() => handleUnitChange(true)}
                  className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all ${
                    metricUnit 
                      ? "bg-primary text-white shadow-sm" 
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {t("metric")}
                </button>
                <button 
                  onClick={() => handleUnitChange(false)}
                  className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all ${
                    !metricUnit 
                      ? "bg-primary text-white shadow-sm" 
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {t("imperial")}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Notifications Section */}
        <div className="space-y-2">
          <h3 className="text-xs font-bold px-1 text-primary uppercase tracking-wider opacity-80">
            {t("notifications")}
          </h3>
          <div className="glass-panel rounded-[20px] overflow-hidden border border-white/20 dark:border-white/10 shadow-lg shadow-primary/5">
            {/* Smart Timer Alerts */}
            <div className="flex items-center justify-between p-5 border-b border-white/10">
              <div className="flex items-center gap-4">
                <Bell className="h-5 w-5 text-muted-foreground" />
                <span className="font-medium text-foreground">{t("timerAlerts")}</span>
              </div>
              <button 
                onClick={() => setTimerAlerts(v => !v)}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  timerAlerts ? "bg-primary" : "bg-outline-variant"
                }`}
              >
                <span 
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    timerAlerts ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
            </div>
            {/* Recipe Recommendations */}
            <div className="flex items-center justify-between p-5">
              <div className="flex items-center gap-4">
                <Utensils className="h-5 w-5 text-muted-foreground" />
                <span className="font-medium text-foreground">{t("recommendations")}</span>
              </div>
              <button 
                onClick={() => setRecipeRecs(v => !v)}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  recipeRecs ? "bg-primary" : "bg-outline-variant"
                }`}
              >
                <span 
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    recipeRecs ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
            </div>
          </div>
        </div>

        {/* Account Actions */}
        <div className="space-y-2 pt-2">
          <div className="glass-panel rounded-[20px] overflow-hidden border border-white/20 dark:border-white/10 shadow-lg shadow-primary/5">
            {/* Logout Button */}
            <button 
              onClick={handleLogout}
              disabled={isLoggingOut}
              className="w-full flex items-center gap-4 p-5 hover:bg-destructive/10 dark:hover:bg-destructive/10 text-foreground hover:text-destructive transition-all active:scale-[0.99] group text-left"
            >
              <LogOut className="h-5 w-5 text-muted-foreground group-hover:text-destructive transition-colors" />
              <span className="font-medium">
                {isLoggingOut ? t("loggingOut") : t("logOut")}
              </span>
            </button>
            <div className="h-[1px] bg-white/10 mx-5"></div>
            {/* Delete Account */}
            <button className="w-full flex items-center gap-4 p-5 hover:bg-destructive/15 dark:hover:bg-destructive/15 text-destructive transition-all active:scale-[0.99] text-left">
              <Trash2 className="h-5 w-5" />
              <span className="font-medium">{t("deleteAccount")}</span>
            </button>
          </div>
        </div>

        {/* Version Info */}
        <div className="text-center pt-6 pb-10 space-y-1">
          <p className="text-[11px] font-bold text-muted-foreground tracking-wide">
            {t("version")}
          </p>
          <p className="text-[11px] text-muted-foreground/60">
            {t("designedFor")}
          </p>
        </div>
      </div>
    </div>
  );
}
