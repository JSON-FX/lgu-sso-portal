"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Check, Loader2, MessageSquare, RotateCw, Trash2, Upload } from "lucide-react";
import type { Employee } from "@/types/employee";
import { apiClient } from "@/lib/api/client";
import { useAuth } from "@/hooks/use-auth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Slider } from "@/components/ui/slider";
import "@/app/profile-photo.css";

export function ProfileAvatar({ photo, initials, size = "medium", alt = "Profile photo" }: { photo?: string | null; initials: string; size?: "small" | "medium" | "large"; alt?: string }) {
  return <Avatar className={`av-photo av-photo-${size}`}><AvatarImage src={photo || undefined} alt={alt} /><AvatarFallback>{initials}</AvatarFallback></Avatar>;
}
export function employeePhotoUrl(employee: Pick<Employee, "avatar_version" | "uuid">, administrator = false): string | null {
  return employee.avatar_version ? `/api/sso-backend/${administrator ? `employees/${employee.uuid}` : "portal/profile"}/avatar?v=${encodeURIComponent(employee.avatar_version)}` : null;
}

export function ProfilePhoto({ employee, administrator = false, onSaved }: { employee: Employee; administrator?: boolean; onSaved: (employee: Employee) => void }) {
  const photo = employeePhotoUrl(employee, administrator);
  const admin = administrator;
  const endpoint = administrator ? `/employees/${employee.uuid}/avatar` : "/portal/profile/avatar";
  const subject = employee.first_name;
  const [source, setSource] = useState<string | null>(null);
  const [framing, setFraming] = useState(false);
  const [removeOpen, setRemoveOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [draft, setDraft] = useState("");
  const [error, setError] = useState("");
  const [saveError, setSaveError] = useState("");
  const [status, setStatus] = useState("");
  const [dragging, setDragging] = useState(false);
  const [decoding, setDecoding] = useState(false);
  const picker = useRef<HTMLInputElement>(null);
  const crop = useRef<HTMLCanvasElement>(null);
  const sourceUrl = useRef<string | null>(null);
  const pending = useRef(false);
  const alive = useRef(true);
  const uploadTrigger = useRef<HTMLButtonElement>(null);

  useEffect(() => { alive.current = true; return () => { alive.current = false; if (sourceUrl.current) URL.revokeObjectURL(sourceUrl.current); }; }, []);
  useEffect(() => {
    if (!framing || !source) return;
    let active = true;
    const image = new Image();
    setDraft(""); setDecoding(true);
    image.onload = () => {
      if (!active || !crop.current) return;
      const canvas = crop.current;
      const ctx = canvas.getContext("2d");
      if (!ctx) { setSaveError("Photo preview is unavailable in this browser. Try another browser."); setDecoding(false); return; }
      const quarterTurn = rotation % 180 !== 0;
      const width = quarterTurn ? image.naturalHeight : image.naturalWidth;
      const height = quarterTurn ? image.naturalWidth : image.naturalHeight;
      const scale = 512 / Math.min(width, height) * zoom;
      ctx.clearRect(0, 0, 512, 512);
      ctx.fillStyle = "#ffffff"; ctx.fillRect(0, 0, 512, 512);
      ctx.save();
      ctx.translate(256 + position.x * (width * scale - 512) / 2, 256 + position.y * (height * scale - 512) / 2);
      ctx.rotate(rotation * Math.PI / 180);
      ctx.drawImage(image, -image.naturalWidth * scale / 2, -image.naturalHeight * scale / 2, image.naturalWidth * scale, image.naturalHeight * scale);
      ctx.restore();
      setDraft(canvas.toDataURL("image/webp", 0.9)); setDecoding(false);
    };
    image.onerror = () => { if (active) { setSaveError("This image couldn’t be opened. Choose another photo."); setDecoding(false); } };
    image.src = source;
    return () => { active = false; };
  }, [source, framing, zoom, rotation, position]);

  const selectFile = async (file?: File) => {
    if (!file || busy || pending.current) return;
    setStatus(""); setError("");
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) { setError("That file isn’t a supported photo. Choose a JPG, PNG, or WebP image."); return; }
    if (file.size > 5 * 1024 * 1024) { setError("That photo is larger than 5 MB. Choose a smaller image."); return; }
    pending.current = true;
    const url = URL.createObjectURL(file);
    try {
      const image = new Image(); image.src = url; await image.decode();
      if (!alive.current) { URL.revokeObjectURL(url); return; }
      if (Math.min(image.naturalWidth, image.naturalHeight) < 256) { URL.revokeObjectURL(url); setError("That photo is too small. Choose an image at least 256 × 256 pixels."); return; }
      if (Math.max(image.naturalWidth, image.naturalHeight) > 4096 || image.naturalWidth * image.naturalHeight > 16000000) { URL.revokeObjectURL(url); setError("Choose a photo up to 4096 pixels per side and 16 million pixels."); return; }
      if (sourceUrl.current) URL.revokeObjectURL(sourceUrl.current);
      sourceUrl.current = url; setSource(url); setZoom(1); setRotation(0); setPosition({ x: 0, y: 0 }); setSaveError(""); setFraming(true);
    } catch { URL.revokeObjectURL(url); setError("This image couldn’t be opened. Choose another photo."); }
    finally { pending.current = false; }
  };
  const save = async () => {
    if (!draft || busy || !crop.current) return;
    setBusy(true); setSaveError("");
    try {
      const canvas = crop.current;
      const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob((value) => value ? resolve(value) : reject(new Error("Could not prepare the photo.")), "image/webp", 0.9));
      const body = new FormData(); body.append("photo", blob, "profile.webp");
      const result = await apiClient.upload<{ data: Employee }>(endpoint, body);
      if (!alive.current) return;
      saved(result.data); setFraming(false); setStatus("Profile photo updated.");
    } catch (cause) { if (alive.current) setSaveError(cause instanceof Error ? cause.message : "Could not save the photo. Please try again."); }
    finally { if (alive.current) setBusy(false); }
  };
  const saved = (updated: Employee) => {
    onSaved(updated);
    useAuth.setState((state) => ({ user: state.user?.uuid === updated.uuid ? { ...state.user, avatar_version: updated.avatar_version, avatar_endpoint: updated.avatar_endpoint } : state.user }));
  };
  const remove = async () => {
    if (busy) return;
    setBusy(true); setSaveError("");
    try { const result = await apiClient.delete<{ data: Employee }>(endpoint); if (!alive.current) return; saved(result.data); setRemoveOpen(false); setStatus("Profile photo removed."); }
    catch (cause) { if (alive.current) setSaveError(cause instanceof Error ? cause.message : "Could not remove the photo. Please try again."); }
    finally { if (alive.current) setBusy(false); }
  };
  const move = (x: number, y: number) => setPosition((old) => ({ x: Math.max(-1, Math.min(1, old.x + x)), y: Math.max(-1, Math.min(1, old.y + y)) }));
  const choosePhoto = () => picker.current?.click();
  const open = framing;

  return <div className="lp-prototype av-prototype">
      <div className="av-columns">
        <section className="av-workspace" aria-labelledby="photo-heading"><h2 id="photo-heading">Profile photo</h2><p>{admin ? `This photo represents ${subject} across connected applications.` : "Help colleagues recognize you in LGU Portal and LGU Connect."}</p>
          <div className={`av-drop ${dragging ? "av-drop-active" : ""}`} onDragOver={(event) => { event.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)} onDrop={(event) => { event.preventDefault(); setDragging(false); void selectFile(event.dataTransfer.files[0]); }}>
            <ProfileAvatar initials={employee.initials} photo={photo} size="large" />
            <div className="av-upload-copy"><strong>{photo ? (admin ? `${subject}’s shared profile photo` : "Your shared profile photo") : (admin ? "Add an employee photo" : "Add a face to your account")}</strong><p>{photo ? "Choose a new image to replace this photo." : (admin ? `Choose a clear photo where ${subject}’s face is easy to see.` : "Choose a clear photo where your face is easy to see.")}</p><div className="av-actions"><Button ref={uploadTrigger} disabled={busy} onClick={choosePhoto}><Upload aria-hidden="true" />{photo ? "Change photo" : "Upload photo"}</Button>{photo && <Button variant="ghost" disabled={busy} onClick={() => { setSaveError(""); setRemoveOpen(true); }}><Trash2 aria-hidden="true" />Remove</Button>}</div><small>JPG, PNG, or WebP · Up to 5 MB<br />At least 256 × 256 pixels. You can also drop a photo here.</small></div>
          </div>
          <input ref={picker} type="file" className="sr-only" tabIndex={-1} aria-label="Choose profile photo" accept="image/jpeg,image/png,image/webp" onChange={(event) => { void selectFile(event.target.files?.[0]); event.target.value = ""; }} />
          {error && <p role="alert" className="av-error">{error}</p>}{status && <p role="status" className="av-success"><Check aria-hidden="true" />{status}</p>}
          <div className="av-sharing"><MessageSquare aria-hidden="true" /><div><strong>One photo for connected work</strong><p>{admin ? `Connected applications use ${subject}’s SSO photo by default. An application may use its own override.` : "Connected applications use your SSO photo by default. An application may use its own override."}</p></div></div>
        </section>
        <aside className="av-connect" aria-labelledby="connect-heading"><h2 id="connect-heading">In LGU Connect</h2><p>Preview at the sizes colleagues see.</p><div className="av-connect-surface"><div className="av-connect-room"><MessageSquare aria-hidden="true" /><strong>LGU Connect</strong><span>Photo preview</span></div><div className="av-message"><ProfileAvatar initials={employee.initials} photo={photo} size="small" /><div><div className="av-message-author"><strong>{employee.full_name}</strong><time>9:41 AM</time></div><p>Your shared photo appears beside messages.</p></div></div><div className="av-member"><ProfileAvatar initials={employee.initials} photo={photo} /><div><strong>{employee.full_name}</strong><span>{employee.office?.name || "Municipal employee"}</span></div></div></div><small className="av-preview-caption">Default appearance. Connect may use a separate photo.</small></aside>
      </div>
    <Dialog open={open} onOpenChange={(value) => { if (!busy) setFraming(value); }}><DialogContent className="av-editor" showCloseButton={!busy} onCloseAutoFocus={(event) => { event.preventDefault(); uploadTrigger.current?.focus(); }}><DialogHeader><DialogTitle>Frame {admin ? `${subject}’s` : "your"} photo</DialogTitle><DialogDescription>{admin ? `Keep ${subject}’s face inside the circle.` : "Keep your face inside the circle."} Check the small preview before saving.</DialogDescription></DialogHeader>
      <div className="av-editor-content"><div className="av-crop-area"><canvas ref={crop} width={512} height={512} role="img" aria-label="Circular profile photo framing preview" />{decoding && <span role="status">Preparing preview…</span>}</div><div className="av-crop-previews"><ProfileAvatar initials={employee.initials} photo={draft || null} /><ProfileAvatar initials={employee.initials} photo={draft || null} size="small" /><span>Profile & messages</span></div></div>
      <div className="av-crop-tools"><div className="av-zoom"><label id="photo-zoom-label">Zoom</label><Slider aria-labelledby="photo-zoom-label" thumbProps={{ "aria-label": "Photo zoom", "aria-valuetext": `${Math.round(zoom * 100)} percent` }} min={1} max={3} step={0.05} value={[zoom]} disabled={busy} onValueChange={([value]) => setZoom(value)} /><output>{Math.round(zoom * 100)}%</output></div><div className="av-framing-actions"><div className="av-position" role="group" aria-label="Reposition photo"><Button variant="outline" size="icon" disabled={busy || zoom === 1} aria-label="Move photo left" onClick={() => move(-0.15, 0)}><ArrowLeft /></Button><Button variant="outline" size="icon" disabled={busy || zoom === 1} aria-label="Move photo right" onClick={() => move(0.15, 0)}><ArrowRight /></Button><Button variant="outline" size="icon" disabled={busy || zoom === 1} aria-label="Move photo up" onClick={() => move(0, -0.15)}><ArrowUp /></Button><Button variant="outline" size="icon" disabled={busy || zoom === 1} aria-label="Move photo down" onClick={() => move(0, 0.15)}><ArrowDown /></Button></div><Button variant="ghost" disabled={busy} onClick={() => { setRotation((old) => (old + 90) % 360); setPosition({ x: 0, y: 0 }); }}><RotateCw />Rotate</Button></div><small>Zoom in, then use the arrow buttons to reposition.</small></div>
      {saveError && <p role="alert" className="av-error">{saveError}</p>}
      <DialogFooter><Button variant="outline" disabled={busy} onClick={() => setFraming(false)}>Cancel</Button><Button disabled={busy || !draft || decoding} onClick={() => void save()}>{busy ? <Loader2 className="av-spinner" /> : <Check />}{busy ? "Saving photo…" : saveError ? "Try saving again" : "Save photo"}</Button></DialogFooter>
    </DialogContent></Dialog>
    <AlertDialog open={removeOpen} onOpenChange={(value) => { if (!busy) setRemoveOpen(value); }}><AlertDialogContent onCloseAutoFocus={(event) => { event.preventDefault(); uploadTrigger.current?.focus(); }}><AlertDialogHeader><AlertDialogTitle>Remove {admin ? `${subject}’s` : "your"} profile photo?</AlertDialogTitle><AlertDialogDescription>Initials will appear wherever this SSO photo is used. Application overrides stay unchanged. You can upload another photo at any time.</AlertDialogDescription></AlertDialogHeader>{saveError && <p role="alert" className="av-error">{saveError}</p>}<AlertDialogFooter><AlertDialogCancel disabled={busy}>Keep photo</AlertDialogCancel><AlertDialogAction disabled={busy} onClick={(event) => { event.preventDefault(); void remove(); }}>{busy ? "Removing…" : "Remove photo"}</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
  </div>;
}
