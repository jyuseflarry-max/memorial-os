"use client";

import { useState, useRef } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  ChevronRight,
  ChevronLeft,
  Upload,
  X,
  Eye,
  EyeOff,
  AlertCircle,
  CheckCircle2,
  Sparkles,
} from "lucide-react";

// ── Types ──────────────────────────────────────────────────────────────────

interface OnboardForm {
  programName:    string;
  primaryColor:   string;
  logoFile:       File | null;
  logoPreview:    string | null;
  fullName:       string;
  email:          string;
  password:       string;
  confirmPassword: string;
}

interface SuccessData {
  programName:  string;
  primaryColor: string;
  logoUrl:      string | null;
}

type Step = "program" | "account" | "success";

const INITIAL_FORM: OnboardForm = {
  programName:    "",
  primaryColor:   "#ED1C24",
  logoFile:       null,
  logoPreview:    null,
  fullName:       "",
  email:          "",
  password:       "",
  confirmPassword: "",
};

// ── Main component ─────────────────────────────────────────────────────────

export default function OnboardPage() {
  const router  = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);

  const [step,        setStep]        = useState<Step>("program");
  const [form,        setForm]        = useState<OnboardForm>(INITIAL_FORM);
  const [submitting,  setSubmitting]  = useState(false);
  const [error,       setError]       = useState<string | null>(null);
  const [showPass,    setShowPass]    = useState(false);
  const [successData, setSuccessData] = useState<SuccessData | null>(null);

  function patch<K extends keyof OnboardForm>(key: K, value: OnboardForm[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  // ── Logo file handling ───────────────────────────────────────────────────

  function handleLogoFile(file: File) {
    const reader = new FileReader();
    reader.onload = (e) => patch("logoPreview", e.target?.result as string);
    reader.readAsDataURL(file);
    patch("logoFile", file);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file?.type.startsWith("image/")) handleLogoFile(file);
  }

  // ── Validation ───────────────────────────────────────────────────────────

  function validateStep1(): string | null {
    if (!form.programName.trim())                      return "Program name is required.";
    if (!/^#[0-9a-fA-F]{6}$/.test(form.primaryColor)) return "Enter a valid hex color, e.g. #ED1C24.";
    return null;
  }

  function validateStep2(): string | null {
    if (!form.fullName.trim())                        return "Full name is required.";
    if (!form.email.trim() || !form.email.includes("@")) return "A valid email is required.";
    if (!form.password || form.password.length < 8)   return "Password must be at least 8 characters.";
    if (form.password !== form.confirmPassword)        return "Passwords do not match.";
    return null;
  }

  // ── Step navigation ──────────────────────────────────────────────────────

  function handleContinue() {
    setError(null);
    const err = validateStep1();
    if (err) { setError(err); return; }
    setStep("account");
  }

  function handleBack() {
    setError(null);
    setStep("program");
  }

  // ── Submit ───────────────────────────────────────────────────────────────

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const err = validateStep2();
    if (err) { setError(err); return; }

    setSubmitting(true);
    try {
      const fd = new FormData();
      fd.append("program_name",  form.programName.trim());
      fd.append("full_name",     form.fullName.trim());
      fd.append("email",         form.email.trim());
      fd.append("password",      form.password);
      fd.append("primary_color", form.primaryColor);
      if (form.logoFile) fd.append("logo", form.logoFile);

      const res  = await fetch("/api/onboarding", { method: "POST", body: fd });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Something went wrong. Please try again.");
        return;
      }

      setSuccessData({
        programName:  data.programName,
        primaryColor: data.primaryColor,
        logoUrl:      data.logoUrl,
      });
      setStep("success");
    } catch {
      setError("Network error. Please check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  }

  // ── Success screen ───────────────────────────────────────────────────────

  if (step === "success" && successData) {
    const { primaryColor, programName, logoUrl } = successData;
    // Hex → rgba for the glow / gradient without an external library
    const r = parseInt(primaryColor.slice(1, 3), 16);
    const g = parseInt(primaryColor.slice(3, 5), 16);
    const b = parseInt(primaryColor.slice(5, 7), 16);
    const glow14 = `rgba(${r},${g},${b},0.14)`;
    const glow40 = `rgba(${r},${g},${b},0.40)`;

    return (
      <div
        className="min-h-screen flex flex-col items-center justify-center px-5 py-16"
        style={{
          backgroundColor: "#000",
          backgroundImage: `radial-gradient(ellipse 80% 50% at 50% 0%, ${glow14}, transparent)`,
        }}
      >
        <div className="w-full max-w-sm flex flex-col items-center gap-8 text-center">

          {/* Logo or color icon */}
          {logoUrl ? (
            <div
              className="w-28 h-28 rounded-3xl bg-white flex items-center justify-center p-3 shadow-2xl"
              style={{ boxShadow: `0 0 60px ${glow40}` }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={logoUrl} alt={programName} className="w-full h-full object-contain" />
            </div>
          ) : (
            <div
              className="w-28 h-28 rounded-3xl flex items-center justify-center shadow-2xl"
              style={{ backgroundColor: primaryColor, boxShadow: `0 0 60px ${glow40}` }}
            >
              <Sparkles size={44} className="text-white" />
            </div>
          )}

          {/* Headline */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-center gap-2">
              <CheckCircle2 size={20} style={{ color: primaryColor }} />
              <span className="text-xs font-mono uppercase tracking-widest" style={{ color: primaryColor }}>
                Account Created
              </span>
            </div>
            <h1 className="text-white text-3xl font-bold tracking-tight leading-tight">
              Welcome to<br />
              <span style={{ color: primaryColor }}>{programName}</span>
            </h1>
            <p className="text-gray-400 text-base mt-1">
              Your program is ready. Sign in to start building.
            </p>
          </div>

          {/* Summary card */}
          <div className="w-full bg-gray-900/70 border border-gray-700/60 rounded-2xl p-5 flex flex-col gap-3 text-left backdrop-blur-sm">
            <p className="text-xs font-mono text-gray-500 uppercase tracking-wider">What's set up</p>
            {[
              { label: "Program name",  value: programName },
              { label: "Brand color",   value: (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 rounded-full shrink-0 border border-white/10" style={{ backgroundColor: primaryColor }} />
                  <span className="font-mono">{primaryColor}</span>
                </span>
              )},
              { label: "Logo",          value: logoUrl ? "Uploaded ✓" : "Not set — add in Settings" },
              { label: "Role",          value: "Admin" },
            ].map(({ label, value }) => (
              <div key={label} className="flex items-center justify-between gap-4">
                <span className="text-gray-500 text-sm shrink-0">{label}</span>
                <span className="text-white text-sm text-right">{value}</span>
              </div>
            ))}
          </div>

          {/* CTA */}
          <button
            type="button"
            onClick={() => router.push("/login")}
            className="flex items-center justify-center gap-2 w-full py-4 rounded-2xl font-semibold text-base text-white transition-all hover:opacity-90 active:scale-[0.98] shadow-lg"
            style={{ backgroundColor: primaryColor, boxShadow: `0 4px 24px ${glow40}` }}
          >
            Sign in to get started <ChevronRight size={18} />
          </button>
        </div>
      </div>
    );
  }

  // ── Form (steps 1 & 2) ───────────────────────────────────────────────────

  const isStep1 = step === "program";
  const colorValid = /^#[0-9a-fA-F]{6}$/.test(form.primaryColor);

  return (
    <div className="min-h-screen bg-coaches-navy flex flex-col items-center justify-center px-5 py-10">

      {/* Brand logo */}
      <div className="mb-8 w-full max-w-sm">
        <Image
          src="/thecoachsOS.jpg"
          alt="The Coach's OS"
          width={480}
          height={192}
          className="w-full h-auto object-contain rounded-xl"
          priority
        />
      </div>

      <div className="w-full max-w-sm flex flex-col gap-5">

        {/* ── Progress indicator ─────────────────────────────────────────── */}
        <div className="flex items-center gap-2">
          {(["Program", "Account"] as const).map((label, i) => {
            const active  = (i === 0 && isStep1) || (i === 1 && !isStep1);
            const done    = i === 0 && !isStep1;
            return (
              <div key={label} className="flex items-center flex-1 gap-2">
                <div className="flex items-center gap-1.5 shrink-0">
                  <div
                    className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold transition-colors ${
                      done || active ? "bg-coaches-red text-white" : "bg-gray-700 text-gray-500"
                    }`}
                  >
                    {done ? "✓" : i + 1}
                  </div>
                  <span className={`text-xs font-mono transition-colors ${active || done ? "text-white" : "text-gray-600"}`}>
                    {label}
                  </span>
                </div>
                {i < 1 && (
                  <div className="flex-1 h-px mx-1 bg-gray-700 overflow-hidden rounded-full">
                    <div
                      className="h-full bg-coaches-red transition-all duration-300"
                      style={{ width: done ? "100%" : "0%" }}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* ── Card ───────────────────────────────────────────────────────── */}
        <div className="bg-gray-900/80 border border-gray-700/60 rounded-2xl p-6 backdrop-blur-sm">

          {/* ── Step 1: Program ──────────────────────────────────────────── */}
          {isStep1 && (
            <div className="flex flex-col gap-5">
              <div>
                <h1 className="text-white text-2xl font-bold">Your Program</h1>
                <p className="text-gray-400 text-sm mt-1">Tell us about your coaching program.</p>
              </div>

              {/* Program name */}
              <Field label="Program Name">
                <input
                  type="text"
                  value={form.programName}
                  onChange={(e) => patch("programName", e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleContinue()}
                  placeholder="Memorial Basketball OS"
                  className={inputCls}
                />
              </Field>

              {/* Brand color */}
              <Field label="Brand Color" hint="Used on buttons, badges, and charts">
                <div className="flex items-center gap-3">
                  <label
                    className="w-11 h-11 rounded-xl border-2 border-gray-600 cursor-pointer shrink-0 overflow-hidden"
                    style={{ backgroundColor: colorValid ? form.primaryColor : "#ED1C24" }}
                    title="Open color picker"
                  >
                    <input
                      type="color"
                      value={colorValid ? form.primaryColor : "#ED1C24"}
                      onChange={(e) => patch("primaryColor", e.target.value)}
                      className="opacity-0 w-0 h-0"
                    />
                  </label>
                  <input
                    type="text"
                    value={form.primaryColor}
                    onChange={(e) => patch("primaryColor", e.target.value)}
                    maxLength={7}
                    placeholder="#ED1C24"
                    className={`${inputCls} font-mono w-36`}
                  />
                </div>
              </Field>

              {/* Logo upload */}
              <Field label="Logo" hint="Optional · PNG, SVG, JPG · Max 2 MB">
                {form.logoPreview ? (
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-xl bg-white flex-shrink-0 flex items-center justify-center overflow-hidden p-1.5">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={form.logoPreview} alt="Logo preview" className="w-full h-full object-contain" />
                    </div>
                    <div className="flex flex-col gap-2">
                      <button
                        type="button"
                        onClick={() => fileRef.current?.click()}
                        className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-gray-700 border border-gray-600 text-gray-300 hover:text-white transition-colors"
                      >
                        Change
                      </button>
                      <button
                        type="button"
                        onClick={() => { patch("logoFile", null); patch("logoPreview", null); }}
                        className="flex items-center gap-1 text-xs font-semibold text-gray-500 hover:text-red-400 transition-colors px-1"
                      >
                        <X size={12} /> Remove
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => fileRef.current?.click()}
                    onDrop={handleDrop}
                    onDragOver={(e) => e.preventDefault()}
                    className="w-full border-2 border-dashed border-gray-700 rounded-xl py-6 flex flex-col items-center gap-2 hover:border-gray-500 transition-colors"
                  >
                    <Upload size={22} className="text-gray-500" />
                    <span className="text-xs text-gray-500 font-mono">Drop here or click to browse</span>
                  </button>
                )}
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) handleLogoFile(f); }}
                />
              </Field>

              {error && <ErrorBanner message={error} />}

              <button
                type="button"
                onClick={handleContinue}
                className="flex items-center justify-center gap-2 w-full min-h-[52px] rounded-2xl bg-coaches-red hover:bg-coaches-red-dark text-white font-semibold text-base transition-colors"
              >
                Continue <ChevronRight size={18} />
              </button>
            </div>
          )}

          {/* ── Step 2: Account ──────────────────────────────────────────── */}
          {step === "account" && (
            <form onSubmit={handleSubmit} className="flex flex-col gap-5">
              <div>
                <h1 className="text-white text-2xl font-bold">Your Account</h1>
                <p className="text-gray-400 text-sm mt-1">This will be the admin account for your program.</p>
              </div>

              {/* Full name */}
              <Field label="Full Name">
                <input
                  type="text"
                  value={form.fullName}
                  onChange={(e) => patch("fullName", e.target.value)}
                  placeholder="Coach Johnson"
                  autoComplete="name"
                  className={inputCls}
                />
              </Field>

              {/* Email */}
              <Field label="Email">
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => patch("email", e.target.value)}
                  placeholder="coach@school.edu"
                  autoComplete="email"
                  className={inputCls}
                />
              </Field>

              {/* Password */}
              <Field label="Password">
                <div className="relative">
                  <input
                    type={showPass ? "text" : "password"}
                    value={form.password}
                    onChange={(e) => patch("password", e.target.value)}
                    placeholder="Min. 8 characters"
                    autoComplete="new-password"
                    className={`${inputCls} pr-12`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors"
                    tabIndex={-1}
                  >
                    {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                {form.password.length > 0 && <PasswordStrength password={form.password} />}
              </Field>

              {/* Confirm password */}
              <Field label="Confirm Password">
                <input
                  type="password"
                  value={form.confirmPassword}
                  onChange={(e) => patch("confirmPassword", e.target.value)}
                  placeholder="••••••••"
                  autoComplete="new-password"
                  className={`${inputCls} ${
                    form.confirmPassword.length > 0
                      ? form.password === form.confirmPassword
                        ? "border-green-600 focus:border-green-500"
                        : "border-red-600 focus:border-red-500"
                      : ""
                  }`}
                />
              </Field>

              {error && <ErrorBanner message={error} />}

              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={handleBack}
                  className="flex items-center gap-1 px-4 py-3 rounded-2xl border border-gray-700 text-gray-400 hover:text-white hover:border-gray-500 transition-colors text-sm font-semibold shrink-0"
                >
                  <ChevronLeft size={16} /> Back
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 flex items-center justify-center gap-2 min-h-[52px] rounded-2xl bg-coaches-red hover:bg-coaches-red-dark disabled:opacity-50 text-white font-semibold text-base transition-colors"
                >
                  {submitting ? "Creating account…" : <><span>Create Account</span> <ChevronRight size={18} /></>}
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Sign-in link */}
        <p className="text-center text-gray-600 text-sm">
          Already have an account?{" "}
          <a href="/login" className="text-gray-400 hover:text-white transition-colors">Sign in</a>
        </p>
      </div>
    </div>
  );
}

// ── Shared sub-components ──────────────────────────────────────────────────

const inputCls =
  "w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white text-base focus:outline-none focus:border-coaches-red transition-colors";

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-baseline justify-between">
        <label className="text-xs font-mono text-gray-400 uppercase tracking-wider">{label}</label>
        {hint && <span className="text-[10px] font-mono text-gray-600">{hint}</span>}
      </div>
      {children}
    </div>
  );
}

function ErrorBanner({ message }: { message: string }) {
  return (
    <div className="flex items-start gap-2 text-red-400 text-sm bg-red-400/10 border border-red-400/20 rounded-xl px-4 py-3">
      <AlertCircle size={15} className="shrink-0 mt-0.5" />
      <span>{message}</span>
    </div>
  );
}

/**
 * Four-bar password strength meter.
 * Score is based on length ≥ 8, uppercase, digit, and special char.
 */
function PasswordStrength({ password }: { password: string }) {
  const checks = [
    password.length >= 8,
    /[A-Z]/.test(password),
    /[0-9]/.test(password),
    /[^A-Za-z0-9]/.test(password),
  ];
  const score  = checks.filter(Boolean).length; // 1–4
  const labels = ["Weak", "Fair", "Good", "Strong"];
  const colors = ["#ef4444", "#f97316", "#eab308", "#22c55e"];
  const color  = colors[score - 1] ?? "#ef4444";

  return (
    <div className="flex items-center gap-2 mt-0.5">
      <div className="flex gap-1 flex-1">
        {[1, 2, 3, 4].map((n) => (
          <div
            key={n}
            className="flex-1 h-1 rounded-full transition-colors duration-300"
            style={{ backgroundColor: n <= score ? color : "#374151" }}
          />
        ))}
      </div>
      <span className="text-[10px] font-mono w-10 text-right" style={{ color }}>
        {labels[score - 1] ?? "Weak"}
      </span>
    </div>
  );
}
