"use client";

import { useState, type ReactNode, type ComponentProps } from "react";
import Image from "next/image";
import { AlertCircle, Eye, EyeOff, KeyRound, SearchX, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function PortalBrand({ compact = false }: { compact?: boolean }) {
  return (
    <div className="lp-brand">
      <Image src="/lgu-seal.png" alt="LGU Quezon seal" width={48} height={48} priority />
      <span>
        <strong>LGU Portal</strong>
        <small>{compact ? "Administration" : "One account. Your public service tools."}</small>
      </span>
    </div>
  );
}

export function PortalHeading({ eyebrow, title, children }: { eyebrow: string; title: string; children?: ReactNode }) {
  return (
    <header className="lp-heading">
      <p className="lp-eyebrow">{eyebrow}</p>
      <h1>{title}</h1>
      {children && <p>{children}</p>}
    </header>
  );
}

export function PortalStatus({ kind = "info", title, children, action }: {
  kind?: "info" | "error" | "empty" | "success";
  title: string;
  children?: ReactNode;
  action?: ReactNode;
}) {
  const Icon = kind === "error" ? AlertCircle : kind === "empty" ? SearchX : ShieldCheck;
  return (
    <section className={`lp-status lp-status-${kind}`} role={kind === "error" ? "alert" : "status"}>
      <Icon size={22} aria-hidden="true" />
      <div>
        <strong>{title}</strong>
        {children && <p>{children}</p>}
        {action}
      </div>
    </section>
  );
}

export function PasswordInput({ id, label, ...props }: { id: string; label: string } & Omit<ComponentProps<typeof Input>, "id" | "type">) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="lp-field">
      <Label htmlFor={id}>{label}</Label>
      <div className="lp-password">
        <Input id={id} type={visible ? "text" : "password"} {...props} />
        <Button type="button" variant="ghost" size="icon" aria-label={`${visible ? "Hide" : "Show"} ${label.toLowerCase()}`} aria-pressed={visible} onClick={() => setVisible(!visible)}>
          {visible ? <EyeOff size={18} /> : <Eye size={18} />}
        </Button>
      </div>
    </div>
  );
}

export function AuthShell({ eyebrow, title, children }: { eyebrow: string; title: string; children: ReactNode }) {
  return (
    <main className="lp-auth">
      <section className="lp-auth-context">
        <PortalBrand />
        <div>
          <p className="lp-eyebrow">Employee access</p>
          <h1>Your account.<br />Connected services.</h1>
          <p>One secure identity for the tools you use in public service.</p>
        </div>
        <p className="lp-auth-foot">For authorized LGU employees and personnel.</p>
      </section>
      <section className="lp-auth-form">
        <div className="lp-auth-inner">
          <p className="lp-eyebrow">{eyebrow}</p>
          <h2>{title}</h2>
          {children}
          <div className="lp-auth-help">
            <KeyRound size={18} aria-hidden="true" />
            <p>Need access or help with your password?<br /><strong>Contact your SSO administrator.</strong></p>
          </div>
        </div>
        <p className="lp-auth-footer"><ShieldCheck size={16} aria-hidden="true" /> Protected by LGU single sign-on</p>
      </section>
    </main>
  );
}
