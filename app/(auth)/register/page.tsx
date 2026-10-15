"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { EmployeeForm, type EmployeeFormValues } from "@/components/portal/employee-form";
import { PasswordInput, PortalBrand, PortalStatus } from "@/components/portal/design";
import { RegistrationApplications, RegistrationLayout, RegistrationSuccess } from "@/components/portal/registration";
import type { RegisterResponse, RegistrationOptions } from "@/types/auth";

export default function RegisterPage() {
  const router = useRouter();
  const [options, setOptions] = useState<RegistrationOptions>();
  const [loadError, setLoadError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [result, setResult] = useState<RegisterResponse>();

  useEffect(() => {
    let active = true;
    void api.auth.registrationOptions().then((response) => { if (active) setOptions(response.data); }).catch(() => { if (active) setLoadError(true); });
    return () => { active = false; };
  }, [attempt]);

  const validatePassword = () => {
    const errors: Record<string, string> = {};
    if (password.length < 8 || !/[a-z]/i.test(password) || !/[0-9]/.test(password)) errors.password = "Use at least 8 characters, including a letter and a number.";
    if (new TextEncoder().encode(password).length > 72) errors.password = "Use a password of 72 bytes or fewer.";
    if (confirmation !== password) errors.password_confirmation = "Your passwords do not match.";
    return errors;
  };

  const register = async (values: EmployeeFormValues) => {
    // The public contract excludes administrator-only fields.
    const { is_active: _status, date_terminated: _termination, date_employed: _employment, password: _password, ...details } = values;
    void _status; void _termination; void _employment; void _password;
    const response = await api.auth.register({ ...details, email: values.email!.trim(), password, password_confirmation: confirmation, applications: selected });
    setPassword(""); setConfirmation(""); setResult(response);
  };

  return <RegistrationLayout brand={<PortalBrand />} signIn={<Link href="/login">Sign in</Link>}>
    {result ? <RegistrationSuccess username={result.username} applications={result.applications} signIn={<Button asChild><Link href="/login">Continue to sign in <ArrowRight aria-hidden="true" /></Link></Button>} /> : loadError ? <PortalStatus kind="error" title="Registration is temporarily unavailable." action={<Button variant="outline" onClick={() => { setLoadError(false); setAttempt((value) => value + 1); }}>Try again</Button>}>We couldn’t load the registration choices. Please try again.</PortalStatus> : !options ? <PortalStatus title="Loading registration…">Getting application, office and position choices.</PortalStatus> : <EmployeeForm registration referenceData={options} onSave={register} onCancel={() => router.push("/login")} submitLabel="Create account" validateExtra={validatePassword}
      accountFields={(errors, saving) => <>
        <div className="lp-admin-field"><p className="lp-registration-password-help">Your username is generated from your name. We’ll show it after registration.</p></div>
        <div className="lp-admin-field"><PasswordInput id="registration-password" label="Password" autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} required disabled={saving} aria-invalid={!!errors.password} aria-describedby="registration-password-help registration-password-error" /><p id="registration-password-help" className="lp-registration-password-help">At least 8 characters, including a letter and a number.</p><p id="registration-password-error" className="lp-admin-error" role={errors.password ? "alert" : undefined}>{errors.password}</p></div>
        <div className="lp-admin-field"><PasswordInput id="registration-confirmation" label="Confirm password" autoComplete="new-password" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} required disabled={saving} aria-invalid={!!errors.password_confirmation} aria-describedby="registration-confirmation-error" /><p id="registration-confirmation-error" className="lp-admin-error" role={errors.password_confirmation ? "alert" : undefined}>{errors.password_confirmation}</p></div>
      </>}
      afterFields={(errors, saving) => <RegistrationApplications applications={options.applications} selected={selected} onChange={setSelected} disabled={saving} error={errors.applications || Object.entries(errors).find(([key]) => key.startsWith("applications."))?.[1]} />}
    />}
  </RegistrationLayout>;
}
