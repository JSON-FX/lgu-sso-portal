"use client";

import { useState, type FormEvent } from "react";
import { PortalStatus } from "@/components/portal/design";
import { PortalSelect } from "@/components/portal/selection";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ApiError } from "@/lib/api";
import type { Application, CreateApplicationData } from "@/types";

export type ApplicationFormValues = CreateApplicationData & { is_active?: boolean };
export function ApplicationForm({ initial, onSave, onCancel, submitLabel }: {
  initial?: Application;
  onSave: (values: ApplicationFormValues) => Promise<void>;
  onCancel: () => void;
  submitLabel: string;
}) {
  const [name, setName] = useState(initial?.name || "");
  const [description, setDescription] = useState(initial?.description || "");
  const [status, setStatus] = useState(initial?.is_active === false ? "inactive" : "active");
  const [limit, setLimit] = useState(String(initial?.rate_limit_per_minute ?? 60));
  const [callbacks, setCallbacks] = useState(initial?.redirect_uris.join("\n") || "");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState("");
  const [saving, setSaving] = useState(false);
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); setSubmitError("");
    const next: Record<string, string> = {};
    const uris = callbacks.split("\n").map((item) => item.trim()).filter(Boolean);
    if (name.trim().length < 2) next.name = "Enter at least 2 characters.";
    if (!Number.isInteger(Number(limit)) || Number(limit) < 1 || Number(limit) > 10000) next.rate_limit_per_minute = "Enter a whole number from 1 to 10,000.";
    if (!uris.length) next.redirect_uris = "Enter at least one callback URL.";
    else for (const uri of uris) {
      if (initial?.redirect_uris.includes(uri)) continue;
      try {
        const url = new URL(uri);
        if ((url.protocol !== "https:" && !(url.protocol === "http:" && ["localhost", "127.0.0.1"].includes(url.hostname))) || url.hash || url.username || url.password || uri.includes("*")) throw new Error();
      } catch { next.redirect_uris = "New callback URLs must use exact HTTPS addresses. Localhost may use HTTP for development."; break; }
    }
    setErrors(next); if (Object.keys(next).length) return;
    setSaving(true);
    try { await onSave({ name: name.trim(), description: description.trim(), redirect_uris: uris, rate_limit_per_minute: Number(limit), ...(initial ? { is_active: status === "active" } : {}) }); }
    catch (cause) {
      if (cause instanceof ApiError && cause.errors) setErrors(Object.fromEntries(Object.entries(cause.errors).map(([key, messages]) => [key, messages[0] || "Invalid value."])));
      setSubmitError(cause instanceof Error ? cause.message : "Application could not be saved.");
    } finally { setSaving(false); }
  };
  return <form className="lp-admin-form" onSubmit={submit}>
    <section className="lp-admin-section"><div className="lp-admin-section-heading"><h2>Application details</h2></div><div className="lp-admin-fields">
      <div className="lp-admin-field"><Label htmlFor="name">Application name</Label><Input id="name" value={name} onChange={(event) => setName(event.target.value)} required maxLength={255} aria-invalid={!!errors.name} />{errors.name && <p className="lp-admin-error" role="alert">{errors.name}</p>}</div>
      <div className="lp-admin-field"><Label htmlFor="status">Status</Label><PortalSelect id="status" label="Status" value={status} options={[{ value: "active", label: "Active" }, { value: "inactive", label: "Inactive" }]} onValueChange={setStatus} disabled={!initial} />{!initial && <p className="lp-admin-hint">New applications start active.</p>}</div>
      <div className="lp-admin-field"><Label htmlFor="description">Description</Label><Textarea id="description" value={description} onChange={(event) => setDescription(event.target.value)} rows={3} maxLength={1000} /></div>
      <div className="lp-admin-field"><Label htmlFor="limit">Requests per minute</Label><Input id="limit" type="number" min={1} max={10000} step={1} value={limit} onChange={(event) => setLimit(event.target.value)} required aria-invalid={!!errors.rate_limit_per_minute} />{errors.rate_limit_per_minute && <p className="lp-admin-error" role="alert">{errors.rate_limit_per_minute}</p>}</div>
    </div></section>
    <section className="lp-admin-section"><div className="lp-admin-section-heading"><h2>Redirect allowlist</h2><p>Only exact registered callback URLs can receive an authorization code.</p></div><div className="lp-admin-field"><Label htmlFor="callbacks">Callback URLs</Label><Textarea id="callbacks" value={callbacks} onChange={(event) => setCallbacks(event.target.value)} placeholder="https://application.example.invalid/auth/callback" rows={4} required aria-invalid={!!errors.redirect_uris} /><p className="lp-admin-hint">One URL per line. New callbacks use HTTPS; localhost HTTP and saved callbacks remain supported.</p>{errors.redirect_uris && <p className="lp-admin-error" role="alert">{errors.redirect_uris}</p>}</div></section>
    {submitError && <PortalStatus kind="error" title="Application could not be saved.">{submitError}</PortalStatus>}
    <div className="lp-admin-form-actions"><Button type="button" variant="outline" onClick={onCancel} disabled={saving}>Cancel</Button><Button type="submit" disabled={saving}>{saving ? "Saving…" : submitLabel}</Button></div>
  </form>;
}
