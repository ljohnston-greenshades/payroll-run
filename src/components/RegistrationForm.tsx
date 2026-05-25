"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useState } from "react";

type FormState = {
  firstName: string;
  lastName: string;
  email: string;
  company: string;
  screenName: string;
};

const EMPTY: FormState = {
  firstName: "",
  lastName: "",
  email: "",
  company: "",
  screenName: "",
};

function inferCompanyFromEmail(email: string): string {
  const at = email.lastIndexOf("@");
  if (at < 0) return "";
  const domain = email.slice(at + 1).toLowerCase();
  const parts = domain.split(".").filter(Boolean);
  if (parts.length === 0) return "";
  const root = parts.length > 1 ? parts[parts.length - 2] : parts[0];
  return root.charAt(0).toUpperCase() + root.slice(1);
}

interface Props {
  // The event the player is registering for. Required for every booth-
  // QR flow — the parent page reads it from the URL path /[slug].
  eventSlug: string;
}

export function RegistrationForm({ eventSlug }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const mode = searchParams.get("mode") === "booth" ? "booth" : "event";
  const [form, setForm] = useState<FormState>(EMPTY);
  const [companyTouched, setCompanyTouched] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const update = (field: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setForm((prev) => {
      const next = { ...prev, [field]: value };
      if (field === "email" && !companyTouched) {
        const guess = inferCompanyFromEmail(value);
        if (guess) next.company = guess;
      }
      return next;
    });
  };

  const onCompanyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCompanyTouched(true);
    setForm((prev) => ({ ...prev, company: e.target.value }));
  };

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrors({});
    setGeneralError(null);
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, mode, eventSlug }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (data?.errors) setErrors(data.errors);
        else setGeneralError(data?.error ?? "Something went wrong. Try again.");
        setIsSubmitting(false);
        return;
      }
      if (mode === "booth" && data?.queueToken) {
        router.push(`/queue/${data.queueToken}`);
      } else {
        // Self-serve flow still uses the legacy /play path that reads
        // the env-var event. Once that path is retired we can route
        // to /${eventSlug}/play or similar.
        router.push("/play");
      }
    } catch {
      setGeneralError("Network error. Try again.");
      setIsSubmitting(false);
    }
  };

  const fieldError = (key: keyof FormState) => errors[key];

  return (
    <form onSubmit={onSubmit} className="w-full max-w-md space-y-3 text-left" noValidate>
      <div className="grid grid-cols-2 gap-3">
        <Field
          id="firstName"
          label="First name"
          value={form.firstName}
          onChange={update("firstName")}
          error={fieldError("firstName")}
          autoComplete="given-name"
          required
        />
        <Field
          id="lastName"
          label="Last name"
          value={form.lastName}
          onChange={update("lastName")}
          error={fieldError("lastName")}
          autoComplete="family-name"
          required
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field
          id="email"
          type="email"
          label="Work email"
          value={form.email}
          onChange={update("email")}
          error={fieldError("email")}
          autoComplete="email"
          required
        />
        <Field
          id="company"
          label="Company"
          value={form.company}
          onChange={onCompanyChange}
          error={fieldError("company")}
          autoComplete="organization"
          required
        />
      </div>
      <Field
        id="screenName"
        label="Screen name"
        value={form.screenName}
        onChange={update("screenName")}
        error={fieldError("screenName")}
        maxLength={12}
        hint="Shown on the leaderboard. Defaults to your first name."
      />

      {generalError ? (
        <p className="text-sm text-red-300" role="alert">
          {generalError}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={isSubmitting}
        className="mt-1 w-full rounded-md bg-gsGreen px-6 py-3 font-pixel text-sm uppercase tracking-wider text-gsNavy shadow-lg shadow-gsGreen/20 transition hover:brightness-110 hover:shadow-gsGreen/40 active:translate-y-px disabled:opacity-60"
      >
        {isSubmitting ? "Starting…" : "Start running →"}
      </button>

      <p className="text-xs text-white/55">
        By playing, you agree to receive info from Greenshades about our payroll
        and HR solutions. We&apos;ll never share your data with third parties.
      </p>
    </form>
  );
}

interface FieldProps {
  id: string;
  label: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  error?: string;
  type?: string;
  autoComplete?: string;
  required?: boolean;
  maxLength?: number;
  hint?: string;
}

function Field({
  id,
  label,
  value,
  onChange,
  error,
  type = "text",
  autoComplete,
  required,
  maxLength,
  hint,
}: FieldProps) {
  return (
    <div className="space-y-1.5">
      <label
        htmlFor={id}
        className="block text-xs font-semibold uppercase tracking-wider text-white/70"
      >
        {label}
        {required ? <span className="ml-1 text-gsGreen">*</span> : null}
      </label>
      <input
        id={id}
        name={id}
        type={type}
        value={value}
        onChange={onChange}
        autoComplete={autoComplete}
        required={required}
        maxLength={maxLength}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${id}-error` : hint ? `${id}-hint` : undefined}
        className="w-full rounded-md border border-white/15 bg-white/[0.04] px-3 py-2.5 text-white placeholder-white/40 outline-none transition focus:border-gsGreen focus:bg-white/[0.06] focus:ring-2 focus:ring-gsGreen/25"
      />
      {error ? (
        <p id={`${id}-error`} className="text-xs text-red-300">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="text-xs text-white/45">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
