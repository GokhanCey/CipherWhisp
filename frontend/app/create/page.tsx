"use client";

import { useState } from "react";

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

type CreateResponse = {
  formId: string;
  adminLink: string;
  submitLink: string;
};

// --- Templates used as starting points ---
const TEMPLATES: Record<string, { label: string; description: string; fields: Field[] }> = {
  whistleblowing: {
    label: "Whistleblowing Report",
    description: "For reporting harassment, misconduct, ethics issues.",
    fields: [
      { id: "title", label: "Title", type: "text", required: true },
      {
        id: "category",
        label: "Category",
        type: "select",
        required: true,
        options: ["Harassment", "Safety issue", "Misconduct", "Other"],
      },
      {
        id: "details",
        label: "Details",
        type: "textarea",
        required: true,
        helpText: "Describe what happened with dates, locations and people involved.",
      },
      {
        id: "anonymousConfirm",
        label: "I confirm this report is anonymous",
        type: "checkbox",
        required: true,
      },
      {
        id: "urgency",
        label: "Urgency (1 to 5)",
        type: "rating",
        min: 1,
        max: 5,
      },
    ],
  },
  workplace: {
    label: "Workplace Feedback",
    description: "For team climate, culture and leadership feedback.",
    fields: [
      { id: "topic", label: "Topic", type: "text", required: true },
      {
        id: "sentiment",
        label: "How do you feel",
        type: "select",
        options: ["Very positive", "Positive", "Neutral", "Negative", "Very negative"],
      },
      {
        id: "message",
        label: "What should we know",
        type: "textarea",
        required: true,
      },
      {
        id: "impact",
        label: "Impact on you (1 to 10)",
        type: "number",
        min: 1,
        max: 10,
      },
    ],
  },
  incident: {
    label: "Safety / Incident Report",
    description: "For accidents or near misses at work or events.",
    fields: [
      { id: "location", label: "Where did this happen", type: "text", required: true },
      { id: "time", label: "When did this happen", type: "text", required: true },
      {
        id: "severity",
        label: "Severity (1 to 5)",
        type: "number",
        min: 1,
        max: 5,
        required: true,
      },
      {
        id: "details",
        label: "Describe the incident",
        type: "textarea",
        required: true,
      },
      {
        id: "followup",
        label: "What follow up is needed",
        type: "textarea",
      },
    ],
  },
};

function cloneTemplateFields(templateKey: string): Field[] {
  return TEMPLATES[templateKey].fields.map((f) => ({ ...f, options: f.options ? [...f.options] : undefined }));
}

function slugFromLabel(label: string, index: number) {
  const base = label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
  return base || `field_${index + 1}`;
}

export default function CreateFormPage() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<CreateResponse | null>(null);
  const [privateKey, setPrivateKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [selectedTemplate, setSelectedTemplate] = useState<keyof typeof TEMPLATES>("whistleblowing");
  const [fields, setFields] = useState<Field[]>(() => cloneTemplateFields("whistleblowing"));

  async function generateKeyPair() {
    const keyPair = await window.crypto.subtle.generateKey(
      {
        name: "RSA-OAEP",
        modulusLength: 2048,
        publicExponent: new Uint8Array([1, 0, 1]),
        hash: "SHA-256",
      },
      true,
      ["encrypt", "decrypt"]
    );

    const publicJwk = await window.crypto.subtle.exportKey("jwk", keyPair.publicKey);
    const privateJwk = await window.crypto.subtle.exportKey("jwk", keyPair.privateKey);

    return {
      publicKey: JSON.stringify(publicJwk),
      privateKey: JSON.stringify(privateJwk),
    };
  }

  function handleTemplateChange(key: string) {
    if (!(key in TEMPLATES)) return;
    setSelectedTemplate(key as keyof typeof TEMPLATES);
    setFields(cloneTemplateFields(key));
  }

  function updateField(index: number, patch: Partial<Field>) {
    setFields((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], ...patch };
      return copy;
    });
  }

  function removeField(index: number) {
    setFields((prev) => prev.filter((_, i) => i !== index));
  }

  function addField() {
    setFields((prev) => [
      ...prev,
      {
        id: `field_${prev.length + 1}`,
        label: "New question",
        type: "text",
        required: false,
      },
    ]);
  }

  async function createForm() {
    try {
      setLoading(true);
      setError(null);
      setResult(null);
      setPrivateKey(null);

      if (!fields.length) {
        throw new Error("You need at least one question in the form.");
      }

      // Generate keys in browser
      const { publicKey, privateKey } = await generateKeyPair();

      // Normalize ids, options and numeric bounds
      const normalizedFields: Field[] = fields.map((f, index) => {
        const id = f.id && f.id.trim() ? f.id.trim() : slugFromLabel(f.label, index);

        let options: string[] | undefined = undefined;
        if (f.type === "select" || f.type === "multi-select") {
          options = (f.options || []).map((o) => o.trim()).filter(Boolean);
        }

        const min = typeof f.min === "number" ? f.min : undefined;
        const max = typeof f.max === "number" ? f.max : undefined;

        return {
          ...f,
          id,
          options,
          min,
          max,
        };
      });

      const schema: FormSchema = { fields: normalizedFields };

      const res = await fetch("http://localhost:8000/create-form", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ publicKey, schema }),
      });

      if (!res.ok) throw new Error(`Backend error ${res.status}`);
      const data = (await res.json()) as CreateResponse;

      setResult(data);
      setPrivateKey(privateKey);
    } catch (err: any) {
      setError(err.message || "Error creating form");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen p-8 max-w-3xl mx-auto text-gray-100">
      <h1 className="text-3xl font-bold mb-2">Create a Form</h1>
      <p className="text-sm text-gray-300 mb-6">
        Select a template as a starting point, adjust the questions, then generate a secure encrypted form.
        All keys are created in your browser.
      </p>

      {/* Template selector */}
      <section className="mb-6 space-y-2">
        <label className="text-xs font-semibold uppercase tracking-wide text-gray-400">
          Choose a template
        </label>
        <select
          value={selectedTemplate}
          onChange={(e) => handleTemplateChange(e.target.value)}
          className="w-full rounded-md border border-slate-700 bg-black px-3 py-2 text-sm outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-500"
        >
          {Object.entries(TEMPLATES).map(([key, t]) => (
            <option key={key} value={key}>
              {t.label}
            </option>
          ))}
        </select>
        <p className="text-xs text-gray-400">{TEMPLATES[selectedTemplate].description}</p>
      </section>

      {/* Field editor */}
      <section className="mb-8">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold">Form questions</h2>
          <button
            type="button"
            onClick={addField}
            className="text-xs px-3 py-1.5 rounded-md border border-slate-600 hover:bg-slate-800"
          >
            + Add question
          </button>
        </div>

        <div className="space-y-4">
          {fields.map((field, index) => (
            <div
              key={field.id || index}
              className="border border-slate-700 rounded-lg p-4 bg-black/60 flex flex-col gap-3"
            >
              <div className="flex items-center gap-3">
                <input
                  value={field.label}
                  onChange={(e) => updateField(index, { label: e.target.value })}
                  placeholder="Question text"
                  className="flex-1 rounded-md border border-slate-600 bg-black px-3 py-1.5 text-sm outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-500"
                />
                <select
                  value={field.type}
                  onChange={(e) => updateField(index, { type: e.target.value as FieldType })}
                  className="w-40 rounded-md border border-slate-600 bg-black px-2 py-1.5 text-xs outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-500"
                >
                  <option value="text">Short text</option>
                  <option value="textarea">Long text</option>
                  <option value="number">Number</option>
                  <option value="rating">Rating (1 to 5 or custom)</option>
                  <option value="select">Single choice</option>
                  <option value="multi-select">Multiple choice</option>
                  <option value="checkbox">Checkbox</option>
                </select>
              </div>

              <div className="flex flex-wrap items-center gap-4 text-xs">
                <label className="inline-flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={!!field.required}
                    onChange={(e) => updateField(index, { required: e.target.checked })}
                    className="rounded border-slate-500 bg-black"
                  />
                  Required
                </label>

                <div className="flex items-center gap-2">
                  <span className="text-gray-400">Field id:</span>
                  <input
                    value={field.id}
                    onChange={(e) => updateField(index, { id: e.target.value })}
                    className="w-40 rounded border border-slate-600 bg-black px-2 py-1 outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-500"
                  />
                </div>

                {(field.type === "number" || field.type === "rating") && (
                  <>
                    <div className="flex items-center gap-1">
                      <span className="text-gray-400">Min</span>
                      <input
                        type="number"
                        value={field.min ?? ""}
                        onChange={(e) =>
                          updateField(index, { min: e.target.value === "" ? undefined : Number(e.target.value) })
                        }
                        className="w-20 rounded border border-slate-600 bg-black px-2 py-1 outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-500"
                      />
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-gray-400">Max</span>
                      <input
                        type="number"
                        value={field.max ?? ""}
                        onChange={(e) =>
                          updateField(index, { max: e.target.value === "" ? undefined : Number(e.target.value) })
                        }
                        className="w-20 rounded border border-slate-600 bg-black px-2 py-1 outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-500"
                      />
                    </div>
                  </>
                )}

                {(field.type === "select" || field.type === "multi-select") && (
                  <div className="flex items-center gap-2 flex-1 min-w-[220px]">
                    <span className="text-gray-400">Options</span>
                    <input
                      value={(field.options || []).join(", ")}
                      onChange={(e) =>
                        updateField(index, {
                          options: e.target.value
                            .split(",")
                            .map((x) => x.trim())
                            .filter(Boolean),
                        })
                      }
                      placeholder="Comma separated: Option A, Option B"
                      className="flex-1 rounded border border-slate-600 bg-black px-2 py-1 outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-500"
                    />
                  </div>
                )}
              </div>

              <div className="flex flex-col gap-2 text-xs">
                <label className="text-gray-400">
                  Help text (optional)
                  <textarea
                    value={field.helpText || ""}
                    onChange={(e) => updateField(index, { helpText: e.target.value })}
                    className="mt-1 w-full rounded-md border border-slate-600 bg-black px-2 py-1.5 text-xs outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-500"
                    rows={2}
                  />
                </label>
              </div>

              {fields.length > 1 && (
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => removeField(index)}
                    className="text-xs text-red-400 hover:text-red-300"
                  >
                    Remove question
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Create button and result */}
      <section className="space-y-4">
        <button
          onClick={createForm}
          disabled={loading}
          className="px-4 py-2 rounded-lg border border-gray-600 hover:bg-gray-800 disabled:opacity-50"
        >
          {loading ? "Creating..." : "Create form"}
        </button>

        {error && <p className="text-red-500 text-sm">{error}</p>}

        {result && privateKey && (
          <div className="mt-4 border border-gray-700 rounded-lg p-4 space-y-3 text-sm">
            <h2 className="text-base font-semibold mb-1">Form created</h2>

            <p className="font-mono text-xs break-all">Form ID: {result.formId}</p>
            <p className="font-mono text-xs break-all">
              Submit: http://localhost:3000{result.submitLink}
            </p>
            <p className="font-mono text-xs break-all">
              Admin: http://localhost:3000{result.adminLink}
            </p>

            <div>
              <p className="text-sm font-medium mb-1">Admin private key (save this now):</p>
              <textarea
                readOnly
                className="w-full h-40 text-xs font-mono bg-black border border-gray-700 rounded p-2"
                value={privateKey}
              />
            </div>
          </div>
        )}
      </section>
    </main>
  );
}
