"use client";

import { useState, type ComponentProps } from "react";

import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import {
  centsToInput,
  milliToInput,
  parseMoneyInput,
  parseQuantityInput,
} from "@/lib/money";

type DecimalInputProps = Omit<ComponentProps<typeof InputGroupInput>, "value" | "onChange"> & {
  value: number | null;
  onChange: (value: number | null) => void;
  parse: (raw: string) => number | null;
  format: (value: number) => string;
  suffix?: string;
  allowNegative?: boolean;
};

/**
 * Champ numérique à virgule, dont la valeur est un entier (centimes, millièmes…).
 * Le texte saisi est conservé tel quel pendant la frappe et reformaté à la sortie du champ.
 */
function DecimalInput({
  value,
  onChange,
  parse,
  format,
  suffix,
  allowNegative = false,
  onBlur,
  className,
  ...props
}: DecimalInputProps) {
  const [text, setText] = useState(() => (value === null ? "" : format(value)));
  const [syncedValue, setSyncedValue] = useState(value);

  // La valeur a changé de l'extérieur (reset du formulaire, ligne pré-remplie…).
  if (value !== syncedValue) {
    setSyncedValue(value);
    if (parse(text) !== value) setText(value === null ? "" : format(value));
  }

  return (
    <InputGroup className={className}>
      <InputGroupInput
        {...props}
        inputMode="decimal"
        autoComplete="off"
        className="text-right tabular-nums"
        value={text}
        onChange={(event) => {
          const raw = event.target.value;
          if (!allowNegative && raw.includes("-")) return;
          setText(raw);
          const parsed = raw.trim() === "" ? null : parse(raw);
          setSyncedValue(parsed);
          onChange(parsed);
        }}
        onBlur={(event) => {
          setText(value === null ? "" : format(value));
          onBlur?.(event);
        }}
      />
      {suffix ? <InputGroupAddon align="inline-end">{suffix}</InputGroupAddon> : null}
    </InputGroup>
  );
}

type FieldProps = Omit<DecimalInputProps, "parse" | "format">;

/** Montant en euros ; la valeur est en centimes. */
export function MoneyInput({ suffix = "€", ...props }: FieldProps) {
  return <DecimalInput {...props} suffix={suffix} parse={parseMoneyInput} format={centsToInput} />;
}

/** Quantité décimale ; la valeur est en millièmes (1,5 → 1500). */
export function QuantityInput(props: FieldProps) {
  return <DecimalInput {...props} parse={parseQuantityInput} format={milliToInput} />;
}

function parsePercent(raw: string): number | null {
  const cents = parseMoneyInput(raw);
  return cents;
}

/** Pourcentage ; la valeur est en points de base (26,1 % → 2610). */
export function PercentInput({ suffix = "%", ...props }: FieldProps) {
  return <DecimalInput {...props} suffix={suffix} parse={parsePercent} format={centsToInput} />;
}
