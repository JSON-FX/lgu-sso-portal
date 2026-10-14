"use client";

import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { ArrowLeft, Check, Download, Plus, Search, X } from "lucide-react";
import { PortalSelect } from "@/components/portal/selection";
import { PortalStatus } from "@/components/portal/design";
import { positionApi, ApiError } from "@/lib/api";
import { downloadDirectoryCsv } from "@/lib/directory-csv";
import { useNavigationGuard } from "./navigation-guard";
import type { ManagedPosition as Position } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

type View = "positions" | "position-new" | "position-detail";

function PositionStatus({ active }: { active: boolean }) {
  return <Badge variant={active ? "secondary" : "outline"} className="lp-office-status">{active ? "Active" : "Inactive"}</Badge>;
}

export function PositionManagement() {
  const [view, setView] = useState<View>("positions");
  const [positions, setPositions] = useState<Position[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const { setEditorState, requestNavigation, setPageReset } = useNavigationGuard();
  useEffect(() => { setPageReset(() => setView("positions")); return () => setPageReset(null); }, [setPageReset]);
  const navigate = (next: View) => requestNavigation(() => setView(next));
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [loadState, setLoadState] = useState<"loading" | "ready" | "error">("loading");
  const [loadError, setLoadError] = useState("");
  const loadSequence = useRef(0);
  const load = useCallback(async () => {
    const sequence = ++loadSequence.current;
    setLoadState("loading"); setLoadError("");
    try {
      const result = await positionApi.listAll();
      if (sequence !== loadSequence.current) return;
      setPositions(result.data); setLoadState("ready");
    } catch (cause) {
      if (sequence !== loadSequence.current) return;
      setLoadError(cause instanceof Error ? cause.message : "The position directory is temporarily unavailable.");
      setLoadState("error");
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
    if (previousView.current !== view) { heading.current?.focus(); previousView.current = view; }
  }, [view]);

  const selected = positions.find((position) => position.id === selectedId);
  const filtered = positions.filter((position) =>
    position.title.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()) &&
    (status === "all" || position.is_active === (status === "active")),
  ).sort((a, b) => a.title.localeCompare(b.title));

  const exportAll = async () => {
    setExporting(true); setExportError("");
    try {
      const current = (await positionApi.listAll()).data;
      setPositions(current);
      downloadDirectoryCsv("sso-positions.csv", ["id", "title", "is_active"], [...current].sort((a, b) => a.title.localeCompare(b.title)).map((position) => [position.id, position.title, position.is_active]));
    } catch (cause) {
      setExportError(cause instanceof Error ? cause.message : "The position directory could not be exported. Try again.");
    } finally { setExporting(false); }
  };

  const save = async (values: Pick<Position, "title">) => {
    if (view === "position-new") {
      const saved = (await positionApi.create(values)).data;
      setPositions((current) => [...current, saved]);
      setNotice(`${saved.title} added. It is now available in active position lists.`);
    } else {
      if (!selected) throw new Error("This position is no longer available. Reload the directory.");
      const saved = (await positionApi.update(selected.id, values)).data;
      setPositions((current) => current.map((position) => position.id === saved.id ? saved : position));
      setNotice(`${saved.title} saved. Existing employee assignments stay linked.`);
    }
    setQuery(""); setStatus("all"); setEditorState(false, false); navigate("positions");
  };

  if (view !== "positions") {
    return <PositionEditor key={view === "position-new" ? "new" : selectedId}
      position={view === "position-detail" ? selected : undefined} positions={positions}
      onEditorStateChange={setEditorState} onSave={save} onBack={() => navigate("positions")}
      onStatusChange={async () => {
        if (!selected) throw new Error("This position is no longer available. Reload the directory.");
        const saved = (await positionApi.update(selected.id, { is_active: !selected.is_active })).data;
        setPositions((current) => current.map((position) => position.id === saved.id ? saved : position));
      }} />;
  }

  return <div className="lp-admin lp-offices lp-positions">
    <header className="lp-admin-heading">
      <div><h1 ref={heading} tabIndex={-1}>Positions</h1><p className="lp-admin-description">Manage position titles shared across employee records and connected applications.</p></div>
      <div className="lp-directory-actions">
        <Button variant="outline" disabled={loadState !== "ready" || exporting} onClick={() => void exportAll()}><Download aria-hidden="true" />{exporting ? "Exporting…" : "Export all CSV"}</Button>
        <Button disabled={loadState !== "ready"} onClick={() => { setNotice(""); navigate("position-new"); }}><Plus aria-hidden="true" />Add position</Button>
      </div>
    </header>
    {notice && <div className="lp-office-notice" role="status"><Check aria-hidden="true" /><p>{notice}</p><Button variant="ghost" size="icon" aria-label="Dismiss confirmation" onClick={() => setNotice("")}><X aria-hidden="true" /></Button></div>}
    {exportError && <div className="lp-office-save-error"><PortalStatus kind="error" title="Positions could not be exported.">{exportError} Try again to download current records.</PortalStatus></div>}
    <div className="lp-admin-toolbar lp-office-toolbar">
      <div className="lp-admin-search"><Search size={18} aria-hidden="true" /><Input type="search" aria-label="Search positions" placeholder="Search position title" value={query} onChange={(event) => setQuery(event.target.value)} /></div>
      <div className="lp-office-filter"><PortalSelect label="Position status" value={status} options={[{ value: "all", label: "All statuses" }, { value: "active", label: "Active" }, { value: "inactive", label: "Inactive" }]} onValueChange={setStatus} /></div>
      <span className="lp-admin-hint" role="status">{loadState === "ready" && `${filtered.length} ${filtered.length === 1 ? "position" : "positions"}`}</span>
    </div>
    {loadState === "error" ? <PortalStatus kind="error" title="Positions could not be loaded." action={<Button variant="outline" onClick={() => void load()}>Try again</Button>}>{loadError} Try again to load the latest records.</PortalStatus> :
      <div className="lp-admin-table lp-office-table" aria-busy={loadState === "loading"}>
        <Table><TableHeader><TableRow><TableHead>Position title</TableHead><TableHead>Status</TableHead><TableHead className="lp-admin-right">Manage</TableHead></TableRow></TableHeader><TableBody>
          {loadState === "loading" ? [1, 2, 3, 4, 5].map((row) => <TableRow key={row}><TableCell colSpan={3}><Skeleton className="h-10 w-full" /><span className="sr-only">Loading positions…</span></TableCell></TableRow>) : filtered.length ? filtered.map((position) =>
            <TableRow key={position.id}>
              <TableCell className="lp-office-name"><strong>{position.title}</strong></TableCell>
              <TableCell><PositionStatus active={position.is_active} /></TableCell>
              <TableCell className="lp-admin-right"><Button variant="outline" size="sm" aria-label={`Edit ${position.title}`} onClick={() => { setSelectedId(position.id); setNotice(""); navigate("position-detail"); }}>Edit position</Button></TableCell>
            </TableRow>,
          ) : <TableRow><TableCell colSpan={3}><div className="lp-admin-empty"><strong>{positions.length ? "No positions match your filters." : "No positions yet."}</strong><p>{positions.length ? "Try a different title or status." : "Add a position to make it available to employees and connected applications."}</p>{positions.length > 0 && <Button variant="outline" onClick={() => { setQuery(""); setStatus("all"); }}>Clear filters</Button>}</div></TableCell></TableRow>}
        </TableBody></Table>
      </div>}
    <div className="lp-office-directory-note"><p><strong>One shared position directory.</strong> Active positions appear in employee selection lists. Inactive positions stay linked to existing records.</p><p>Connected applications receive changes when they next refresh position data.</p></div>
  </div>;
}

function PositionEditor({ position, positions, onSave, onBack, onStatusChange, onEditorStateChange }: {
  onEditorStateChange: (dirty: boolean, busy: boolean) => void;
  position?: Position;
  positions: Position[];
  onSave: (values: Pick<Position, "title">) => Promise<void>;
  onBack: () => void;
  onStatusChange: () => Promise<void>;
}) {
  const [value, setValue] = useState(position?.title ?? "");
  const [error, setError] = useState("");
  const [saveError, setSaveError] = useState("");
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [statusError, setStatusError] = useState("");
  const [statusNotice, setStatusNotice] = useState("");
  const titleInput = useRef<HTMLInputElement>(null);
  const cancelStatus = useRef<HTMLButtonElement>(null);
  const returnFocus = useRef<HTMLButtonElement | null>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const dirty = value !== (position?.title ?? "");

  useEffect(() => { heading.current?.focus(); }, []);
  useEffect(() => { if (!busy && error) titleInput.current?.focus(); }, [error, busy]);
  useEffect(() => { onEditorStateChange(dirty, busy); return () => onEditorStateChange(false, false); }, [dirty, busy, onEditorStateChange]);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); setSaveError("");
    const title = value.trim();
    const next = !title ? "Enter a position title." : title.length > 255 ? "Use 255 characters or fewer." :
      positions.some((other) => other.id !== position?.id && other.title.toLocaleLowerCase() === title.toLocaleLowerCase()) ? "A position with this title already exists." : "";
    setError(next);
    if (next) { titleInput.current?.focus(); return; }
    onEditorStateChange(dirty, true); setBusy(true);
    try { await onSave({ title }); }
    catch (cause) {
      if (cause instanceof ApiError && cause.errors?.title) setError(cause.errors.title[0] || "Invalid title.");
      setSaveError(cause instanceof Error ? cause.message : "Your changes were not saved. Check your connection and try again.");
    } finally { setBusy(false); }
  };

  return <div className="lp-admin lp-offices lp-positions">
    <Button variant="ghost" className="lp-admin-back" disabled={busy} onClick={onBack}><ArrowLeft aria-hidden="true" />Positions</Button>
    <header className="lp-admin-heading"><div><h1 ref={heading} tabIndex={-1}>{position ? "Edit position" : "Add position"}</h1><p className="lp-admin-description">{position ? "Keep this title current across employee records and connected applications." : "Create a shared position for employees and connected applications."}</p></div>{position && <PositionStatus active={position.is_active} />}</header>
    <div className="lp-office-editor-layout">
      <div>
        <form className="lp-admin-form" noValidate onSubmit={submit}>
          <section className="lp-admin-section"><div className="lp-admin-section-heading"><h2>Position details</h2><p>Title is required.</p></div>
            <div className="lp-office-fields"><div className="lp-admin-field"><Label htmlFor="position-title">Position title</Label><Input ref={titleInput} id="position-title" autoComplete="off" required maxLength={255} disabled={busy} value={value} onChange={(event) => setValue(event.target.value)} placeholder="e.g. Planning Officer I" aria-invalid={!!error} aria-describedby={error ? "position-title-error" : undefined} />{error && <p id="position-title-error" className="lp-admin-error" role="alert">{error}</p>}</div></div>
          </section>
          {saveError && <div className="lp-office-save-error"><PortalStatus kind="error" title="Position could not be saved.">{saveError}</PortalStatus></div>}
          <div className="lp-admin-form-actions"><Button type="button" variant="outline" disabled={busy} onClick={onBack}>Cancel</Button><Button type="submit" disabled={busy}>{busy ? "Saving…" : position ? "Save changes" : "Add position"}</Button></div>
        </form>
        {position && <section className="lp-admin-section lp-office-status-section">
          <div className="lp-admin-section-heading"><h2>Position status</h2><p>{position.is_active ? "This position is available in active position lists." : "This position is excluded from active position lists. Existing records stay linked."}</p></div>
          {statusNotice && <p className="lp-office-status-notice" role="status"><Check size={18} aria-hidden="true" />{statusNotice}</p>}
          <Button variant="outline" disabled={busy || dirty} onClick={(event) => { returnFocus.current = event.currentTarget; setStatusError(""); setConfirm(true); }}>{position.is_active ? "Deactivate position" : "Reactivate position"}</Button>
          {dirty && <p className="lp-admin-hint lp-office-status-hint">Save or discard your edits before changing position status.</p>}
        </section>}
      </div>
      <aside className="lp-office-impact" aria-label="Effect on connected applications"><h2>Shared across applications</h2>
        <p>{position ? "Changes to the title appear when connected applications next refresh position data." : "New positions start active and appear when connected applications next refresh position data."}</p>
        {position && <><h3>Existing records stay linked</h3><p>Editing or deactivating a position keeps its ID and employee assignments intact.</p></>}
      </aside>
    </div>
    <Dialog open={confirm} onOpenChange={(open) => { if (!open && !busy) setConfirm(false); }}>
      <DialogContent role="alertdialog" showCloseButton={false} onOpenAutoFocus={(event) => { event.preventDefault(); cancelStatus.current?.focus(); }} className="lp-office-confirm" onCloseAutoFocus={(event) => { event.preventDefault(); returnFocus.current?.focus(); }}>
        <DialogHeader><DialogTitle>{`${position?.is_active ? "Deactivate" : "Reactivate"} ${position?.title}?`}</DialogTitle><DialogDescription>{`${position?.title} will ${position?.is_active ? "stop appearing" : "appear again"} in active position lists. Connected applications receive the change when they next refresh position data.`}</DialogDescription></DialogHeader>
        <p className="lp-office-confirm-note">Existing employee assignments and historical records stay linked to this position.</p>
        {statusError && <PortalStatus kind="error" title="Status was not updated.">{statusError}</PortalStatus>}
        <DialogFooter><Button ref={cancelStatus} variant="outline" disabled={busy} onClick={() => setConfirm(false)}>Cancel</Button><Button disabled={busy} onClick={async (event) => {
          event.preventDefault(); onEditorStateChange(dirty, true); setBusy(true); setStatusError("");
          try { await onStatusChange(); setStatusNotice(position?.is_active ? "Position deactivated. Existing records remain linked." : "Position reactivated and available in active position lists."); setConfirm(false); }
          catch (cause) { setStatusError(cause instanceof Error ? cause.message : "Position status could not be updated. Try again."); }
          finally { setBusy(false); }
        }}>{busy ? "Updating…" : position?.is_active ? "Deactivate position" : "Reactivate position"}</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  </div>;
}
