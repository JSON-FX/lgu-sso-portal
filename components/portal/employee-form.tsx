"use client";

import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { format } from "date-fns";
import { Loader2 } from "lucide-react";
import { PortalStatus } from "@/components/portal/design";
import { PortalDatePicker, PortalSelect } from "@/components/portal/selection";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { api, ApiError } from "@/lib/api";
import { psgcApi, type PSGCBarangay, type PSGCMunicipality, type PSGCProvince, type PSGCRegion } from "@/lib/api/psgc";
import type { CreateEmployeeData, Employee, Office, Position } from "@/types";

export type EmployeeFormValues = CreateEmployeeData & { is_active?: boolean };
const emptyForm: EmployeeFormValues = {
  first_name: "", middle_name: "", last_name: "", suffix: "", birthday: "", civil_status: "single",
  nationality: "Filipino", email: "", office_id: undefined, position_id: undefined,
  date_employed: "", date_terminated: "", region: "", province: "", city: "", barangay: "",
  house_number: "", block_number: "", building_floor: "", residence: "",
};
const fromEmployee = (p: Employee): EmployeeFormValues => ({
  first_name: p.first_name, middle_name: p.middle_name || "", last_name: p.last_name, suffix: p.suffix || "",
  birthday: p.birthday || "", civil_status: p.civil_status || "single", nationality: p.nationality || "",
  email: p.email || "", office_id: p.office?.id, position_id: p.position?.id,
  date_employed: p.date_employed || "", date_terminated: p.date_terminated || "",
  region: p.region || "", province: p.province || "", city: p.city || "", barangay: p.barangay || "",
  house_number: p.house_number || "", block_number: p.block_number || "", building_floor: p.building_floor || "",
  residence: p.residence || "", is_active: p.is_active,
});
const civilOptions = ["single", "married", "widowed", "separated", "divorced"].map((value) => ({ value, label: value[0].toUpperCase() + value.slice(1) }));
const placeOptions = (places: { code: string; name: string }[]) => places.map(({ code, name }) => ({ value: code, label: name }));

function Section({ title, description, children }: { title: string; description: string; children: ReactNode }) {
  return <section className="lp-admin-section"><div className="lp-admin-section-heading"><h2>{title}</h2><p>{description}</p></div><div className="lp-admin-fields">{children}</div></section>;
}
function Field({ id, label, error, children }: { id: string; label: string; error?: string; children: ReactNode }) {
  return <div className="lp-admin-field"><Label htmlFor={id}>{label}</Label>{children}{error && <p className="lp-admin-error" role="alert">{error}</p>}</div>;
}
function TextField({ id, label, value, onChange, error, required, type = "text", maxLength }: {
  id: string; label: string; value: string; onChange: (value: string) => void; error?: string; required?: boolean; type?: string; maxLength?: number;
}) {
  return <Field id={id} label={label} error={error}><Input id={id} type={type} value={value} onChange={(event) => onChange(event.target.value)} required={required} maxLength={maxLength} aria-invalid={!!error} /></Field>;
}

export function EmployeeForm({ initial, onSave, onCancel, submitLabel }: {
  initial?: Employee;
  onSave: (values: EmployeeFormValues) => Promise<void>;
  onCancel: () => void;
  submitLabel: string;
}) {
  const [form, setForm] = useState<EmployeeFormValues>(() => initial ? fromEmployee(initial) : emptyForm);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState("");
  const [saving, setSaving] = useState(false);
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
  const set = <K extends keyof EmployeeFormValues>(key: K, value: EmployeeFormValues[K]) => setForm((old) => ({ ...old, [key]: value }));
  const text = (key: keyof EmployeeFormValues) => String(form[key] ?? "");

  useEffect(() => {
    let active = true;
    const load = async () => {
      const [officeResult, positionResult, regionResult] = await Promise.allSettled([api.offices.list(), api.positions.list(), psgcApi.getRegions()]);
      if (!active) return;
      if (officeResult.status === "fulfilled") setOffices(officeResult.value.data);
      if (positionResult.status === "fulfilled") setPositions(positionResult.value.data);
      if (regionResult.status !== "fulfilled") { setLocationError(true); return; }
      setRegions(regionResult.value);
      const region = regionResult.value.find((item) => item.name === initial?.region);
      if (!region) return;
      try {
        setRegionCode(region.code);
        const provinceList = await psgcApi.getProvinces(region.code); if (!active) return; setProvinces(provinceList);
        const province = provinceList.find((item) => item.name === initial?.province); if (!province) return;
        setProvinceCode(province.code);
        const cityList = await psgcApi.getMunicipalities(province.code); if (!active) return; setCities(cityList);
        const city = cityList.find((item) => item.name === initial?.city); if (!city) return;
        setCityCode(city.code); const barangayList = await psgcApi.getBarangays(city.code); if (active) setBarangays(barangayList);
      } catch { if (active) setLocationError(true); }
    };
    void load();
    return () => { active = false; };
  }, [initial]);

  const chooseRegion = async (code: string) => {
    setRegionCode(code); setProvinceCode(""); setCityCode(""); setProvinces([]); setCities([]); setBarangays([]);
    setForm((old) => ({ ...old, region: regions.find((item) => item.code === code)?.name || "", province: "", city: "", barangay: "" }));
    try { if (code) setProvinces(await psgcApi.getProvinces(code)); } catch { setLocationError(true); }
  };
  const chooseProvince = async (code: string) => {
    setProvinceCode(code); setCityCode(""); setCities([]); setBarangays([]);
    setForm((old) => ({ ...old, province: provinces.find((item) => item.code === code)?.name || "", city: "", barangay: "" }));
    try { if (code) setCities(await psgcApi.getMunicipalities(code)); } catch { setLocationError(true); }
  };
  const chooseCity = async (code: string) => {
    setCityCode(code); setBarangays([]);
    setForm((old) => ({ ...old, city: cities.find((item) => item.code === code)?.name || "", barangay: "" }));
    try { if (code) setBarangays(await psgcApi.getBarangays(code)); } catch { setLocationError(true); }
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); setSubmitError("");
    const problems: Record<string, string> = {};
    if (form.first_name.trim().length < 2) problems.first_name = "Enter at least 2 characters.";
    if (form.last_name.trim().length < 2) problems.last_name = "Enter at least 2 characters.";
    if (!form.birthday || form.birthday >= format(new Date(), "yyyy-MM-dd")) problems.birthday = "Choose a past date.";
    if (!form.nationality?.trim()) problems.nationality = "Nationality is required.";
    if (!form.residence.trim()) problems.residence = "Street address is required.";
    if (form.date_terminated && form.date_employed && form.date_terminated < form.date_employed) problems.date_terminated = "Termination date must follow the start date.";
    setErrors(problems); if (Object.keys(problems).length) return;
    const values = { ...form, first_name: form.first_name.trim(), last_name: form.last_name.trim(), residence: form.residence.trim(), email: form.email || undefined, middle_name: form.middle_name || undefined, suffix: form.suffix || undefined, date_employed: form.date_employed || undefined, date_terminated: form.date_terminated || undefined };
    setSaving(true);
    try { await onSave(values); }
    catch (cause) {
      if (cause instanceof ApiError && cause.errors) setErrors(Object.fromEntries(Object.entries(cause.errors).map(([key, messages]) => [key, messages[0] || "Invalid value."])));
      setSubmitError(cause instanceof Error ? cause.message : "We couldn’t save this employee. Try again.");
    } finally { setSaving(false); }
  };

  return <form className="lp-admin-form" onSubmit={submit}>
    <Section title="Personal information" description="Use the employee’s name as it appears in official records.">
      <TextField id="first_name" label="First name" value={form.first_name} onChange={(value) => set("first_name", value)} error={errors.first_name} required maxLength={255} />
      <TextField id="middle_name" label="Middle name" value={text("middle_name")} onChange={(value) => set("middle_name", value)} maxLength={255} />
      <TextField id="last_name" label="Last name" value={form.last_name} onChange={(value) => set("last_name", value)} error={errors.last_name} required maxLength={255} />
      <TextField id="suffix" label="Suffix" value={text("suffix")} onChange={(value) => set("suffix", value)} maxLength={50} />
      <Field id="birthday" label="Date of birth" error={errors.birthday}><PortalDatePicker id="birthday" label="Date of birth" value={form.birthday} max={format(new Date(), "yyyy-MM-dd")} onValueChange={(value) => set("birthday", value)} /></Field>
      <Field id="civil_status" label="Civil status" error={errors.civil_status}><PortalSelect id="civil_status" label="Civil status" value={form.civil_status} options={civilOptions} onValueChange={(value) => set("civil_status", value as EmployeeFormValues["civil_status"])} /></Field>
      <TextField id="nationality" label="Nationality" value={form.nationality} onChange={(value) => set("nationality", value)} error={errors.nationality} required maxLength={100} />
    </Section>
    <Section title="Account" description="Employees complete password setup before accessing an application.">
      <TextField id="email" label="Email address (optional)" type="email" value={text("email")} onChange={(value) => set("email", value)} error={errors.email} maxLength={255} />
      {initial ? <div className="lp-admin-field"><Label>Username</Label><p>{initial.username}</p></div> : <div className="lp-admin-field"><Label>Username and temporary password</Label><p className="lp-admin-hint">Generated after you save the employee. The temporary password is shown once.</p></div>}
      {initial && <Field id="is_active" label="Account status"><PortalSelect id="is_active" label="Account status" value={form.is_active ? "active" : "inactive"} options={[{ value: "active", label: "Active" }, { value: "inactive", label: "Inactive" }]} onValueChange={(value) => set("is_active", value === "active")} /></Field>}
    </Section>
    <Section title="Employment" description="Keep office assignment and service dates current.">
      <Field id="office_id" label="Office" error={errors.office_id}><PortalSelect id="office_id" label="Office" searchable value={String(form.office_id || "")} options={offices.map((office) => ({ value: String(office.id), label: `${office.abbreviation} · ${office.name}` }))} placeholder={initial?.office?.name || "Select office"} disabled={!offices.length} onValueChange={(value) => set("office_id", Number(value))} /></Field>
      <Field id="position_id" label="Position" error={errors.position_id}><PortalSelect id="position_id" label="Position" searchable value={String(form.position_id || "")} options={positions.map((position) => ({ value: String(position.id), label: position.title }))} placeholder={initial?.position?.title || "Select position"} disabled={!positions.length} onValueChange={(value) => set("position_id", Number(value))} /></Field>
      <Field id="date_employed" label="Employment start date" error={errors.date_employed}><PortalDatePicker id="date_employed" label="Employment start date" value={text("date_employed")} onValueChange={(value) => set("date_employed", value)} /></Field>
      {initial && <Field id="date_terminated" label="Termination date" error={errors.date_terminated}><PortalDatePicker id="date_terminated" label="Termination date" value={text("date_terminated")} min={text("date_employed") || undefined} onValueChange={(value) => set("date_terminated", value)} /></Field>}
    </Section>
    <Section title="Residential address" description="Choose the employee’s location, then enter street details.">
      {locationError && <div className="lp-admin-field lp-admin-span"><PortalStatus kind="error" title="Address choices are unavailable.">You can still save the other details. Reload to try again.</PortalStatus></div>}
      <Field id="region" label="Region" error={errors.region}><PortalSelect id="region" label="Region" searchable value={regionCode} options={placeOptions(regions)} placeholder={text("region") || "Select region"} disabled={locationError} onValueChange={(value) => void chooseRegion(value)} /></Field>
      <Field id="province" label="Province" error={errors.province}><PortalSelect id="province" label="Province" searchable value={provinceCode} options={placeOptions(provinces)} placeholder={text("province") || "Select province"} disabled={!regionCode || locationError} onValueChange={(value) => void chooseProvince(value)} /></Field>
      <Field id="city" label="City or municipality" error={errors.city}><PortalSelect id="city" label="City or municipality" searchable value={cityCode} options={placeOptions(cities)} placeholder={text("city") || "Select city or municipality"} disabled={!provinceCode || locationError} onValueChange={(value) => void chooseCity(value)} /></Field>
      <Field id="barangay" label="Barangay" error={errors.barangay}><PortalSelect id="barangay" label="Barangay" searchable value={barangays.find((item) => item.name === form.barangay)?.code || ""} options={placeOptions(barangays)} placeholder={text("barangay") || "Select barangay"} disabled={!cityCode || locationError} onValueChange={(value) => set("barangay", barangays.find((item) => item.code === value)?.name || "")} /></Field>
      <TextField id="house_number" label="House or lot number" value={text("house_number")} onChange={(value) => set("house_number", value)} error={errors.house_number} maxLength={50} />
      <TextField id="block_number" label="Block" value={text("block_number")} onChange={(value) => set("block_number", value)} error={errors.block_number} maxLength={50} />
      <TextField id="building_floor" label="Building or floor" value={text("building_floor")} onChange={(value) => set("building_floor", value)} error={errors.building_floor} maxLength={50} />
      <Field id="residence" label="Street address" error={errors.residence}><Textarea id="residence" value={form.residence} onChange={(event) => set("residence", event.target.value)} required maxLength={500} aria-invalid={!!errors.residence} rows={2} /></Field>
    </Section>
    {submitError && <PortalStatus kind="error" title="Employee could not be saved.">{submitError}</PortalStatus>}
    <div className="lp-admin-form-actions"><Button type="button" variant="outline" onClick={onCancel} disabled={saving}>Cancel</Button><Button type="submit" disabled={saving}>{saving && <Loader2 className="size-4 animate-spin" />}{submitLabel}</Button></div>
  </form>;
}
