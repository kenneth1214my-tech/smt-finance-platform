"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { CheckCircle2, AlertTriangle } from "lucide-react";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { localizedName } from "@/lib/localize";
import type { Locale, DICTIONARIES } from "@/lib/i18n/dictionaries";
import type { Subsidiary } from "@prisma/client";

type Dict = (typeof DICTIONARIES)[Locale];

const ROLE_OPTIONS = ["FINANCE", "MANAGER", "VIEWER"] as const;

export default function RegisterForm({
  dict,
  locale,
  subsidiaries,
}: {
  dict: Dict;
  locale: Locale;
  subsidiaries: Subsidiary[];
}) {
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    subsidiaryId: "",
    requestedRole: "FINANCE" as (typeof ROLE_OPTIONS)[number],
    reason: "",
  });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, subsidiaryId: form.subsidiaryId || null }),
    });
    setLoading(false);
    if (res.ok) {
      setSubmitted(true);
      return;
    }
    const body = await res.json().catch(() => ({}));
    if (body.error === "email_taken" || body.error === "already_pending") {
      setError(locale === "en" ? "This email is already registered or pending review." : "该邮箱已注册或申请正在审批中。");
    } else {
      setError(locale === "en" ? "Something went wrong. Please check your input." : "提交失败，请检查填写内容。");
    }
  }

  const wrapStyle: React.CSSProperties = {
    background:
      "radial-gradient(900px 500px at 15% -10%, color-mix(in srgb, var(--cat-1) 10%, transparent), transparent), radial-gradient(900px 600px at 100% 110%, color-mix(in srgb, var(--side-accent) 12%, transparent), transparent), var(--bg)",
  };

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 py-8" style={wrapStyle}>
        <div className="w-full max-w-md rounded-2xl border p-8 text-center shadow-xl" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
          <div className="mb-4 flex justify-start">
            <LanguageSwitcher current={locale} />
          </div>
          <div
            className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full"
            style={{ background: "color-mix(in srgb, var(--status-good) 14%, transparent)", color: "var(--status-good)" }}
          >
            <CheckCircle2 size={28} />
          </div>
          <h1 className="text-lg font-extrabold" style={{ color: "var(--ink-900)" }}>
            {dict.auth.pendingTitle}
          </h1>
          <p className="mt-2 text-[12.5px]" style={{ color: "var(--ink-400)" }}>
            {dict.auth.pendingDesc}
          </p>
          <Link
            href="/login"
            className="mt-5 inline-block w-full rounded-lg py-2.5 text-sm font-bold"
            style={{ background: "var(--surface-2)", color: "var(--ink-900)" }}
          >
            {dict.auth.backToLogin}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-8" style={wrapStyle}>
      <div className="w-full max-w-md rounded-2xl border p-8 shadow-xl" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
        <div className="mb-4 flex justify-start">
          <LanguageSwitcher current={locale} />
        </div>
        <div className="mb-6 flex items-center gap-2.5">
          <Image src="/logo.png" alt="SMT" width={36} height={36} className="h-9 w-9 rounded-lg object-cover" />
          <div className="text-[15px] font-bold" style={{ color: "var(--ink-900)" }}>
            {dict.appName}
          </div>
        </div>

        <h1 className="text-lg font-extrabold" style={{ color: "var(--ink-900)" }}>
          {dict.auth.regTitle}
        </h1>
        <p className="mb-5 mt-1 text-[12.5px]" style={{ color: "var(--ink-400)" }}>
          {dict.auth.regDesc}
        </p>

        {error && (
          <div
            className="mb-3.5 flex items-start gap-2 rounded-lg px-3 py-2.5 text-xs font-semibold"
            style={{ background: "color-mix(in srgb, var(--status-critical) 12%, transparent)", color: "var(--status-critical)" }}
          >
            <AlertTriangle size={14} className="mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={submit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Field label={dict.auth.fullName}>
              <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="hr-input" />
            </Field>
            <Field label={dict.auth.phone}>
              <input required value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="hr-input" />
            </Field>
          </div>
          <Field label={dict.auth.email}>
            <input type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="hr-input" />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label={dict.auth.dept}>
              <select value={form.subsidiaryId} onChange={(e) => setForm({ ...form, subsidiaryId: e.target.value })} className="hr-input">
                <option value="">{dict.auth.headOffice}</option>
                {subsidiaries.map((s) => (
                  <option key={s.id} value={s.id}>
                    {localizedName(s, locale)}
                  </option>
                ))}
              </select>
            </Field>
            <Field label={dict.auth.reqRole}>
              <select
                value={form.requestedRole}
                onChange={(e) => setForm({ ...form, requestedRole: e.target.value as typeof form.requestedRole })}
                className="hr-input"
              >
                {ROLE_OPTIONS.map((r) => (
                  <option key={r} value={r}>
                    {dict.role[r]}
                  </option>
                ))}
              </select>
            </Field>
          </div>
          <Field label={dict.auth.reason}>
            <textarea
              value={form.reason}
              onChange={(e) => setForm({ ...form, reason: e.target.value })}
              placeholder={dict.auth.reasonPh}
              rows={3}
              className="hr-input resize-none"
            />
          </Field>
          <button type="submit" disabled={loading} className="mt-2 w-full rounded-lg py-2.5 text-sm font-bold text-white disabled:opacity-60" style={{ background: "var(--cat-1)" }}>
            {loading ? "…" : dict.common.submit}
          </button>
        </form>

        <div className="mt-4 text-center text-xs" style={{ color: "var(--ink-400)" }}>
          {dict.auth.haveAccount}{" "}
          <Link href="/login" className="font-bold" style={{ color: "var(--cat-1)" }}>
            {dict.auth.backToLogin}
          </Link>
        </div>
      </div>

      <style>{`.hr-input{width:100%;border:1px solid var(--border-strong);border-radius:9px;padding:9px 11px;font-size:13px;background:var(--surface);color:var(--ink-900);outline:none}`}</style>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-bold" style={{ color: "var(--ink-600)" }}>
        {label}
      </label>
      {children}
    </div>
  );
}
