"use client";

import { useCallback, useEffect, useState, type FormEvent, type ReactNode } from "react";
import { format, isValid, parseISO } from "date-fns";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { PortalHeading, PortalStatus } from "@/components/portal/design";
import { PortalDatePicker, PortalSelect } from "@/components/portal/selection";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { portalApi } from "@/lib/api";
import { psgcApi, type PSGCBarangay, type PSGCMunicipality, type PSGCProvince, type PSGCRegion } from "@/lib/api/psgc";
import type { Employee, Office, Position } from "@/types/employee";
import type { UpdatePortalProfileData } from "@/types/portal";

type Form = {
  email: string; suffix: string; birthday: string; civil_status: Employee["civil_status"];
  nationality: string; office_id?: number; position_id?: number; date_employed: string;
  region: string; province: string; city: string; barangay: string;
  house_number: string; block_number: string; building_floor: string; residence: string;
};
const fromProfile = (p: Employee): Form => ({
  email: p.email || "", suffix: p.suffix || "", birthday: p.birthday || "", civil_status: p.civil_status || "single",
  nationality: p.nationality || "", office_id: p.office?.id, position_id: p.position?.id, date_employed: p.date_employed || "",
  region: p.region || "", province: p.province || "", city: p.city || "", barangay: p.barangay || "",
  house_number: p.house_number || "", block_number: p.block_number || "", building_floor: p.building_floor || "", residence: p.residence || "",
});
const civilOptions = ["single", "married", "widowed", "separated", "divorced"].map((value) => ({ value, label: value[0].toUpperCase() + value.slice(1) }));
const dateLabel = (value: string) => { const date = value ? parseISO(value) : null; return date && isValid(date) ? format(date, "PPP") : value; };
const placeOptions = (items: { code: string; name: string }[]) => items.map(({ code, name }) => ({ value: code, label: name }));

function Field({ id, label, value, editing, children }: { id: string; label: string; value?: string | null; editing: boolean; children: ReactNode }) {
  return <div className="lp-field"><Label htmlFor={id}>{label}</Label>{editing ? children : <p>{value || "Not provided"}</p>}</div>;
}

export default function PortalProfilePage() {
  const [profile, setProfile] = useState<Employee | null>(null);
  const [form, setForm] = useState<Form | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [offices, setOffices] = useState<Office[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);
  const [regions, setRegions] = useState<PSGCRegion[]>([]);
  const [provinces, setProvinces] = useState<PSGCProvince[]>([]);
  const [cities, setCities] = useState<PSGCMunicipality[]>([]);
  const [barangays, setBarangays] = useState<PSGCBarangay[]>([]);
  const [regionCode, setRegionCode] = useState("");
  const [provinceCode, setProvinceCode] = useState("");
  const [cityCode, setCityCode] = useState("");
  const [locationError, setLocationError] = useState(false);

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const data = await portalApi.getProfile();
      setProfile(data); setForm(fromProfile(data));
      const [officeResult, positionResult, regionResult] = await Promise.allSettled([portalApi.getOffices(), portalApi.getPositions(), psgcApi.getRegions()]);
      if (officeResult.status === "fulfilled") setOffices(officeResult.value);
      if (positionResult.status === "fulfilled") setPositions(positionResult.value);
      if (regionResult.status === "fulfilled") {
        const list = regionResult.value; setRegions(list); setLocationError(false);
        const region = list.find((item) => item.name === data.region);
        if (region) {
          try {
            setRegionCode(region.code);
            const provinceList = await psgcApi.getProvinces(region.code); setProvinces(provinceList);
            const province = provinceList.find((item) => item.name === data.province);
            if (province) {
              setProvinceCode(province.code);
              const cityList = await psgcApi.getMunicipalities(province.code); setCities(cityList);
              const city = cityList.find((item) => item.name === data.city);
              if (city) { setCityCode(city.code); setBarangays(await psgcApi.getBarangays(city.code)); }
            }
          } catch { setLocationError(true); }
        }
      } else setLocationError(true);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "We couldn’t load your profile."); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);

  const set = <K extends keyof Form>(key: K, value: Form[K]) => setForm((old) => old ? ({ ...old, [key]: value }) : old);
  const chooseRegion = async (code: string) => {
    setRegionCode(code); setProvinceCode(""); setCityCode(""); setProvinces([]); setCities([]); setBarangays([]);
    setForm((old) => old ? { ...old, region: regions.find((r) => r.code === code)?.name || "", province: "", city: "", barangay: "" } : old);
    if (code) try { setProvinces(await psgcApi.getProvinces(code)); } catch { toast.error("Couldn’t load provinces. Try selecting the region again."); }
  };
  const chooseProvince = async (code: string) => {
    setProvinceCode(code); setCityCode(""); setCities([]); setBarangays([]);
    setForm((old) => old ? { ...old, province: provinces.find((p) => p.code === code)?.name || "", city: "", barangay: "" } : old);
    if (code) try { setCities(await psgcApi.getMunicipalities(code)); } catch { toast.error("Couldn’t load cities. Try selecting the province again."); }
  };
  const chooseCity = async (code: string) => {
    setCityCode(code); setBarangays([]);
    setForm((old) => old ? { ...old, city: cities.find((c) => c.code === code)?.name || "", barangay: "" } : old);
    if (code) try { setBarangays(await psgcApi.getBarangays(code)); } catch { toast.error("Couldn’t load barangays. Try selecting the city again."); }
  };
  const cancel = () => { if (profile) setForm(fromProfile(profile)); setEditing(false); void load(); };
  const save = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); if (!profile || !form) return;
    const original = fromProfile(profile); const changes: UpdatePortalProfileData = {};
    for (const key of Object.keys(form) as (keyof Form)[]) if (form[key] !== original[key]) Object.assign(changes, { [key]: form[key] });
    if (!Object.keys(changes).length) { setEditing(false); return; }
    setSaving(true);
    try { const updated = await portalApi.updateProfile(changes); setProfile(updated); setForm(fromProfile(updated)); setEditing(false); setSaved(true); toast.success("Profile updated"); }
    catch (cause) { toast.error(cause instanceof Error ? cause.message : "Couldn’t save your profile."); }
    finally { setSaving(false); }
  };

  if (loading) return <div role="status" aria-label="Loading profile" className="space-y-6"><Skeleton className="h-12 w-64" /><Skeleton className="h-24 w-full" /><Skeleton className="h-80 w-full" /></div>;
  if (error || !profile || !form) return <><PortalHeading eyebrow="My account" title="My profile" /><PortalStatus kind="error" title="We couldn’t load your profile." action={<Button variant="outline" onClick={() => void load()}>Try again</Button>}>{error}</PortalStatus></>;

  const officeOptions = offices.map((o) => ({ value: String(o.id), label: `${o.abbreviation} · ${o.name}` }));
  const positionOptions = positions.map((p) => ({ value: String(p.id), label: p.title }));
  return <>
    <PortalHeading eyebrow="My account" title="My profile">Keep your contact and employment information up to date.</PortalHeading>
    <div className="lp-profile-identity"><span className="lp-avatar lp-avatar-large">{profile.initials}</span><div><h2>{profile.full_name}</h2><p>{profile.username} · Municipal employee</p></div><Badge variant="secondary">{profile.is_active ? "Active" : "Inactive"}</Badge></div>
    {saved && <PortalStatus kind="success" title="Profile changes saved." />}
    <form className="lp-profile-form" onSubmit={save}>
      <div className="lp-section-heading"><div><h2>Personal & employment details</h2><p>Name and username are maintained by your administrator.</p></div>{!editing && <Button type="button" variant="outline" onClick={() => { setSaved(false); setEditing(true); }}>Edit profile</Button>}</div>
      <div className="lp-form-grid">
        <Field id="profile-email" label="Email address" value={form.email} editing={editing}><Input id="profile-email" type="email" value={form.email} onChange={(e) => set("email", e.target.value)} /></Field>
        <Field id="profile-suffix" label="Suffix" value={form.suffix} editing={editing}><Input id="profile-suffix" value={form.suffix} onChange={(e) => set("suffix", e.target.value)} placeholder="Jr., Sr., III" /></Field>
        <Field id="profile-birthday" label="Date of birth" value={dateLabel(form.birthday)} editing={editing}><PortalDatePicker id="profile-birthday" label="Date of birth" value={form.birthday} max={format(new Date(), "yyyy-MM-dd")} onValueChange={(v) => set("birthday", v)} /></Field>
        <Field id="profile-civil" label="Civil status" value={civilOptions.find((o) => o.value === form.civil_status)?.label} editing={editing}><PortalSelect id="profile-civil" label="Civil status" value={form.civil_status} options={civilOptions} onValueChange={(v) => set("civil_status", v as Form["civil_status"])} /></Field>
        <Field id="profile-nationality" label="Nationality" value={form.nationality} editing={editing}><Input id="profile-nationality" value={form.nationality} onChange={(e) => set("nationality", e.target.value)} /></Field>
        <Field id="profile-office" label="Office" value={profile.office?.name} editing={editing}><PortalSelect id="profile-office" label="Office" searchable value={String(form.office_id || "")} options={officeOptions} placeholder={profile.office?.name || "Select office"} disabled={!offices.length} onValueChange={(v) => set("office_id", Number(v))} /></Field>
        <Field id="profile-position" label="Position" value={profile.position?.title} editing={editing}><PortalSelect id="profile-position" label="Position" searchable value={String(form.position_id || "")} options={positionOptions} placeholder={profile.position?.title || "Select position"} disabled={!positions.length} onValueChange={(v) => set("position_id", Number(v))} /></Field>
        <Field id="profile-employed" label="Employment start date" value={dateLabel(form.date_employed)} editing={editing}><PortalDatePicker id="profile-employed" label="Employment start date" value={form.date_employed} max={format(new Date(), "yyyy-MM-dd")} onValueChange={(v) => set("date_employed", v)} /></Field>
      </div>
      <div className="lp-section-heading lp-profile-subheading"><div><h2>Residential address</h2><p>Choose your location, then add your street details.</p></div></div>
      {editing && locationError && <PortalStatus kind="error" title="Address choices are unavailable.">Your saved address is still shown. Reload the page to try again.</PortalStatus>}
      <div className="lp-form-grid">
        <Field id="profile-region" label="Region" value={form.region} editing={editing}><PortalSelect id="profile-region" label="Region" searchable value={regionCode} options={placeOptions(regions)} placeholder={form.region || "Select region"} disabled={locationError} onValueChange={(v) => void chooseRegion(v)} /></Field>
        <Field id="profile-province" label="Province" value={form.province} editing={editing}><PortalSelect id="profile-province" label="Province" searchable value={provinceCode} options={placeOptions(provinces)} placeholder={form.province || "Select province"} disabled={!regionCode || locationError} onValueChange={(v) => void chooseProvince(v)} /></Field>
        <Field id="profile-city" label="City or municipality" value={form.city} editing={editing}><PortalSelect id="profile-city" label="City or municipality" searchable value={cityCode} options={placeOptions(cities)} placeholder={form.city || "Select city or municipality"} disabled={!provinceCode || locationError} onValueChange={(v) => void chooseCity(v)} /></Field>
        <Field id="profile-barangay" label="Barangay" value={form.barangay} editing={editing}><PortalSelect id="profile-barangay" label="Barangay" searchable value={barangays.find((b) => b.name === form.barangay)?.code || ""} options={placeOptions(barangays)} placeholder={form.barangay || "Select barangay"} disabled={!cityCode || locationError} onValueChange={(v) => set("barangay", barangays.find((b) => b.code === v)?.name || "")} /></Field>
        <Field id="profile-house" label="House number" value={form.house_number} editing={editing}><Input id="profile-house" value={form.house_number} onChange={(e) => set("house_number", e.target.value)} /></Field>
        <Field id="profile-block" label="Block number" value={form.block_number} editing={editing}><Input id="profile-block" value={form.block_number} onChange={(e) => set("block_number", e.target.value)} /></Field>
        <Field id="profile-building" label="Building or floor" value={form.building_floor} editing={editing}><Input id="profile-building" value={form.building_floor} onChange={(e) => set("building_floor", e.target.value)} /></Field>
        <Field id="profile-street" label="Street address" value={form.residence} editing={editing}><Textarea id="profile-street" value={form.residence} onChange={(e) => set("residence", e.target.value)} rows={2} /></Field>
      </div>
      {editing && <div className="lp-form-actions"><Button type="button" variant="outline" disabled={saving} onClick={cancel}>Cancel</Button><Button type="submit" disabled={saving}>{saving && <Loader2 className="size-4 animate-spin" />}Save changes</Button></div>}
    </form>
  </>;
}
