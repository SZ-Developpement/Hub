"use client";

import type { ComponentProps, ReactNode } from "react";
import {
  Controller,
  type Control,
  type ControllerFieldState,
  type ControllerRenderProps,
  type FieldPath,
  type FieldValues,
} from "react-hook-form";

import { DatePicker } from "@/components/shared/date-picker";
import { MoneyInput, PercentInput, QuantityInput } from "@/components/shared/number-inputs";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";

type BaseProps<
  Values extends FieldValues,
  Name extends FieldPath<Values> = FieldPath<Values>,
> = {
  control: Control<Values>;
  name: Name;
  label?: ReactNode;
  description?: ReactNode;
  className?: string;
};

type RenderArgs<Values extends FieldValues, Name extends FieldPath<Values>> = {
  field: ControllerRenderProps<Values, Name>;
  fieldState: ControllerFieldState;
  id: string;
};

/**
 * Champ de formulaire générique : libellé, contrôle, aide et message d'erreur.
 * Le type de `field.value` suit le champ nommé.
 */
export function FormField<
  Values extends FieldValues,
  Name extends FieldPath<Values> = FieldPath<Values>,
>({
  control,
  name,
  label,
  description,
  className,
  children,
}: BaseProps<Values, Name> & { children: (args: RenderArgs<Values, Name>) => ReactNode }) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => {
        const id = `field-${name.replace(/\./g, "-")}`;
        return (
          <Field data-invalid={fieldState.invalid} className={className}>
            {label ? <FieldLabel htmlFor={id}>{label}</FieldLabel> : null}
            {children({ field, fieldState, id })}
            {description ? <FieldDescription>{description}</FieldDescription> : null}
            {fieldState.invalid ? <FieldError errors={[fieldState.error]} /> : null}
          </Field>
        );
      }}
    />
  );
}

export function TextField<Values extends FieldValues>({
  control,
  name,
  label,
  description,
  className,
  ...inputProps
}: BaseProps<Values> & Omit<ComponentProps<typeof Input>, "name" | "value" | "onChange">) {
  return (
    <FormField control={control} name={name} label={label} description={description} className={className}>
      {({ field, fieldState, id }) => (
        <Input {...inputProps} {...field} id={id} value={field.value ?? ""} aria-invalid={fieldState.invalid} />
      )}
    </FormField>
  );
}

export function TextareaField<Values extends FieldValues>({
  control,
  name,
  label,
  description,
  className,
  ...textareaProps
}: BaseProps<Values> & Omit<ComponentProps<typeof Textarea>, "name" | "value" | "onChange">) {
  return (
    <FormField control={control} name={name} label={label} description={description} className={className}>
      {({ field, fieldState, id }) => (
        <Textarea
          rows={3}
          {...textareaProps}
          {...field}
          id={id}
          value={field.value ?? ""}
          aria-invalid={fieldState.invalid}
        />
      )}
    </FormField>
  );
}

export type Option = { value: string; label: string };

/** Valeur interne du Select pour « aucune sélection » (Radix refuse la chaîne vide). */
const NONE = "__none__";

export function SelectField<Values extends FieldValues>({
  control,
  name,
  label,
  description,
  className,
  options,
  placeholder = "Sélectionner…",
  emptyLabel,
  disabled,
}: BaseProps<Values> & {
  options: Option[];
  placeholder?: string;
  /** Si défini, ajoute une option vide qui renvoie `null`. */
  emptyLabel?: string;
  disabled?: boolean;
}) {
  return (
    <FormField control={control} name={name} label={label} description={description} className={className}>
      {({ field, fieldState, id }) => (
        <Select
          value={field.value ?? (emptyLabel ? NONE : "")}
          onValueChange={(value) => field.onChange(value === NONE ? null : value)}
          disabled={disabled}
        >
          <SelectTrigger id={id} className="w-full" aria-invalid={fieldState.invalid} onBlur={field.onBlur}>
            <SelectValue placeholder={placeholder} />
          </SelectTrigger>
          <SelectContent>
            {emptyLabel ? <SelectItem value={NONE}>{emptyLabel}</SelectItem> : null}
            {options.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    </FormField>
  );
}

type NumericProps<Values extends FieldValues> = BaseProps<Values> & {
  placeholder?: string;
  disabled?: boolean;
  allowNegative?: boolean;
  /** Si vrai, un champ vide vaut `null` ; sinon il vaut 0. */
  nullable?: boolean;
};

export function MoneyField<Values extends FieldValues>({
  control,
  name,
  label,
  description,
  className,
  nullable = false,
  ...inputProps
}: NumericProps<Values>) {
  return (
    <FormField control={control} name={name} label={label} description={description} className={className}>
      {({ field, fieldState, id }) => (
        <MoneyInput
          {...inputProps}
          id={id}
          value={field.value ?? null}
          onChange={(value) => field.onChange(value ?? (nullable ? null : 0))}
          onBlur={field.onBlur}
          aria-invalid={fieldState.invalid}
        />
      )}
    </FormField>
  );
}

export function QuantityField<Values extends FieldValues>({
  control,
  name,
  label,
  description,
  className,
  nullable = false,
  ...inputProps
}: NumericProps<Values>) {
  return (
    <FormField control={control} name={name} label={label} description={description} className={className}>
      {({ field, fieldState, id }) => (
        <QuantityInput
          {...inputProps}
          id={id}
          value={field.value ?? null}
          onChange={(value) => field.onChange(value ?? (nullable ? null : 0))}
          onBlur={field.onBlur}
          aria-invalid={fieldState.invalid}
        />
      )}
    </FormField>
  );
}

/** Taux saisi en % ; valeur en points de base. */
export function PercentField<Values extends FieldValues>({
  control,
  name,
  label,
  description,
  className,
  nullable = false,
  ...inputProps
}: NumericProps<Values>) {
  return (
    <FormField control={control} name={name} label={label} description={description} className={className}>
      {({ field, fieldState, id }) => (
        <PercentInput
          {...inputProps}
          id={id}
          value={field.value ?? null}
          onChange={(value) => field.onChange(value ?? (nullable ? null : 0))}
          onBlur={field.onBlur}
          aria-invalid={fieldState.invalid}
        />
      )}
    </FormField>
  );
}

/** Nombre entier (jours, chiffres…). */
export function IntegerField<Values extends FieldValues>({
  control,
  name,
  label,
  description,
  className,
  nullable = false,
  suffix,
  ...inputProps
}: NumericProps<Values> & { suffix?: string; min?: number; max?: number }) {
  return (
    <FormField control={control} name={name} label={label} description={description} className={className}>
      {({ field, fieldState, id }) => (
        <div className="relative">
          <Input
            {...inputProps}
            id={id}
            type="number"
            inputMode="numeric"
            step={1}
            className={suffix ? "pr-14 tabular-nums" : "tabular-nums"}
            value={field.value ?? ""}
            onChange={(event) => {
              const raw = event.target.value;
              if (raw === "") return field.onChange(nullable ? null : 0);
              const parsed = Number.parseInt(raw, 10);
              field.onChange(Number.isNaN(parsed) ? (nullable ? null : 0) : parsed);
            }}
            onBlur={field.onBlur}
            aria-invalid={fieldState.invalid}
          />
          {suffix ? (
            <span className="pointer-events-none absolute top-1/2 right-2.5 -translate-y-1/2 text-sm text-muted-foreground">
              {suffix}
            </span>
          ) : null}
        </div>
      )}
    </FormField>
  );
}

export function DateField<Values extends FieldValues>({
  control,
  name,
  label,
  description,
  className,
  clearable,
  min,
  max,
  disabled,
}: BaseProps<Values> & { clearable?: boolean; min?: string; max?: string; disabled?: boolean }) {
  return (
    <FormField control={control} name={name} label={label} description={description} className={className}>
      {({ field, fieldState, id }) => (
        <DatePicker
          id={id}
          value={field.value ?? null}
          onChange={field.onChange}
          clearable={clearable}
          min={min}
          max={max}
          disabled={disabled}
          invalid={fieldState.invalid}
        />
      )}
    </FormField>
  );
}

/** Interrupteur avec libellé et description alignés à gauche. */
export function SwitchField<Values extends FieldValues>({
  control,
  name,
  label,
  description,
  className,
  disabled,
}: BaseProps<Values> & { disabled?: boolean }) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field }) => {
        const id = `field-${name.replace(/\./g, "-")}`;
        return (
          <Field orientation="horizontal" className={className}>
            <FieldContent>
              <FieldLabel htmlFor={id}>{label}</FieldLabel>
              {description ? <FieldDescription>{description}</FieldDescription> : null}
            </FieldContent>
            <Switch
              id={id}
              checked={Boolean(field.value)}
              onCheckedChange={field.onChange}
              disabled={disabled}
            />
          </Field>
        );
      }}
    />
  );
}

export function CheckboxField<Values extends FieldValues>({
  control,
  name,
  label,
  description,
  className,
}: BaseProps<Values>) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field }) => {
        const id = `field-${name.replace(/\./g, "-")}`;
        return (
          <Field orientation="horizontal" className={className}>
            <Checkbox id={id} checked={Boolean(field.value)} onCheckedChange={field.onChange} />
            <FieldContent>
              <FieldLabel htmlFor={id}>{label}</FieldLabel>
              {description ? <FieldDescription>{description}</FieldDescription> : null}
            </FieldContent>
          </Field>
        );
      }}
    />
  );
}
