"use client";

import { useState } from "react";
import { format, isValid, parseISO } from "date-fns";
import { CalendarIcon, Check, ChevronsUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

export type PortalOption = { value: string; label: string; disabled?: boolean };

export function PortalSelect({ id, label, value, onValueChange, options, placeholder = "Select an option", disabled, searchable = false }: {
  id?: string;
  label: string;
  value: string;
  onValueChange: (value: string) => void;
  options: PortalOption[];
  placeholder?: string;
  disabled?: boolean;
  searchable?: boolean;
}) {
  const [open, setOpen] = useState(false);
  if (searchable || options.length > 8) {
    return (
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button id={id} type="button" variant="outline" role="combobox" aria-label={label} aria-expanded={open} disabled={disabled} className="min-h-11 w-full justify-between text-left font-normal">
            <span className="truncate">{options.find((option) => option.value === value)?.label || placeholder}</span>
            <ChevronsUpDown className="ml-2 size-4 shrink-0 opacity-50" aria-hidden="true" />
          </Button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-[var(--radix-popover-trigger-width)] max-h-[var(--radix-popover-content-available-height)] p-0">
          <Command>
            <CommandInput placeholder={`Search ${label.toLowerCase()}...`} aria-label={`Search ${label.toLowerCase()}`} />
            <CommandList>
              <CommandEmpty>No matches found.</CommandEmpty>
              <CommandGroup>
                {options.map((option) => (
                  <CommandItem key={option.value} value={`${option.label} ${option.value}`} disabled={option.disabled} onSelect={() => { onValueChange(option.value); setOpen(false); }}>
                    <Check className={cn("mr-2 size-4", value === option.value ? "opacity-100" : "opacity-0")} aria-hidden="true" />
                    {option.label}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    );
  }
  return (
    <Select value={value || undefined} onValueChange={onValueChange} disabled={disabled}>
      <SelectTrigger id={id} aria-label={label} className="min-h-11 w-full"><SelectValue placeholder={placeholder} /></SelectTrigger>
      <SelectContent>{options.map((option) => <SelectItem key={option.value} value={option.value} disabled={option.disabled}>{option.label}</SelectItem>)}</SelectContent>
    </Select>
  );
}

function parseDate(value?: string) {
  const date = value ? parseISO(value) : undefined;
  return date && isValid(date) ? date : undefined;
}

export function PortalDatePicker({ id, label, value, onValueChange, disabled, min, max }: {
  id?: string;
  label: string;
  value: string;
  onValueChange: (value: string) => void;
  disabled?: boolean;
  min?: string;
  max?: string;
}) {
  const selected = parseDate(value);
  const minDate = parseDate(min);
  const maxDate = parseDate(max);
  const startYear = minDate?.getFullYear() ?? 1900;
  const endYear = maxDate?.getFullYear() ?? new Date().getFullYear() + 20;
  const [open, setOpen] = useState(false);
  const [month, setMonth] = useState(selected ?? new Date());
  const change = (date: Date | undefined) => {
    onValueChange(date ? format(date, "yyyy-MM-dd") : "");
    setOpen(false);
  };
  return (
    <Popover open={open} onOpenChange={(next) => {
      if (next) {
        let visible = selected ?? new Date();
        if (minDate && visible < minDate) visible = minDate;
        if (maxDate && visible > maxDate) visible = maxDate;
        setMonth(visible);
      }
      setOpen(next);
    }}>
      <PopoverTrigger asChild>
        <Button id={id} type="button" variant="outline" disabled={disabled} aria-label={`${label}: ${selected ? format(selected, "PPP") : "Choose date"}`} className="min-h-11 w-full justify-between text-left font-normal">
          <span>{selected ? format(selected, "PPP") : "Choose date"}</span>
          <CalendarIcon className="size-4 text-muted-foreground" aria-hidden="true" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" aria-label={`${label} calendar`} className="w-[320px] max-w-[calc(100vw-2rem)] max-h-[var(--radix-popover-content-available-height)] overflow-y-auto p-0">
        <div className="grid grid-cols-2 gap-2 px-3 pt-3">
          <PortalSelect label={`${label} month`} value={String(month.getMonth())} options={Array.from({ length: 12 }, (_, i) => ({ value: String(i), label: format(new Date(2026, i, 1), "MMMM") }))} onValueChange={(next) => setMonth(new Date(month.getFullYear(), Number(next), 1))} />
          <PortalSelect label={`${label} year`} searchable value={String(month.getFullYear())} options={Array.from({ length: Math.max(0, endYear - startYear + 1) }, (_, i) => ({ value: String(startYear + i), label: String(startYear + i) }))} onValueChange={(next) => setMonth(new Date(Number(next), month.getMonth(), 1))} />
        </div>
        <Calendar className="w-full [--cell-size:2.5rem]" classNames={{ root: "w-full" }} mode="single" month={month} onMonthChange={setMonth} selected={selected} onSelect={change} disabled={[...(minDate ? [{ before: minDate }] : []), ...(maxDate ? [{ after: maxDate }] : [])]} startMonth={new Date(startYear, 0)} endMonth={new Date(endYear, 11)} autoFocus />
        <div className="flex justify-end border-t p-2"><Button type="button" variant="ghost" size="sm" disabled={!selected} onClick={() => change(undefined)}>Clear date</Button></div>
      </PopoverContent>
    </Popover>
  );
}
