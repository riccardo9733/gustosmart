"use client";

import { Suspense, useState, useEffect, useRef, type FormEvent } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  updateProfile,
  sendEmailVerification,
  signOut,
  type AuthError,
} from "firebase/auth";
import { isWhitelistedEmail } from "@/lib/email-validation";
import {
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
} from "firebase/firestore";
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  Loader2,
  CheckCircle2,
  Leaf,
  AlertCircle,
  User as UserIcon,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { GoogleIcon } from "@/components/icons/google-icon";
import { useAuth } from "@/contexts/auth-context";
import { usePWA } from "@/contexts/pwa-context";
import { getFirebaseAuth, getFirebaseDb } from "@/lib/firebase";
import { PolicyDrawer } from "@/components/policy-drawer";

/* -------------------------------------------------- */
/*  Helpers                                           */
/* -------------------------------------------------- */
const googleProvider = new GoogleAuthProvider();

/** Maps Firebase auth error codes to user-friendly messages. */
function getErrorMessage(error: AuthError, t: any): string {
  switch (error.code) {
    case "auth/invalid-email":
      return t("errorInvalidEmail");
    case "auth/user-disabled":
      return t("errorUserDisabled");
    case "auth/user-not-found":
      return t("errorUserNotFound");
    case "auth/wrong-password":
    case "auth/invalid-credential":
      return t("errorWrongPassword");
    case "auth/email-already-in-use":
      return t("errorEmailInUse");
    case "auth/weak-password":
      return t("errorWeakPassword");
    case "auth/too-many-requests":
      return t("errorTooManyRequests");
    case "auth/popup-closed-by-user":
      return t("errorPopupClosed");
    case "auth/network-request-failed":
      return t("errorNetworkFailed");
    default:
      return t("errorDefault");
  }
}

/* ================================================== */
/*  Login Page                                        */
/* ================================================== */
export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-dvh items-center justify-center bg-background">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}

/* ================================================== */
/*  Inner form — uses useSearchParams                 */
/* ================================================== */
function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading: authLoading } = useAuth();
  const t = useTranslations("Login");
  const { canInstall, isDismissed, installApp, dismissPrompt } = usePWA();

  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [verificationSent, setVerificationSent] = useState(false);
  const [activePolicy, setActivePolicy] = useState<"privacy" | "cookie" | null>(null);
  const blobsRef = useRef<HTMLDivElement>(null);
  const bannerTrackedRef = useRef(false);

  const redirectTo = searchParams.get("redirect") || "/";

  /* ------ If already authenticated and email verified, redirect away ------ */
  useEffect(() => {
    if (!authLoading && user) {
      if (user.emailVerified) {
        router.replace(redirectTo);
      }
    }
  }, [user, authLoading, router, redirectTo]);

  /* ------ Parallax blobs on mouse move ------ */
  useEffect(() => {
    function handleMouseMove(e: MouseEvent) {
      if (!blobsRef.current) return;
      const blobs =
        blobsRef.current.querySelectorAll<HTMLDivElement>(".background-blob");
      const x = e.clientX / window.innerWidth - 0.5;
      const y = e.clientY / window.innerHeight - 0.5;
      blobs.forEach((blob, index) => {
        const speed = (index + 1) * 20;
        blob.style.transform = `translate(${x * speed}px, ${y * speed}px)`;
      });
    }
    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  /* ------ Track PWA Install Banner Shown ------ */
  useEffect(() => {
    if (canInstall && !isDismissed && !bannerTrackedRef.current) {
      bannerTrackedRef.current = true;
      import("@/lib/analytics").then(({ trackEvent }) => {
        trackEvent("pwa_install_prompt_action", { action: "shown" });
      });
    }
  }, [canInstall, isDismissed]);

  /* ------ Redirect after successful login ------ */
  function handleSuccess() {
    setIsSuccess(true);
    setError(null);
    // Brief visual feedback before redirect
    setTimeout(() => {
      router.replace(redirectTo);
    }, 600);
  }

  /* ------ Switch mode and clear fields ------ */
  function toggleMode() {
    setMode((prev) => (prev === "login" ? "signup" : "login"));
    setError(null);
    setPassword("");
    setConfirmPassword("");
    setVerificationSent(false);
  }

  /* ------ Email / Password form submission ------ */
  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (isSubmitting || isSuccess) return;

    setError(null);

    // Validate email domain against whitelist
    if (!isWhitelistedEmail(email)) {
      setError(t("errorInvalidEmailDomain"));
      return;
    }

    if (mode === "login") {
      setIsSubmitting(true);
      try {
        const auth = getFirebaseAuth();
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const signedInUser = userCredential.user;

        if (!signedInUser.emailVerified) {
          try {
            await sendEmailVerification(signedInUser);
            setError(t("errorEmailNotVerified"));
          } catch (verifErr) {
            console.error("Error sending verification email during login:", verifErr);
            setError(t("errorEmailNotVerified"));
          } finally {
            await signOut(auth);
            setIsSubmitting(false);
          }
          return;
        }

        handleSuccess();
      } catch (err) {
        setError(getErrorMessage(err as AuthError, t));
        setIsSubmitting(false);
      }
    } else {
      if (password !== confirmPassword) {
        setError(t("errorPasswordsDontMatch"));
        return;
      }
      if (password.length < 6) {
        setError(t("errorWeakPassword"));
        return;
      }
      if (!name.trim()) {
        setError(t("errorNameRequired"));
        return;
      }

      setIsSubmitting(true);
      try {
        const auth = getFirebaseAuth();
        const db = getFirebaseDb();

        // 1. Create auth user
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const registeredUser = userCredential.user;

        // 2. Set display name in Auth
        await updateProfile(registeredUser, { displayName: name.trim() });

        // 3. Write user profile to Firestore
        const userRef = doc(db, "users", registeredUser.uid);
        await setDoc(userRef, {
          uid: registeredUser.uid,
          email: registeredUser.email || email,
          displayName: name.trim(),
          photoURL: null,
          preferences: {
            language: "it",
            measurementSystem: "metric",
          },
          tokens: 100,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });

        // 4. Send email verification
        try {
          await sendEmailVerification(registeredUser);
        } catch (verifErr) {
          console.error("Error sending verification email during signup:", verifErr);
        }

        // 5. Sign out immediately so they must verify and log in
        await signOut(auth);

        // 6. Reset form state and show verification sent screen
        setVerificationSent(true);
        setPassword("");
        setConfirmPassword("");
        setIsSubmitting(false);
      } catch (err) {
        setError(getErrorMessage(err as AuthError, t));
        setIsSubmitting(false);
      }
    }
  }

  /* ------ Google sign-in ------ */
  async function handleGoogleLogin() {
    if (isGoogleLoading || isSuccess) return;

    setError(null);
    setIsGoogleLoading(true);

    try {
      const auth = getFirebaseAuth();
      const db = getFirebaseDb();
      
      const userCredential = await signInWithPopup(auth, googleProvider);
      const googleUser = userCredential.user;

      // Ensure user profile document exists in Firestore
      const userRef = doc(db, "users", googleUser.uid);
      const userSnap = await getDoc(userRef);

      if (!userSnap.exists()) {
        await setDoc(userRef, {
          uid: googleUser.uid,
          email: googleUser.email || "",
          displayName: googleUser.displayName || "GustoSmart Chef",
          photoURL: googleUser.photoURL || null,
          preferences: {
            language: "it",
            measurementSystem: "metric",
          },
          tokens: 100,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }

      handleSuccess();
    } catch (err) {
      const authErr = err as AuthError;
      // Don't show error if user simply closed the popup
      if (authErr.code !== "auth/popup-closed-by-user") {
        setError(getErrorMessage(authErr, t));
      }
      setIsGoogleLoading(false);
    }
  }

  /* ------ Don't render form while checking existing session ------ */
  if (authLoading) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // If user is already authenticated, don't flash the login form
  if (user) return null;

  const isLoading = isSubmitting || isGoogleLoading;

  return (
    <div className="relative flex min-h-dvh items-center justify-center overflow-hidden bg-background selection:bg-primary/20 selection:text-primary">
      {/* ===== Atmospheric Background ===== */}
      <div
        ref={blobsRef}
        className="pointer-events-none fixed inset-0 overflow-hidden"
      >
        <div className="background-blob absolute -top-[20%] -left-[10%] h-[60%] w-[60%] rounded-full bg-primary" />
        <div className="background-blob absolute top-[40%] -right-[15%] h-[50%] w-[50%] rounded-full bg-secondary" />
        <div className="background-blob absolute -bottom-[10%] left-[20%] h-[40%] w-[40%] rounded-full bg-surface-tint" />
        {/* Subtle texture overlay */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage:
              "url(\"data:image/svg+xml,%3Csvg width='6' height='6' viewBox='0 0 6 6' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%239C92AC' fill-opacity='0.4'%3E%3Cpath d='M5 0h1L0 6V5zM6 5v1H5z'/%3E%3C/g%3E%3C/svg%3E\")",
          }}
        />
      </div>

      {/* ===== Main Content ===== */}
      <main className="relative z-10 w-full max-w-[440px] animate-in fade-in zoom-in-95 duration-700 px-6 py-12">
        {/* -- Brand Header -- */}
        <header className="mb-8 flex flex-col items-center">
          <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl terracotta-gradient shadow-xl shadow-primary/20 transition-transform duration-500 hover:scale-110">
            <Leaf className="h-8 w-8 text-white" strokeWidth={2.2} />
          </div>
          <h1 className="font-heading text-2xl font-semibold tracking-tight text-foreground">
            GustoSmart
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Precision cooking, smart living.
          </p>
        </header>

        {/* -- Login/Signup Card -- */}
        <Card className="glass-panel border-0 rounded-[32px] shadow-2xl shadow-primary/5">
          <CardContent className="p-8">
            {verificationSent ? (
              <div className="text-center space-y-6 py-4 animate-in fade-in duration-500">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <CheckCircle2 className="h-8 w-8" />
                </div>
                <div className="space-y-2">
                  <h2 className="font-heading text-2xl font-semibold text-foreground">
                    {t("createAccount")}
                  </h2>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {t("signupVerificationSent")}
                  </p>
                </div>
                <Button
                  onClick={() => {
                    setVerificationSent(false);
                    setMode("login");
                  }}
                  className="w-full rounded-xl py-6 terracotta-gradient text-white font-semibold shadow-lg shadow-primary/20 hover:scale-[1.01] hover:shadow-primary/30 transition-transform duration-300"
                >
                  {t("login")}
                </Button>
              </div>
            ) : (
              <>
                {/* Card title */}
                <div className="mb-8 space-y-1 text-center">
                  <h2 className="font-heading text-2xl font-semibold text-foreground">
                    {mode === "login" ? t("welcomeBack") : t("createAccount")}
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    {mode === "login" ? t("loginTitle") : t("signupTitle")}
                  </p>
                </div>

                {/* ---- Error Banner ---- */}
                {error && (
                  <div className="mb-6 flex items-start gap-3 rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 animate-in fade-in slide-in-from-top-2 duration-300">
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
                    <p className="text-sm text-destructive">{error}</p>
                  </div>
                )}

                {/* Google login */}
                <Button
                  id="google-login-btn"
                  variant="outline"
                  disabled={isLoading || isSuccess}
                  onClick={handleGoogleLogin}
                  className="w-full gap-3 rounded-xl border-outline-variant bg-white py-6 text-sm font-semibold text-foreground shadow-sm transition-all duration-300 hover:bg-surface-container-low active:scale-[0.98] dark:bg-surface-container-lowest dark:hover:bg-surface-container-low"
                >
                  {isGoogleLoading ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <GoogleIcon />
                  )}
                  {mode === "login" ? t("googleLogin") : t("googleSignup")}
                </Button>

                {/* Divider */}
                <div className="relative my-8">
                  <Separator className="bg-outline-variant" />
                  <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-card px-3 text-xs font-medium tracking-wider text-muted-foreground uppercase">
                    {t("orEmail")}
                  </span>
                </div>

                {/* Email / Password form */}
                <form className="space-y-6" onSubmit={handleSubmit}>
                  {/* Full Name (Sign Up only) */}
                  {mode === "signup" && (
                    <div className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-300">
                      <Label htmlFor="name" className="px-1 text-sm font-semibold">
                        {t("nameLabel")}
                      </Label>
                      <div className="relative">
                        <UserIcon className="pointer-events-none absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-muted-foreground" />
                        <Input
                          id="name"
                          type="text"
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          placeholder="Chef Gusto"
                          required
                          disabled={isLoading || isSuccess}
                          className="h-12 rounded-xl border-outline-variant bg-surface-container-lowest/50 pl-12 pr-4 text-base transition-all duration-300 placeholder:text-muted-foreground/60 focus-visible:border-primary focus-visible:ring-primary/30"
                        />
                      </div>
                    </div>
                  )}

                  {/* Email */}
                  <div className="space-y-2">
                    <Label htmlFor="email" className="px-1 text-sm font-semibold">
                      {t("emailLabel")}
                    </Label>
                    <div className="relative">
                      <Mail className="pointer-events-none absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-muted-foreground" />
                      <Input
                        id="email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="chef@gustosmart.com"
                        required
                        disabled={isLoading || isSuccess}
                        className="h-12 rounded-xl border-outline-variant bg-surface-container-lowest/50 pl-12 pr-4 text-base transition-all duration-300 placeholder:text-muted-foreground/60 focus-visible:border-primary focus-visible:ring-primary/30"
                      />
                    </div>
                  </div>

                  {/* Password */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between px-1">
                      <Label htmlFor="password" className="text-sm font-semibold">
                        {t("passwordLabel")}
                      </Label>
                      {mode === "login" && (
                        <Link
                          href="#"
                          className="text-xs font-medium text-primary transition-all hover:underline"
                        >
                          {t("forgotPassword")}
                        </Link>
                      )}
                    </div>
                    <div className="relative">
                      <Lock className="pointer-events-none absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-muted-foreground" />
                      <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        required
                        disabled={isLoading || isSuccess}
                        className="h-12 rounded-xl border-outline-variant bg-surface-container-lowest/50 pl-12 pr-12 text-base transition-all duration-300 placeholder:text-muted-foreground/60 focus-visible:border-primary focus-visible:ring-primary/30"
                      />
                      <button
                        type="button"
                        id="toggle-password-btn"
                        onClick={() => setShowPassword((v) => !v)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-primary"
                        aria-label={
                          showPassword ? "Hide password" : "Show password"
                        }
                      >
                        {showPassword ? (
                          <EyeOff className="h-[18px] w-[18px]" />
                        ) : (
                          <Eye className="h-[18px] w-[18px]" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Confirm Password (Sign Up only) */}
                  {mode === "signup" && (
                    <div className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-300">
                      <Label htmlFor="confirmPassword" className="px-1 text-sm font-semibold">
                        {t("confirmPasswordLabel")}
                      </Label>
                      <div className="relative">
                        <Lock className="pointer-events-none absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-muted-foreground" />
                        <Input
                          id="confirmPassword"
                          type={showPassword ? "text" : "password"}
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          placeholder="••••••••"
                          required
                          disabled={isLoading || isSuccess}
                          className="h-12 rounded-xl border-outline-variant bg-surface-container-lowest/50 pl-12 pr-12 text-base transition-all duration-300 placeholder:text-muted-foreground/60 focus-visible:border-primary focus-visible:ring-primary/30"
                        />
                      </div>
                    </div>
                  )}

                  {/* Submit */}
                  <Button
                    id="submit-btn"
                    type="submit"
                    disabled={isLoading || isSuccess}
                    className={`mt-8 w-full rounded-xl py-6 text-sm font-semibold shadow-lg transition-all duration-300 active:scale-[0.97] ${
                      isSuccess
                        ? "bg-secondary text-white shadow-secondary/20 hover:bg-secondary/90"
                        : "terracotta-gradient text-white shadow-primary/20 hover:scale-[1.01] hover:shadow-primary/30"
                    }`}
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        {mode === "login" ? t("verifying") : t("creating")}
                      </>
                    ) : isSuccess ? (
                      <>
                        <CheckCircle2 className="mr-2 h-4 w-4" />
                        {t("success")}
                      </>
                    ) : mode === "login" ? (
                      t("loginBtn")
                    ) : (
                      t("registerBtn")
                    )}
                  </Button>
                </form>

                {/* Switch Mode CTA */}
                <div className="mt-10 text-center">
                  <p className="text-sm text-muted-foreground">
                    {mode === "login" ? (
                      <>
                        {t("newToKitchen")}{" "}
                        <button
                          type="button"
                          id="switch-to-signup-btn"
                          onClick={toggleMode}
                          className="group ml-1 inline-flex items-center font-semibold text-primary underline-offset-4 decoration-2 transition-all hover:underline cursor-pointer"
                        >
                          {t("register")}
                          <span className="ml-1 inline-block transition-transform group-hover:translate-x-1">
                            →
                          </span>
                        </button>
                      </>
                    ) : (
                      <>
                        {t("alreadyHaveAccount")}{" "}
                        <button
                          type="button"
                          id="switch-to-login-btn"
                          onClick={toggleMode}
                          className="group ml-1 inline-flex items-center font-semibold text-primary underline-offset-4 decoration-2 transition-all hover:underline cursor-pointer"
                        >
                          {t("login")}
                          <span className="ml-1 inline-block transition-transform group-hover:translate-x-1">
                            →
                          </span>
                        </button>
                      </>
                    )}
                  </p>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Footer */}
        <footer className="mt-8 flex justify-center gap-6 text-xs text-muted-foreground/60">
          <button
            type="button"
            onClick={() => setActivePolicy("privacy")}
            className="transition-colors hover:text-primary cursor-pointer hover:underline focus:outline-none"
          >
            {t("privacyPolicy")}
          </button>
          <span>•</span>
          <button
            type="button"
            onClick={() => setActivePolicy("cookie")}
            className="transition-colors hover:text-primary cursor-pointer hover:underline focus:outline-none"
          >
            {t("cookiePolicy")}
          </button>
          <span>•</span>
          <Link href="#" className="transition-colors hover:text-primary">
            {t("termsOfService")}
          </Link>
        </footer>
      </main>

      {/* Floating PWA Install Banner */}
      {canInstall && !isDismissed && (
        <div className="fixed bottom-6 left-6 right-6 md:left-auto md:right-6 md:w-[380px] z-40 bg-background/80 backdrop-blur-xl border border-white/20 dark:border-white/10 shadow-2xl rounded-[24px] p-5 flex gap-4 items-center animate-in slide-in-from-bottom-8 duration-500">
          {/* Brand Icon */}
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl terracotta-gradient shadow-md shadow-primary/10 shrink-0">
            <Leaf className="h-6 w-6 text-white" />
          </div>
          {/* Content */}
          <div className="flex-1 space-y-1">
            <h4 className="font-heading text-sm font-bold text-foreground leading-tight">
              {t("pwaBannerTitle")}
            </h4>
            <p className="text-xs text-muted-foreground leading-snug">
              {t("pwaBannerDesc")}
            </p>
          </div>
          {/* Action and Dismiss */}
          <div className="flex flex-col gap-2.5 shrink-0">
            <Button
              onClick={installApp}
              size="sm"
              className="terracotta-gradient text-white rounded-xl text-xs font-bold hover:scale-[1.02] active:scale-[0.98] transition-transform"
            >
              {t("pwaInstallBtn")}
            </Button>
            <button
              onClick={dismissPrompt}
              className="text-[11px] font-bold text-muted-foreground hover:text-foreground text-center transition-colors cursor-pointer"
            >
              {t("pwaDismissBtn")}
            </button>
          </div>
        </div>
      )}

      <PolicyDrawer
        isOpen={activePolicy !== null}
        onClose={() => setActivePolicy(null)}
        type={activePolicy}
      />
    </div>
  );
}
