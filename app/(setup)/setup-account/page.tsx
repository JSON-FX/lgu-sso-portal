"use client";

import { Suspense, useState, useMemo, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
  Loader2,
  Eye,
  EyeOff,
  CheckCircle2,
  Circle,
  Check,
} from "lucide-react";

import { toast } from "sonner";

const STEP_LABELS = ["Welcome", "New Password", "Done"] as const;

function StepIndicator({
  currentStep,
}: {
  currentStep: number;
}) {
  return (
    <div className="flex items-center justify-center gap-0 mb-10">
      {STEP_LABELS.map((label, index) => {
        const stepNum = index + 1;
        const isCompleted = currentStep > stepNum;
        const isCurrent = currentStep === stepNum;

        return (
          <div key={label} className="flex items-center">
            <div className="flex flex-col items-center">
              <div
                className={`
                  flex h-10 w-10 items-center justify-center rounded-full
                  text-sm font-semibold transition-colors duration-300
                  ${
                    isCompleted
                      ? "bg-emerald-500 text-white"
                      : isCurrent
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground"
                  }
                `}
              >
                {isCompleted ? (
                  <Check className="h-5 w-5" />
                ) : (
                  stepNum
                )}
              </div>
              <span
                className={`
                  mt-2 text-xs font-medium transition-colors duration-300
                  ${
                    isCompleted
                      ? "text-emerald-500"
                      : isCurrent
                        ? "text-foreground"
                        : "text-muted-foreground"
                  }
                `}
              >
                {label}
              </span>
            </div>
            {index < STEP_LABELS.length - 1 && (
              <div
                className={`
                  h-[2px] w-16 mx-3 mb-6 transition-colors duration-300
                  ${currentStep > stepNum ? "bg-emerald-500" : "bg-muted"}
                `}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

function WelcomeStep({
  firstName,
  onContinue,
}: {
  firstName: string;
  onContinue: () => void;
}) {
  return (
    <Card className="w-full max-w-md border-0 shadow-xl shadow-primary/5">
      <CardContent className="flex flex-col items-center text-center pt-8 pb-8 px-8">
        <img src="/lgu-seal.png" alt="LGU Quezon" className="w-16 h-16 mb-6" />
        <h2 className="text-2xl font-bold text-foreground mb-2">
          Welcome, {firstName}!
        </h2>
        <p className="text-muted-foreground mb-8 max-w-sm">
          Before you get started, let&apos;s secure your account by setting a new
          password.
        </p>
        <Button
          onClick={onContinue}
          className="w-full h-11 text-base font-semibold"
          size="lg"
        >
          Continue
        </Button>
      </CardContent>
    </Card>
  );
}

function PasswordStep({
  currentPassword,
  setCurrentPassword,
  newPassword,
  setNewPassword,
  confirmPassword,
  setConfirmPassword,
  isSubmitting,
  onSubmit,
}: {
  currentPassword: string;
  setCurrentPassword: (value: string) => void;
  newPassword: string;
  setNewPassword: (value: string) => void;
  confirmPassword: string;
  setConfirmPassword: (value: string) => void;
  isSubmitting: boolean;
  onSubmit: () => void;
}) {
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const validations = useMemo(
    () => ({
      minLength: newPassword.length >= 6,
      hasNumber: /\d/.test(newPassword),
      passwordsMatch:
        confirmPassword.length > 0 && newPassword === confirmPassword,
    }),
    [newPassword, confirmPassword]
  );

  const allValid =
    currentPassword.length > 0 &&
    validations.minLength &&
    validations.hasNumber &&
    validations.passwordsMatch;

  return (
    <Card className="w-full max-w-md border-0 shadow-xl shadow-primary/5">
      <CardContent className="flex flex-col pt-8 pb-8 px-8">
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold text-foreground mb-2">
            Set Your New Password
          </h2>
          <p className="text-muted-foreground">
            Choose a secure password you&apos;ll remember
          </p>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="current-password" className="text-sm font-medium text-foreground">Temporary Password</label>
            <Input
              id="current-password"
              type="password"
              autoComplete="current-password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              disabled={isSubmitting}
            />
          </div>
          <div className="space-y-2">
            <label
              htmlFor="new-password"
              className="text-sm font-medium text-foreground"
            >
              New Password
            </label>
            <div className="relative">
              <Input
                id="new-password"
                type={showNewPassword ? "text" : "password"}
                placeholder="Enter your new password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="h-11 pr-10"
                disabled={isSubmitting}
                autoComplete="new-password"
              />
              <button
                type="button"
                onClick={() => setShowNewPassword(!showNewPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                tabIndex={-1}
              >
                {showNewPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <label
              htmlFor="confirm-password"
              className="text-sm font-medium text-foreground"
            >
              Confirm Password
            </label>
            <div className="relative">
              <Input
                id="confirm-password"
                type={showConfirmPassword ? "text" : "password"}
                placeholder="Confirm your new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="h-11 pr-10"
                disabled={isSubmitting}
                autoComplete="new-password"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                tabIndex={-1}
              >
                {showConfirmPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>

          <div className="space-y-2 pt-2">
            <ValidationItem
              label="At least 6 characters"
              valid={validations.minLength}
            />
            <ValidationItem
              label="Contains a number"
              valid={validations.hasNumber}
            />
            {confirmPassword.length > 0 && (
              <ValidationItem
                label="Passwords match"
                valid={validations.passwordsMatch}
              />
            )}
          </div>
        </div>

        <Button
          onClick={onSubmit}
          disabled={!allValid || isSubmitting}
          className="w-full h-11 text-base font-semibold mt-6"
          size="lg"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Setting Password...
            </>
          ) : (
            "Set Password"
          )}
        </Button>
      </CardContent>
    </Card>
  );
}

function ValidationItem({
  label,
  valid,
}: {
  label: string;
  valid: boolean;
}) {
  return (
    <div className="flex items-center gap-2">
      {valid ? (
        <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
      ) : (
        <Circle className="h-4 w-4 text-muted-foreground shrink-0" />
      )}
      <span
        className={`text-sm transition-colors duration-200 ${
          valid ? "text-emerald-500" : "text-muted-foreground"
        }`}
      >
        {label}
      </span>
    </div>
  );
}

function DoneStep({ onContinue }: { onContinue: () => void }) {
  return (
    <Card className="w-full max-w-md border-0 shadow-xl shadow-primary/5">
      <CardContent className="flex flex-col items-center text-center pt-8 pb-8 px-8">
        <div className="mb-6 animate-[scaleIn_0.5s_ease-out]">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-emerald-500/10">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500">
              <Check className="h-7 w-7 text-white" />
            </div>
          </div>
        </div>
        <h2 className="text-2xl font-bold text-foreground mb-2">
          You&apos;re all set!
        </h2>
        <p className="text-muted-foreground mb-8 max-w-sm">
          Your password has been updated successfully.
        </p>
        <Button
          onClick={onContinue}
          className="w-full h-11 text-base font-semibold"
          size="lg"
        >
          Continue
        </Button>
      </CardContent>
    </Card>
  );
}

function SetupAccountContent() {
  const [currentStep, setCurrentStep] = useState(1);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [fadeKey, setFadeKey] = useState(0);

  const { user, changePassword, isSuperAdmin } =
    useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  const goToStep = useCallback((step: number) => {
    setFadeKey((k) => k + 1);
    setCurrentStep(step);
  }, []);

  const handleSetPassword = useCallback(async () => {
    setIsSubmitting(true);
    try {
      await changePassword(currentPassword, newPassword);
      setCurrentPassword("");

      // For SSO flows, redirect back to SSO login immediately
      // (the layout would redirect before step 3 renders anyway)
      const clientId = searchParams.get("client_id");
      const redirectUri = searchParams.get("redirect_uri");
      const state = searchParams.get("state");
      if (clientId && redirectUri && state) {
        window.location.href = `/sso/login?client_id=${encodeURIComponent(clientId)}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${encodeURIComponent(state)}`;
        return;
      }

      goToStep(3);
    } catch (err) {
      if (err instanceof Error) {
        toast.error(err.message);
      } else {
        toast.error("Failed to change password. Please try again.");
      }
    } finally {
      setIsSubmitting(false);
    }
  }, [currentPassword, newPassword, changePassword, goToStep, searchParams]);

  const handleDoneContinue = useCallback(() => {
    const clientId = searchParams.get("client_id");
    const redirectUri = searchParams.get("redirect_uri");
    const state = searchParams.get("state");

    if (clientId && redirectUri && state) {
      window.location.href = `/sso/login?client_id=${encodeURIComponent(clientId)}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${encodeURIComponent(state)}`;
      return;
    }

    router.push(isSuperAdmin ? "/dashboard" : "/portal");
  }, [searchParams, isSuperAdmin, router]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 py-8">
      <div className="mb-8 flex items-center gap-3">
        <img src="/lgu-seal.png" alt="LGU Quezon" className="w-10 h-10 rounded-full" />
        <span className="text-lg font-bold text-foreground">LGU-SSO</span>
      </div>

      <StepIndicator currentStep={currentStep} />

      <div
        key={fadeKey}
        className="w-full flex justify-center animate-[fadeIn_0.3s_ease-out]"
      >
        {currentStep === 1 && (
          <WelcomeStep
            firstName={user?.first_name ?? ""}
            onContinue={() => goToStep(2)}
          />
        )}
        {currentStep === 2 && (
          <PasswordStep
            currentPassword={currentPassword}
            setCurrentPassword={setCurrentPassword}
            newPassword={newPassword}
            setNewPassword={setNewPassword}
            confirmPassword={confirmPassword}
            setConfirmPassword={setConfirmPassword}
            isSubmitting={isSubmitting}
            onSubmit={handleSetPassword}
          />
        )}
        {currentStep === 3 && <DoneStep onContinue={handleDoneContinue} />}
      </div>

      <p className="mt-12 text-center text-xs text-muted-foreground">
        &copy; {new Date().getFullYear()} Local Government of Quezon Bukidnon. All rights
        reserved.
      </p>
    </div>
  );
}

export default function SetupAccountPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-background">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      }
    >
      <SetupAccountContent />
    </Suspense>
  );
}
