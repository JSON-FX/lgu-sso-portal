"use client";

import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { ArrowLeft, Check, Download, Plus, Search, X } from "lucide-react";
import { PortalSelect } from "@/components/portal/selection";
import { PortalStatus } from "@/components/portal/design";
import { officeApi, ApiError } from "@/lib/api";
import { downloadDirectoryCsv } from "@/lib/directory-csv";
import { useNavigationGuard } from "./navigation-guard";
import type { ManagedOffice as Office } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

type OfficeView = "offices" | "office-new" | "office-detail";

function OfficeStatus({ active }: { active: boolean }) {
  return <Badge variant={active ? "secondary" : "outline"} className="lp-office-status">{active ? "Active" : "Inactive"}</Badge>;
}

export function OfficeManagement() {
  const [view, setView] = useState<OfficeView>("offices");
  const [offices, setOffices] = useState<Office[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const { setEditorState: onEditorStateChange, requestNavigation, setPageReset } = useNavigationGuard();
  useEffect(() => { setPageReset(() => setView("offices")); return () => setPageReset(null); }, [setPageReset]);
  const onNavigate = (next: OfficeView) => requestNavigation(() => setView(next));
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [resolvedState, setResolvedState] = useState<"loading" | "ready" | "error">("loading");
  const [loadError, setLoadError] = useState("");
  const loadSequence = useRef(0);
  const load = useCallback(async () => {
    const sequence = ++loadSequence.current;
    setResolvedState("loading"); setLoadError("");
    try {
      const result = await officeApi.listAll();
      if (sequence !== loadSequence.current) return;
      setOffices(result.data); setResolvedState("ready");
    } catch (cause) {
      if (sequence !== loadSequence.current) return;
      setLoadError(cause instanceof Error ? cause.message : "The directory is temporarily unavailable.");
      setResolvedState("error");
    }
  }, []);
  const cancelLoad = useCallback(() => { loadSequence.current++; }, []);
  useEffect(() => { void Promise.resolve().then(load); return cancelLoad; }, [load, cancelLoad]);
  const [notice, setNotice] = useState("");
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState("");
  const heading = useRef<HTMLHeadingElement>(null);
  const previousView = useRef(view);

  useEffect(() => {
    if (previousView.current !== view) {
      heading.current?.focus();
      previousView.current = view;
    }
  }, [view]);

  const selected = offices.find((office) => office.id === selectedId);
  const filtered = offices.filter((office) =>
    `${office.name} ${office.abbreviation}`.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()) &&
    (status === "all" || office.is_active === (status === "active")),
  ).sort((a, b) => a.name.localeCompare(b.name));

  const exportAll = async () => {
    setExporting(true); setExportError("");
    try {
      const current = (await officeApi.listAll()).data;
      setOffices(current);
      downloadDirectoryCsv("sso-offices.csv", ["id", "name", "abbreviation", "is_active"], [...current].sort((a, b) => a.name.localeCompare(b.name)).map((office) => [office.id, office.name, office.abbreviation, office.is_active]));
    } catch (cause) {
      setExportError(cause instanceof Error ? cause.message : "The office directory could not be exported. Try again.");
    } finally { setExporting(false); }
  };

  const save = async (values: Pick<Office, "name" | "abbreviation">) => {
    if (view === "office-new") {
      const saved = (await officeApi.create(values)).data;
      setOffices((current) => [...current, saved]);
      setNotice(`${saved.name} added. It is now available in active office lists.`);
    } else {
      if (!selected) throw new Error("This office is no longer available. Reload the directory.");
      const saved = (await officeApi.update(selected.id, values)).data;
      setOffices((current) => current.map((office) => office.id === saved.id ? saved : office));
      setNotice(`${saved.name} saved. Existing employee assignments stay linked.`);
    }
    setQuery("");
    setStatus("all");
    onEditorStateChange(false, false);
    onNavigate("offices");
  };

  if (view !== "offices") {
    return <OfficeEditor key={view === "office-new" ? "new" : selectedId} office={view === "office-detail" ? selected : undefined}
      offices={offices} onEditorStateChange={onEditorStateChange} onSave={save} onBack={() => onNavigate("offices")}
      onStatusChange={async () => {
        if (!selected) throw new Error("This office is no longer available. Reload the directory.");
        const saved = (await officeApi.update(selected.id, { is_active: !selected.is_active })).data;
        setOffices((current) => current.map((office) => office.id === saved.id ? saved : office));
      }} />;
  }

  return <div className="lp-admin lp-offices">
    <header className="lp-admin-heading">
      <div><h1 ref={heading} tabIndex={-1}>Offices</h1><p className="lp-admin-description">Manage the office names and abbreviations shared across connected applications.</p></div>
      <div className="lp-directory-actions">
        <Button variant="outline" disabled={resolvedState !== "ready" || exporting} onClick={() => void exportAll()}><Download aria-hidden="true" />{exporting ? "Exporting…" : "Export all CSV"}</Button>
        <Button disabled={resolvedState !== "ready"} onClick={() => { setNotice(""); onNavigate("office-new"); }}><Plus aria-hidden="true" />Add office</Button>
      </div>
    </header>
    {notice && <div className="lp-office-notice" role="status"><Check aria-hidden="true" /><p>{notice}</p><Button variant="ghost" size="icon" aria-label="Dismiss confirmation" onClick={() => setNotice("")}><X aria-hidden="true" /></Button></div>}
    {exportError && <div className="lp-office-save-error"><PortalStatus kind="error" title="Offices could not be exported.">{exportError} Try again to download current records.</PortalStatus></div>}
    <div className="lp-admin-toolbar lp-office-toolbar">
      <div className="lp-admin-search"><Search size={18} aria-hidden="true" /><Input type="search" aria-label="Search offices" placeholder="Search office name or abbreviation" value={query} onChange={(event) => setQuery(event.target.value)} /></div>
      <div className="lp-office-filter"><PortalSelect label="Office status" value={status} options={[{ value: "all", label: "All statuses" }, { value: "active", label: "Active" }, { value: "inactive", label: "Inactive" }]} onValueChange={setStatus} /></div>
      <span className="lp-admin-hint" role="status">{resolvedState !== "loading" && resolvedState !== "error" && `${filtered.length} ${filtered.length === 1 ? "office" : "offices"}`}</span>
    </div>
    {resolvedState === "error" ? <PortalStatus kind="error" title="Offices could not be loaded." action={<Button variant="outline" onClick={() => void load()}>Try again</Button>}>{loadError} Try again to load the latest records.</PortalStatus> :
      <div className="lp-admin-table lp-office-table" aria-busy={resolvedState === "loading"}>
        <Table><TableHeader><TableRow><TableHead>Office name</TableHead><TableHead>Abbreviation</TableHead><TableHead>Status</TableHead><TableHead className="lp-admin-right">Manage</TableHead></TableRow></TableHeader><TableBody>
          {resolvedState === "loading" ? [1, 2, 3, 4, 5].map((row) => <TableRow key={row}><TableCell colSpan={4}><Skeleton className="h-10 w-full" /><span className="sr-only">Loading offices…</span></TableCell></TableRow>) : filtered.length ? filtered.map((office) =>
            <TableRow key={office.id}>
              <TableCell className="lp-office-name"><strong>{office.name}</strong></TableCell>
              <TableCell><span className="lp-office-abbreviation">{office.abbreviation}</span></TableCell>
              <TableCell><OfficeStatus active={office.is_active} /></TableCell>
              <TableCell className="lp-admin-right"><Button variant="outline" size="sm" aria-label={`Edit ${office.name}`} onClick={() => { setSelectedId(office.id); setNotice(""); onNavigate("office-detail"); }}>Edit office</Button></TableCell>
            </TableRow>,
          ) : <TableRow><TableCell colSpan={4}><div className="lp-admin-empty"><strong>{offices.length ? "No offices match your filters." : "No offices yet."}</strong><p>{offices.length ? "Try a different name, abbreviation, or status." : "Add an office to make it available to employees and connected applications."}</p>{offices.length > 0 && <Button variant="outline" onClick={() => { setQuery(""); setStatus("all"); }}>Clear filters</Button>}</div></TableCell></TableRow>}
        </TableBody></Table>
      </div>}
    <div className="lp-office-directory-note"><p><strong>One shared office directory.</strong> Active offices appear in office lists. Inactive offices stay linked to existing records.</p><p>Connected applications receive changes when they next refresh office data.</p></div>
  </div>;
}

function OfficeEditor({ office, offices, onSave, onBack, onStatusChange, onEditorStateChange }: {
  onEditorStateChange: (dirty: boolean, busy: boolean) => void;
  office?: Office;
  offices: Office[];
  onSave: (values: Pick<Office, "name" | "abbreviation">) => Promise<void>;
  onBack: () => void;
  onStatusChange: () => Promise<void>;
}) {
  const [name, setName] = useState(office?.name ?? "");
  const [abbreviation, setAbbreviation] = useState(office?.abbreviation ?? "");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saveError, setSaveError] = useState("");
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState<"status" | null>(null);
  const [statusError, setStatusError] = useState("");
  const cancelStatus = useRef<HTMLButtonElement>(null);
  const [statusNotice, setStatusNotice] = useState("");
  const nameInput = useRef<HTMLInputElement>(null);
  const abbreviationInput = useRef<HTMLInputElement>(null);
  const returnFocus = useRef<HTMLButtonElement | null>(null);
  const title = useRef<HTMLHeadingElement>(null);
  const dirty = name !== (office?.name ?? "") || abbreviation !== (office?.abbreviation ?? "");

  useEffect(() => { title.current?.focus(); }, []);
  useEffect(() => {
    if (!busy && (errors.name || errors.abbreviation)) (errors.name ? nameInput : abbreviationInput).current?.focus();
  }, [errors, busy]);

  useEffect(() => {
    onEditorStateChange(dirty, busy);
    return () => onEditorStateChange(false, false);
  }, [dirty, busy, onEditorStateChange]);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaveError("");
    const values = { name: name.trim(), abbreviation: abbreviation.trim() };
    const next: Record<string, string> = {};
    if (!values.name) next.name = "Enter the office name.";
    else if (values.name.length > 255) next.name = "Use 255 characters or fewer.";
    if (!values.abbreviation) next.abbreviation = "Enter an abbreviation.";
    else if (values.abbreviation.length > 20) next.abbreviation = "Use 20 characters or fewer.";
    for (const other of offices.filter((item) => item.id !== office?.id)) {
      if (other.name.toLocaleLowerCase() === values.name.toLocaleLowerCase()) next.name = "An office with this name already exists.";
      if (other.abbreviation.toLocaleLowerCase() === values.abbreviation.toLocaleLowerCase()) next.abbreviation = `This abbreviation is already used by ${other.name}.`;
    }
    setErrors(next);
    if (Object.keys(next).length) { (next.name ? nameInput : abbreviationInput).current?.focus(); return; }
    onEditorStateChange(dirty, true);
    setBusy(true);
    try { await onSave(values); }
    catch (cause) {
      if (cause instanceof ApiError && cause.errors) {
        const fields = Object.fromEntries(Object.entries(cause.errors).map(([key, messages]) => [key, messages[0] || "Invalid value."]));
        setErrors(fields);
      }
      setSaveError(cause instanceof Error ? cause.message : "Your changes were not saved. Check your connection and try again.");
    }
    finally { setBusy(false); }
  };

  return <div className="lp-admin lp-offices">
    <Button variant="ghost" className="lp-admin-back" disabled={busy} onClick={onBack}><ArrowLeft aria-hidden="true" />Offices</Button>
    <header className="lp-admin-heading"><div><h1 ref={title} tabIndex={-1}>{office ? "Edit office" : "Add office"}</h1><p className="lp-admin-description">{office ? "Keep this office’s details current across employee records and connected applications." : "Create a shared office record for employees and connected applications."}</p></div>{office && <OfficeStatus active={office.is_active} />}</header>
    <div className="lp-office-editor-layout">
      <div>
        <form className="lp-admin-form" noValidate onSubmit={submit}>
          <section className="lp-admin-section"><div className="lp-admin-section-heading"><h2>Office details</h2><p>Both fields are required.</p></div>
            <div className="lp-office-fields">
              <div className="lp-admin-field"><Label htmlFor="office-name">Office name</Label><Input ref={nameInput} id="office-name" autoComplete="off" required maxLength={255} disabled={busy} value={name} onChange={(event) => setName(event.target.value)} placeholder="e.g. Municipal Budget Office" aria-invalid={!!errors.name} aria-describedby={errors.name ? "office-name-error" : undefined} />{errors.name && <p id="office-name-error" className="lp-admin-error" role="alert">{errors.name}</p>}</div>
              <div className="lp-admin-field lp-office-abbreviation-field"><Label htmlFor="office-abbreviation">Abbreviation</Label><Input ref={abbreviationInput} id="office-abbreviation" autoComplete="off" required maxLength={20} disabled={busy} value={abbreviation} onChange={(event) => setAbbreviation(event.target.value)} placeholder="e.g. MBO" aria-invalid={!!errors.abbreviation} aria-describedby={`office-abbreviation-hint${errors.abbreviation ? " office-abbreviation-error" : ""}`} /><p id="office-abbreviation-hint" className="lp-admin-hint">Up to 20 characters. Each office needs a unique abbreviation.</p>{errors.abbreviation && <p id="office-abbreviation-error" className="lp-admin-error" role="alert">{errors.abbreviation}</p>}</div>
            </div>
          </section>
          {saveError && <div className="lp-office-save-error"><PortalStatus kind="error" title="Office could not be saved.">{saveError}</PortalStatus></div>}
          <div className="lp-admin-form-actions"><Button type="button" variant="outline" disabled={busy} onClick={onBack}>Cancel</Button><Button type="submit" disabled={busy}>{busy ? "Saving…" : office ? "Save changes" : "Add office"}</Button></div>
        </form>
        {office && <section className="lp-admin-section lp-office-status-section">
          <div className="lp-admin-section-heading"><h2>Office status</h2><p>{office.is_active ? "This office is available in active office lists." : "This office is excluded from active office lists. Existing records stay linked."}</p></div>
          {statusNotice && <p className="lp-office-status-notice" role="status"><Check size={18} aria-hidden="true" />{statusNotice}</p>}
          <Button variant="outline" disabled={busy || dirty} onClick={(event) => { returnFocus.current = event.currentTarget; setStatusError(""); setConfirm("status"); }}>{office.is_active ? "Deactivate office" : "Reactivate office"}</Button>
          {dirty && <p className="lp-admin-hint lp-office-status-hint">Save or discard your edits before changing office status.</p>}
        </section>}
      </div>
      <aside className="lp-office-impact" aria-label="Effect on connected applications"><h2>Shared across applications</h2>
        <p>{office ? "Changes to the name or abbreviation appear when connected applications next refresh office data." : "New offices start active and appear when connected applications next refresh office data."}</p>
        {office && <><h3>Existing records stay linked</h3><p>Editing or deactivating an office keeps its ID and employee assignments intact.</p></>}
      </aside>
    </div>
    <Dialog open={!!confirm} onOpenChange={(open) => { if (!open && !busy) setConfirm(null); }}>
      <DialogContent role="alertdialog" showCloseButton={false} onOpenAutoFocus={(event) => { event.preventDefault(); cancelStatus.current?.focus(); }} className="lp-office-confirm" onCloseAutoFocus={(event) => { event.preventDefault(); returnFocus.current?.focus(); }}>
        <DialogHeader><DialogTitle>{`${office?.is_active ? "Deactivate" : "Reactivate"} ${office?.abbreviation}?`}</DialogTitle>
          <DialogDescription>{`${office?.name} will ${office?.is_active ? "stop appearing" : "appear again"} in active office lists. Connected applications receive the change when they next refresh office data.`}</DialogDescription>
        </DialogHeader>
        {confirm === "status" && <p className="lp-office-confirm-note">Existing employee assignments and historical records stay linked to this office.</p>}
        {statusError && <PortalStatus kind="error" title="Status was not updated.">{statusError}</PortalStatus>}
        <DialogFooter><Button ref={cancelStatus} variant="outline" disabled={busy} onClick={() => setConfirm(null)}>Cancel</Button><Button disabled={busy} onClick={async (event) => {
          event.preventDefault(); onEditorStateChange(dirty, true); setBusy(true); setStatusError("");
          try { await onStatusChange(); setStatusNotice(office?.is_active ? "Office deactivated. Existing records remain linked." : "Office reactivated and available in active office lists."); setConfirm(null); }
          catch (cause) { setStatusError(cause instanceof Error ? cause.message : "Office status could not be updated. Try again."); }
          finally { setBusy(false); }
        }}>{busy ? "Updating…" : office?.is_active ? "Deactivate office" : "Reactivate office"}</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  </div>;
}
