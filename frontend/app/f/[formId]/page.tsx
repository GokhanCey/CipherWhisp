"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

type FieldType =
  | "text"
  | "textarea"
  | "number"
  | "select"
  | "multi-select"
  | "rating"
  | "checkbox";

type Field = {
  id: string;
  label: string;
  type: FieldType;
  required?: boolean;
  options?: string[];
  min?: number;
  max?: number;
  helpText?: string;
};

type FormSchema = {
  fields: Field[];
};

export default function SubmitFormPage() {
  const { formId } = useParams<{ formId: string }>();

  const [schema, setSchema] = useState<FormSchema | null>(null);
  const [publicKey, setPublicKey] = useState<CryptoKey | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [values, setValues] = useState<Record<string, any>>({});

  useEffect(() => {
    if (!formId) return;

    async function loadForm() {
      try {
        const res = await fetch(`http://localhost:8000/form/${formId}`);
        if (!res.ok) throw new Error("Form not found");
        const data = await res.json();

        const jwk = JSON.parse(data.publicKey);
        const importedKey = await window.crypto.subtle.importKey(
          "jwk",
          jwk,
          { name: "RSA-OAEP", hash: "SHA-256" },
          true,
          ["encrypt"]
        );

        setSchema(data.schema as FormSchema);
        setPublicKey(importedKey);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    loadForm();
  }, [formId]);

  async function encrypt(text: string) {
    const encoded = new TextEncoder().encode(text);
    const encrypted = await window.crypto.subtle.encrypt(
      { name: "RSA-OAEP" },
      publicKey!,
      encoded
    );
    return btoa(String.fromCharCode(...new Uint8Array(encrypted)));
  }

  async function handleSubmit() {
    try {
      if (!publicKey || !schema) return;

      // Basic required check
      for (const field of schema.fields) {
        const v = values[field.id];
        if (field.required) {
          if (field.type === "checkbox") {
            if (!v) {
              throw new Error(`Please confirm: ${field.label}`);
            }
          } else if (v === undefined || v === null || String(v).trim() === "") {
            throw new Error(`Please fill: ${field.label}`);
          }
        }

        if (field.type === "number" || field.type === "rating") {
          if (v !== undefined && v !== null && String(v).trim() !== "") {
            const num = Number(v);
            if (Number.isNaN(num)) {
              throw new Error(`Field "${field.label}" must be a number.`);
            }
            if (typeof field.min === "number" && num < field.min) {
              throw new Error(`Field "${field.label}" must be at least ${field.min}.`);
            }
            if (typeof field.max === "number" && num > field.max) {
              throw new Error(`Field "${field.label}" must be at most ${field.max}.`);
            }
          }
        }
      }

      // Normalize payload
      const payload: Record<string, any> = {};
      for (const field of schema.fields) {
        let v = values[field.id];

        if (field.type === "number" || field.type === "rating") {
          if (v === "" || v === undefined || v === null) {
            v = null;
          } else {
            v = Number(v);
          }
        }

        payload[field.id] = v;
      }

      const encrypted = await encrypt(JSON.stringify(payload));

      const res = await fetch(`http://localhost:8000/submit/${formId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ encrypted }),
      });

      if (!res.ok) throw new Error("Submit failed");
      setSubmitted(true);
      setError(null);
    } catch (err: any) {
      setError(err.message);
    }
  }

  function renderField(field: Field) {
    const commonLabel = (
      <label className="font-medium text-sm">
        {field.label}
        {field.required && <span className="text-red-400 ml-1">*</span>}
      </label>
    );

    const help = field.helpText && (
      <p className="text-xs text-gray-400 mt-1">{field.helpText}</p>
    );

    const value = values[field.id];

    switch (field.type) {
      case "textarea":
        return (
          <div className="flex flex-col gap-1">
            {commonLabel}
            <textarea
              required={field.required}
              className="border border-gray-600 bg-black rounded p-2 min-h-[120px] text-sm outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-500"
              value={value ?? ""}
              onChange={(e) => setValues((v) => ({ ...v, [field.id]: e.target.value }))}
            />
            {help}
          </div>
        );

      case "text":
        return (
          <div className="flex flex-col gap-1">
            {commonLabel}
            <input
              type="text"
              required={field.required}
              className="border border-gray-600 bg-black rounded p-2 text-sm outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-500"
              value={value ?? ""}
              onChange={(e) => setValues((v) => ({ ...v, [field.id]: e.target.value }))}
            />
            {help}
          </div>
        );

      case "number":
        return (
          <div className="flex flex-col gap-1">
            {commonLabel}
            <input
              type="number"
              required={field.required}
              min={field.min}
              max={field.max}
              className="border border-gray-600 bg-black rounded p-2 text-sm outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-500"
              value={value ?? ""}
              onChange={(e) => setValues((v) => ({ ...v, [field.id]: e.target.value }))}
            />
            {field.min !== undefined || field.max !== undefined ? (
              <p className="text-xs text-gray-400">
                {field.min !== undefined && `Min ${field.min}`}{" "}
                {field.max !== undefined && `Max ${field.max}`}
              </p>
            ) : null}
            {help}
          </div>
        );

      case "select":
        return (
          <div className="flex flex-col gap-1">
            {commonLabel}
            <select
              required={field.required}
              className="border border-gray-600 bg-black rounded p-2 text-sm outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-500"
              value={value ?? ""}
              onChange={(e) => setValues((v) => ({ ...v, [field.id]: e.target.value }))}
            >
              <option value="">Select...</option>
              {(field.options || []).map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
            {help}
          </div>
        );

      case "multi-select":
        return (
          <div className="flex flex-col gap-1">
            {commonLabel}
            <select
              multiple
              className="border border-gray-600 bg-black rounded p-2 text-sm outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-500"
              value={(value as string[]) || []}
              onChange={(e) => {
                const selected = Array.from(e.target.selectedOptions).map((o) => o.value);
                setValues((v) => ({ ...v, [field.id]: selected }));
              }}
            >
              {(field.options || []).map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-400">Hold Ctrl or Cmd to select multiple.</p>
            {help}
          </div>
        );

      case "rating": {
        const min = field.min ?? 1;
        const max = field.max ?? 5;
        const options = [];
        for (let i = min; i <= max; i++) options.push(i);
        return (
          <div className="flex flex-col gap-1">
            {commonLabel}
            <div className="flex gap-2 mt-1">
              {options.map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setValues((v) => ({ ...v, [field.id]: String(n) }))}
                  className={`w-8 h-8 rounded-full border text-sm ${
                    String(value) === String(n)
                      ? "bg-cyan-500 text-black border-cyan-400"
                      : "border-gray-600 text-gray-300 hover:border-cyan-400"
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
            {help}
          </div>
        );
      }

      case "checkbox":
        return (
          <div className="flex items-start gap-2">
            <input
              id={field.id}
              type="checkbox"
              checked={!!value}
              onChange={(e) => setValues((v) => ({ ...v, [field.id]: e.target.checked }))}
              className="mt-1 rounded border-gray-500 bg-black"
              required={field.required}
            />
            <div className="flex flex-col">
              <label htmlFor={field.id} className="font-medium text-sm">
                {field.label}
                {field.required && <span className="text-red-400 ml-1">*</span>}
              </label>
              {help}
            </div>
          </div>
        );

      default:
        return null;
    }
  }

  if (loading) return <p className="p-8 text-gray-300">Loading...</p>;
  if (error) return <p className="p-8 text-red-500">{error}</p>;

  if (submitted) {
    return (
      <main className="p-8 max-w-xl mx-auto">
        <h1 className="text-2xl font-bold mb-2">Report submitted</h1>
        <p className="text-gray-400">
          Your encrypted report has been stored. It can only be read by the person holding the private key.
        </p>
      </main>
    );
  }

  return (
    <main className="p-8 max-w-xl mx-auto">
      <h1 className="text-3xl font-bold mb-4">Submit anonymous report</h1>
      <p className="text-sm text-gray-400 mb-6">
        This report is encrypted in your browser before it is stored. Do not include your name or any details that
        reveal your identity unless you want to.
      </p>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSubmit();
        }}
        className="space-y-6"
      >
        {schema?.fields.map((field) => (
          <div key={field.id}>{renderField(field)}</div>
        ))}

        <button
          type="submit"
          className="px-4 py-2 rounded-lg border border-gray-600 hover:bg-gray-800"
        >
          Submit
        </button>

        {error && <p className="text-red-500 text-sm">{error}</p>}
      </form>
    </main>
  );
}
