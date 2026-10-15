"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { Check, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

export interface RegistrationChoice {
  uuid: string;
  name: string;
  description: string | null;
  default_role: "guest" | "standard";
}

export function RegistrationLayout({ brand, signIn, children }: { brand: ReactNode; signIn: ReactNode; children: ReactNode }) {
  return <main className="lp-registration">
    <header className="lp-registration-header">{brand}<div>Already have an account? {signIn}</div></header>
    <div className="lp-registration-body">
      <header className="lp-registration-heading"><h1>Create your account.</h1><p>Your details, your password, and the applications you want to use.</p></header>
      {children}
    </div>
    <footer className="lp-registration-footer">LGU Portal · Identity and access</footer>
  </main>;
}

export function RegistrationApplications({ applications, selected, onChange, error, disabled }: {
  applications: RegistrationChoice[]; selected: string[]; onChange: (value: string[]) => void; error?: string; disabled?: boolean;
}) {
  return <fieldset className="lp-registration-apps" disabled={disabled} aria-describedby={error ? "registration-apps-help registration-apps-error" : "registration-apps-help"}>
    <legend>Choose applications</legend>
    <p id="registration-apps-help">Select the applications you want to connect. Only a super administrator can grant a higher role.</p>
    {applications.length === 0 ? <p className="lp-registration-empty">No applications are available for registration right now. You can still create your account and ask an administrator for access later.</p> : <div className="lp-registration-choices">{applications.map((application) => <div className="lp-registration-choice" key={application.uuid}>
      <Checkbox id={`registration-app-${application.uuid}`} checked={selected.includes(application.uuid)} disabled={disabled} onCheckedChange={(checked) => onChange(checked ? [...selected, application.uuid] : selected.filter((uuid) => uuid !== application.uuid))} aria-describedby={`registration-app-description-${application.uuid}`} />
      <Label htmlFor={`registration-app-${application.uuid}`}><span>{application.name}<span className="lp-registration-role">{application.default_role === "standard" ? "Standard" : "Guest"}</span></span><span id={`registration-app-description-${application.uuid}`} className="lp-registration-app-description">{application.description || `Connect to ${application.name} with ${application.default_role} access.`}</span></Label>
    </div>)}</div>}
    <p className="lp-registration-app-note">{selected.length ? `${selected.length} application${selected.length === 1 ? "" : "s"} selected. Access starts when your account is created.` : "No applications selected. You can create an account without application access."}</p>
    {error && <p id="registration-apps-error" className="lp-admin-error" role="alert">{error}</p>}
  </fieldset>;
}

export function RegistrationSuccess({ username, applications, signIn }: {
  username: string; applications: { uuid: string; name: string; role: "guest" | "standard" }[]; signIn: ReactNode;
}) {
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => { heading.current?.focus(); }, []);
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState(false);
  return <section className="lp-registration-success" aria-labelledby="registration-success-title">
    <Check size={28} aria-hidden="true" />
    <h2 id="registration-success-title" tabIndex={-1} ref={heading}>Your account is ready.</h2>
    <p>Save your username. Sign in with the password you just chose.</p>
    <div className="lp-registration-username"><div><span>Username</span><strong>{username}</strong></div><Button type="button" variant="outline" onClick={async () => {
      try { await navigator.clipboard.writeText(username); setCopied(true); setCopyError(false); }
      catch { setCopyError(true); }
    }}><Copy aria-hidden="true" />{copied ? "Copied" : "Copy username"}</Button></div>
    {copyError && <p role="alert">Copy is unavailable. Select and copy the username above.</p>}
    {copied && <span className="sr-only" role="status">Username copied.</span>}
    <h3>Your application access</h3>
    {applications.length ? <ul>{applications.map((application) => <li key={application.uuid}><span>{application.name}</span><strong>{application.role === "standard" ? "Standard" : "Guest"}</strong></li>)}</ul> : <p>You have no application access yet. Contact a super administrator when you need it.</p>}
    <p className="lp-registration-next">Only a super administrator can change these roles.</p>
    {signIn}
  </section>;
}
