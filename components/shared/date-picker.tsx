"use client";

import { CalendarIcon, XIcon } from "lucide-react";
import { useState } from "react";
import { fr } from "react-day-picker/locale";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { isoToLocalDate, localDateToISO } from "@/lib/dates";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";

type DatePickerProps = {
  id?: string;
  /** Date au format AAAA-MM-JJ, ou `null`. */
  value: string | null;
  onChange: (value: string | null) => void;
  placeholder?: string;
  clearable?: boolean;
  disabled?: boolean;
  /** Bornes au format AAAA-MM-JJ. */
  min?: string;
  max?: string;
  invalid?: boolean;
  className?: string;
};

export function DatePicker({
  id,
  value,
  onChange,
  placeholder = "Choisir une date",
  clearable = false,
  disabled = false,
  min,
  max,
  invalid = false,
  className,
}: DatePickerProps) {
  const [open, setOpen] = useState(false);
  const selected = value ? isoToLocalDate(value) : undefined;

  return (
    <div className={cn("relative", className)}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            id={id}
            type="button"
            variant="outline"
            disabled={disabled}
            aria-invalid={invalid}
            className={cn(
              "w-full justify-start font-normal tabular-nums",
              !value && "text-muted-foreground",
              clearable && value && "pr-8",
            )}
          >
            <CalendarIcon data-icon="inline-start" />
            {value ? formatDate(value) : placeholder}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            locale={fr}
            captionLayout="dropdown"
            selected={selected}
            defaultMonth={selected}
            startMonth={min ? isoToLocalDate(min) : new Date(2015, 0)}
            endMonth={max ? isoToLocalDate(max) : new Date(new Date().getFullYear() + 5, 11)}
            disabled={[
              ...(min ? [{ before: isoToLocalDate(min) }] : []),
              ...(max ? [{ after: isoToLocalDate(max) }] : []),
            ]}
            onSelect={(date) => {
              if (!date) return;
              onChange(localDateToISO(date));
              setOpen(false);
            }}
          />
        </PopoverContent>
      </Popover>
      {clearable && value && !disabled ? (
        <button
          type="button"
          aria-label="Effacer la date"
          className="absolute top-1/2 right-2 -translate-y-1/2 rounded-sm text-muted-foreground hover:text-foreground"
          onClick={() => onChange(null)}
        >
          <XIcon className="size-3.5" />
        </button>
      ) : null}
    </div>
  );
}
