"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { ArrowLeft, Loader2, UserPlus, User, MapPin, Lock, Briefcase, Check, ChevronsUpDown, Info } from "lucide-react";
import { api } from "@/lib/api";
import { psgcApi, PSGCRegion, PSGCProvince, PSGCMunicipality, PSGCBarangay } from "@/lib/api/psgc";
import { CreateEmployeeData, Office, Position } from "@/types";
import { toast } from "sonner";

export default function NewEmployeePage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdAccount, setCreatedAccount] = useState<{ uuid: string; username: string; initialPassword: string } | null>(null);
  const [regions, setRegions] = useState<PSGCRegion[]>([]);
  const [provinces, setProvinces] = useState<PSGCProvince[]>([]);
  const [municipalities, setMunicipalities] = useState<PSGCMunicipality[]>([]);
  const [barangays, setBarangays] = useState<PSGCBarangay[]>([]);
  const [offices, setOffices] = useState<Office[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);
  const [positionOpen, setPositionOpen] = useState(false);

  const [formData, setFormData] = useState<CreateEmployeeData>({
    first_name: "",
    middle_name: "",
    last_name: "",
    suffix: "",
    email: "",
    birthday: "",
    civil_status: "single",
    nationality: "Filipino",
    region: "",
    province: "",
    city: "",
    barangay: "",
    house_number: "",
    block_number: "",
    building_floor: "",
    residence: "",
    office_id: undefined,
    position_id: undefined,
    date_employed: "",
  });

  // Track selected codes for cascading dropdowns
  const [selectedRegionCode, setSelectedRegionCode] = useState("");
  const [selectedProvinceCode, setSelectedProvinceCode] = useState("");
  const [selectedCityCode, setSelectedCityCode] = useState("");

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Combobox open states
  const [regionOpen, setRegionOpen] = useState(false);
  const [provinceOpen, setProvinceOpen] = useState(false);
  const [municipalityOpen, setMunicipalityOpen] = useState(false);
  const [barangayOpen, setBarangayOpen] = useState(false);
  const [officeOpen, setOfficeOpen] = useState(false);

  useEffect(() => {
    async function loadData() {
      try {
        const regionsData = await psgcApi.getRegions();
        setRegions(regionsData);
      } catch (error) {
        console.error("Failed to load regions:", error);
        toast.error("Failed to load regions");
      }

      // Offices API is optional - may not exist in backend yet
      try {
        const officesRes = await api.offices.list();
        setOffices(officesRes.data);
      } catch {
        // Offices endpoint not available, continue without it
      }

      try {
        const positionsRes = await api.positions.list();
        setPositions(positionsRes.data);
      } catch {
        // Positions endpoint not available
      }
    }
    loadData();
  }, []);

  const handleRegionChange = async (code: string, name: string) => {
    setSelectedRegionCode(code);
    setSelectedProvinceCode("");
    setSelectedCityCode("");
    setFormData({ ...formData, region: name, province: "", city: "", barangay: "" });
    setProvinces([]);
    setMunicipalities([]);
    setBarangays([]);

    if (code) {
      try {
        const data = await psgcApi.getProvinces(code);
        setProvinces(data);
      } catch (error) {
        console.error("Failed to load provinces:", error);
      }
    }
  };

  const handleProvinceChange = async (code: string, name: string) => {
    setSelectedProvinceCode(code);
    setSelectedCityCode("");
    setFormData({ ...formData, province: name, city: "", barangay: "" });
    setMunicipalities([]);
    setBarangays([]);

    if (code) {
      try {
        const data = await psgcApi.getMunicipalities(code);
        setMunicipalities(data);
      } catch (error) {
        console.error("Failed to load municipalities:", error);
      }
    }
  };

  const handleMunicipalityChange = async (code: string, name: string) => {
    setSelectedCityCode(code);
    setFormData({ ...formData, city: name, barangay: "" });
    setBarangays([]);

    if (code) {
      try {
        const data = await psgcApi.getBarangays(code);
        setBarangays(data);
      } catch (error) {
        console.error("Failed to load barangays:", error);
      }
    }
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.first_name || formData.first_name.length < 2) {
      newErrors.first_name = "First name must be at least 2 characters";
    }
    if (!formData.last_name || formData.last_name.length < 2) {
      newErrors.last_name = "Last name must be at least 2 characters";
    }
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = "Please enter a valid email address";
    }
    if (!formData.birthday) {
      newErrors.birthday = "Birthday is required";
    }
    if (!formData.residence) {
      newErrors.residence = "Street address is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) {
      toast.error("Please fix the errors in the form");
      return;
    }

    setIsSubmitting(true);
    try {
      // Convert empty strings to null for optional fields
      const sanitizedData = {
        ...formData,
        region: formData.region || null,
        province: formData.province || null,
        city: formData.city || null,
        barangay: formData.barangay || null,
        middle_name: formData.middle_name || null,
        suffix: formData.suffix || null,
        house_number: formData.house_number || null,
        block_number: formData.block_number || null,
        building_floor: formData.building_floor || null,
        office_id: formData.office_id || null,
        position_id: formData.position_id || null,
        date_employed: formData.date_employed || null,
        email: formData.email || undefined,
      };
      const response = await api.employees.create(sanitizedData as CreateEmployeeData);
      toast.success("Employee created successfully");
      if ("initial_password" in response && typeof response.initial_password === "string") {
        setCreatedAccount({ uuid: response.data.uuid, username: response.data.username, initialPassword: response.initial_password });
      } else {
        router.push(`/employees/${response.data.uuid}`);
      }
    } catch (error) {
      if (error instanceof Error) {
        toast.error(error.message);
      } else {
        toast.error("Failed to create employee");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <Dialog open={createdAccount !== null} onOpenChange={(open) => {
        if (!open && createdAccount) router.push(`/employees/${createdAccount.uuid}`);
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Employee account created</DialogTitle>
            <DialogDescription>Copy these one-time credentials now. The password will not be shown again.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 break-all">
            <p>Username: <strong>{createdAccount?.username}</strong></p>
            <p>Temporary password: <strong>{createdAccount?.initialPassword}</strong></p>
          </div>
          <DialogFooter>
            <Button onClick={() => createdAccount && router.push(`/employees/${createdAccount.uuid}`)}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/employees">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Add New Employee</h1>
          <p className="text-muted-foreground">Create a new employee account</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Personal Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Personal Information
            </CardTitle>
            <CardDescription>Basic employee details</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-6 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="first_name">
                First Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="first_name"
                value={formData.first_name}
                onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                className={errors.first_name ? "border-destructive" : ""}
              />
              {errors.first_name && (
                <p className="text-xs text-destructive">{errors.first_name}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="middle_name">Middle Name</Label>
              <Input
                id="middle_name"
                value={formData.middle_name}
                onChange={(e) => setFormData({ ...formData, middle_name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="last_name">
                Last Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="last_name"
                value={formData.last_name}
                onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                className={errors.last_name ? "border-destructive" : ""}
              />
              {errors.last_name && (
                <p className="text-xs text-destructive">{errors.last_name}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="suffix">Suffix</Label>
              <Input
                id="suffix"
                value={formData.suffix}
                onChange={(e) => setFormData({ ...formData, suffix: e.target.value })}
                placeholder="Jr., Sr., III, etc."
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="birthday">
                Birthday <span className="text-destructive">*</span>
              </Label>
              <Input
                id="birthday"
                type="date"
                value={formData.birthday}
                onChange={(e) => setFormData({ ...formData, birthday: e.target.value })}
                className={errors.birthday ? "border-destructive" : ""}
              />
              {errors.birthday && (
                <p className="text-xs text-destructive">{errors.birthday}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="civil_status">
                Civil Status <span className="text-destructive">*</span>
              </Label>
              <Select
                value={formData.civil_status}
                onValueChange={(value) =>
                  setFormData({ ...formData, civil_status: value as CreateEmployeeData["civil_status"] })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="single">Single</SelectItem>
                  <SelectItem value="married">Married</SelectItem>
                  <SelectItem value="widowed">Widowed</SelectItem>
                  <SelectItem value="separated">Separated</SelectItem>
                  <SelectItem value="divorced">Divorced</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="nationality">
                Nationality <span className="text-destructive">*</span>
              </Label>
              <Input
                id="nationality"
                value={formData.nationality}
                onChange={(e) => setFormData({ ...formData, nationality: e.target.value })}
              />
            </div>
          </CardContent>
        </Card>

        {/* Account Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5" />
              Account Credentials
            </CardTitle>
            <CardDescription>Login credentials for the employee</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-6 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="email">
                Email Address <span className="text-muted-foreground text-xs">(optional)</span>
              </Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className={errors.email ? "border-destructive" : ""}
                placeholder="employee@lgu.gov.ph"
              />
              {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
            </div>
            <div className="flex items-end">
              <div className="bg-muted/50 border rounded-lg p-3 flex items-start gap-2 w-full">
                <Info className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                <p className="text-sm text-muted-foreground">
                  Username and default password will be auto-generated from the employee&apos;s name.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Employment Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Briefcase className="h-5 w-5" />
              Employment Information
            </CardTitle>
            <CardDescription>Office assignment and position details</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-6 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Office</Label>
              <Popover open={officeOpen} onOpenChange={setOfficeOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={officeOpen}
                    className="w-full justify-between font-normal"
                  >
                    {formData.office_id
                      ? (() => { const o = offices.find((o) => o.id === formData.office_id); return o ? `${o.abbreviation} - ${o.name}` : "Select office"; })()
                      : "Select office"}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                  <Command filter={(value, search) => value.toLowerCase().includes(search.toLowerCase()) ? 1 : 0}>
                    <CommandInput placeholder="Search office..." />
                    <CommandList>
                      <CommandEmpty>No office found.</CommandEmpty>
                      <CommandGroup>
                        {offices.map((o) => (
                          <CommandItem
                            key={o.id}
                            value={`${o.abbreviation} - ${o.name}`}
                            onSelect={() => {
                              setFormData({ ...formData, office_id: o.id });
                              setOfficeOpen(false);
                            }}
                          >
                            <Check
                              className={`mr-2 h-4 w-4 ${
                                formData.office_id === o.id ? "opacity-100" : "opacity-0"
                              }`}
                            />
                            {o.abbreviation} - {o.name}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-2">
              <Label>Position</Label>
              <Popover open={positionOpen} onOpenChange={setPositionOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={positionOpen}
                    className="w-full justify-between font-normal"
                  >
                    {formData.position_id
                      ? positions.find((p) => p.id === formData.position_id)?.title
                      : "Select position"}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Search position..." />
                    <CommandList>
                      <CommandEmpty>No position found.</CommandEmpty>
                      <CommandGroup>
                        {positions.map((p) => (
                          <CommandItem
                            key={p.id}
                            value={p.title}
                            onSelect={() => {
                              setFormData({ ...formData, position_id: p.id });
                              setPositionOpen(false);
                            }}
                          >
                            <Check
                              className={`mr-2 h-4 w-4 ${
                                formData.position_id === p.id ? "opacity-100" : "opacity-0"
                              }`}
                            />
                            {p.title}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-2">
              <Label htmlFor="date_employed">Date Employed</Label>
              <Input
                id="date_employed"
                type="date"
                value={formData.date_employed || ""}
                onChange={(e) => setFormData({ ...formData, date_employed: e.target.value })}
              />
            </div>
          </CardContent>
        </Card>

        {/* Address */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              Address
            </CardTitle>
            <CardDescription>Employee&apos;s residential address</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-6 md:grid-cols-2">
            {/* Region */}
            <div className="space-y-2">
              <Label>Region</Label>
              <Popover open={regionOpen} onOpenChange={setRegionOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={regionOpen}
                    className="w-full justify-between font-normal"
                  >
                    {formData.region || "Select region"}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Search region..." />
                    <CommandList>
                      <CommandEmpty>No region found.</CommandEmpty>
                      <CommandGroup>
                        {regions.map((r) => (
                          <CommandItem
                            key={r.code}
                            value={r.name}
                            onSelect={() => {
                              handleRegionChange(r.code, r.name);
                              setRegionOpen(false);
                            }}
                          >
                            <Check
                              className={`mr-2 h-4 w-4 ${
                                selectedRegionCode === r.code ? "opacity-100" : "opacity-0"
                              }`}
                            />
                            {r.name}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>

            {/* Province */}
            <div className="space-y-2">
              <Label>Province</Label>
              <Popover open={provinceOpen} onOpenChange={setProvinceOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={provinceOpen}
                    className="w-full justify-between font-normal"
                    disabled={!selectedRegionCode}
                  >
                    {formData.province || "Select province"}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Search province..." />
                    <CommandList>
                      <CommandEmpty>No province found.</CommandEmpty>
                      <CommandGroup>
                        {provinces.map((p) => (
                          <CommandItem
                            key={p.code}
                            value={p.name}
                            onSelect={() => {
                              handleProvinceChange(p.code, p.name);
                              setProvinceOpen(false);
                            }}
                          >
                            <Check
                              className={`mr-2 h-4 w-4 ${
                                selectedProvinceCode === p.code ? "opacity-100" : "opacity-0"
                              }`}
                            />
                            {p.name}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>

            {/* Municipality */}
            <div className="space-y-2">
              <Label>City/Municipality</Label>
              <Popover open={municipalityOpen} onOpenChange={setMunicipalityOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={municipalityOpen}
                    className="w-full justify-between font-normal"
                    disabled={!selectedProvinceCode}
                  >
                    {formData.city || "Select city/municipality"}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Search city/municipality..." />
                    <CommandList>
                      <CommandEmpty>No city/municipality found.</CommandEmpty>
                      <CommandGroup>
                        {municipalities.map((m) => (
                          <CommandItem
                            key={m.code}
                            value={m.name}
                            onSelect={() => {
                              handleMunicipalityChange(m.code, m.name);
                              setMunicipalityOpen(false);
                            }}
                          >
                            <Check
                              className={`mr-2 h-4 w-4 ${
                                selectedCityCode === m.code ? "opacity-100" : "opacity-0"
                              }`}
                            />
                            {m.name}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>

            {/* Barangay */}
            <div className="space-y-2">
              <Label>Barangay</Label>
              <Popover open={barangayOpen} onOpenChange={setBarangayOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={barangayOpen}
                    className="w-full justify-between font-normal"
                    disabled={!selectedCityCode}
                  >
                    {formData.barangay || "Select barangay"}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Search barangay..." />
                    <CommandList>
                      <CommandEmpty>No barangay found.</CommandEmpty>
                      <CommandGroup>
                        {barangays.map((b) => (
                          <CommandItem
                            key={b.code}
                            value={b.name}
                            onSelect={() => {
                              setFormData({ ...formData, barangay: b.name });
                              setBarangayOpen(false);
                            }}
                          >
                            <Check
                              className={`mr-2 h-4 w-4 ${
                                formData.barangay === b.name ? "opacity-100" : "opacity-0"
                              }`}
                            />
                            {b.name}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>

            {/* House Number */}
            <div className="space-y-2">
              <Label htmlFor="house_number">House Number</Label>
              <Input
                id="house_number"
                value={formData.house_number || ""}
                onChange={(e) => setFormData({ ...formData, house_number: e.target.value })}
                placeholder="e.g., 123"
              />
            </div>

            {/* Block Number */}
            <div className="space-y-2">
              <Label htmlFor="block_number">Block Number</Label>
              <Input
                id="block_number"
                value={formData.block_number || ""}
                onChange={(e) => setFormData({ ...formData, block_number: e.target.value })}
                placeholder="e.g., Block 5"
              />
            </div>

            {/* Building/Floor */}
            <div className="space-y-2">
              <Label htmlFor="building_floor">Building/Floor</Label>
              <Input
                id="building_floor"
                value={formData.building_floor || ""}
                onChange={(e) => setFormData({ ...formData, building_floor: e.target.value })}
                placeholder="e.g., 3rd Floor, Unit 201"
              />
            </div>

            {/* Street Address */}
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="residence">
                Street Address <span className="text-destructive">*</span>
              </Label>
              <Textarea
                id="residence"
                value={formData.residence}
                onChange={(e) => setFormData({ ...formData, residence: e.target.value })}
                className={errors.residence ? "border-destructive" : ""}
                rows={2}
                placeholder="Street name, subdivision, etc."
              />
              {errors.residence && <p className="text-xs text-destructive">{errors.residence}</p>}
            </div>
          </CardContent>
        </Card>

        {/* Submit */}
        <div className="flex justify-end gap-3">
          <Button type="button" variant="outline" asChild>
            <Link href="/employees">Cancel</Link>
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <UserPlus className="mr-2 h-4 w-4" />
                Create Employee
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
