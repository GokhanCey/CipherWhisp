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
};

type FormSchema = {
  fields: Field[];
};

type Submission = {
  blobId: string;
  encrypted: string;
};

type DecryptedItem = {
  blobId: string;
  data: Record<string, any> | string;
};

export default function AdminInboxPage() {
  const { formId } = useParams<{ formId: string }>();

  const [privateKey, setPrivateKey] = useState("");
  const [cryptoKey, setCryptoKey] = useState<CryptoKey | null>(null);

  const [schema, setSchema] = useState<FormSchema | null>(null);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [decrypted, setDecrypted] = useState<DecryptedItem[]>([]);

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Load schema for labels
  useEffect(() => {
    if (!formId) return;

    async function loadSchema() {
      try {
        const res = await fetch(`http://localhost:8000/form/${formId}`);
        if (!res.ok) return;
        const data = await res.json();
        setSchema(data.schema as FormSchema);
      } catch {
        // non fatal for admin page
      }
    }

    loadSchema();
  }, [formId]);

  async function importPrivateKey(jwkStr: string) {
    try {
      const jwk = JSON.parse(jwkStr);

      const key = await window.crypto.subtle.importKey(
        "jwk",
        jwk,
        { name: "RSA-OAEP", hash: "SHA-256" },
        true,
        ["decrypt"]
      );

      setCryptoKey(key);
      setError(null);
    } catch {
      setError("Invalid private key format");
    }
  }

  async function fetchEncrypted() {
    if (!formId) return;
    setLoading(true);
    try {
      const res = await fetch(`http://localhost:8000/submissions/${formId}`);
      if (!res.ok) throw new Error("Failed to fetch submissions");

      const data = (await res.json()) as Submission[];
      setSubmissions(data);
      setDecrypted([]);
      setError(null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function decryptAll() {
    if (!cryptoKey) return;

    const results: DecryptedItem[] = [];

    for (const sub of submissions) {
      try {
        const encryptedBytes = Uint8Array.from(atob(sub.encrypted), (c) =>
          c.charCodeAt(0)
        );

        const decryptedBuf = await window.crypto.subtle.decrypt(
          { name: "RSA-OAEP" },
          cryptoKey,
          encryptedBytes
        );

        const decoded = new TextDecoder().decode(decryptedBuf);
        let parsed: any;
        try {
          parsed = JSON.parse(decoded);
        } catch {
          parsed = decoded;
        }

        results.push({ blobId: sub.blobId, data: parsed });
      } catch {
        results.push({ blobId: sub.blobId, data: "Failed to decrypt" });
      }
    }

    setDecrypted(results);
  }

  function downloadJson() {
    if (!decrypted.length) return;
    const payload = decrypted.map((item) => ({
      blobId: item.blobId,
      data: item.data,
    }));
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `cipherwhisp-${formId}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function renderDecrypted(item: DecryptedItem) {
    const data = item.data;

    // If we do not have schema or data is not an object, just dump JSON
    if (!schema || typeof data !== "object" || data === null) {
      return (
        <pre className="text-xs whitespace-pre-wrap">
          {typeof data === "string" ? data : JSON.stringify(data, null, 2)}
        </pre>
      );
    }

    const knownFields = schema.fields;
    const usedKeys = new Set<string>();

    return (
      <div className="space-y-2">
        {knownFields.map((field) => {
          usedKeys.add(field.id);
          const v = (data as Record<string, any>)[field.id];
          return (
            <div key={field.id}>
              <p className="text-xs font-semibold text-gray-300">{field.label}</p>
              <p className="text-sm text-gray-100 break-words">
                {v === undefined || v === null || v === ""
                  ? "Not provided"
                  : Array.isArray(v)
                  ? v.join(", ")
                  : String(v)}
              </p>
            </div>
          );
        })}

        {/* Any extra keys that are not in schema */}
        {Object.entries(data as Record<string, any>)
          .filter(([key]) => !usedKeys.has(key))
          .map(([key, v]) => (
            <div key={key}>
              <p className="text-xs font-semibold text-gray-300">{key}</p>
              <p className="text-sm text-gray-100 break-words">
                {Array.isArray(v) ? v.join(", ") : String(v)}
              </p>
            </div>
          ))}
      </div>
    );
  }

  return (
    <main className="min-h-screen p-8 max-w-4xl mx-auto text-gray-100">
      <h1 className="text-3xl font-bold mb-2">Admin Inbox</h1>
      <p className="text-gray-400 mb-4 text-sm">Form ID: {formId}</p>

      {/* Private key input */}
      <div className="mb-6">
        <label className="block mb-2 font-medium">Admin private key</label>
        <textarea
          className="w-full h-40 bg-black border border-gray-700 p-2 rounded text-xs font-mono"
          value={privateKey}
          onChange={(e) => setPrivateKey(e.target.value)}
        />
        <button
          className="mt-2 px-3 py-1 border border-gray-600 rounded hover:bg-gray-800 text-sm"
          onClick={() => importPrivateKey(privateKey)}
        >
          Load key
        </button>
      </div>

      {/* Actions */}
      {cryptoKey && (
        <div className="mb-6 flex flex-wrap gap-3">
          <button
            className="px-3 py-2 border border-gray-600 rounded hover:bg-gray-800 text-sm"
            onClick={fetchEncrypted}
          >
            Fetch encrypted submissions
          </button>

          <button
            className="px-3 py-2 border border-gray-600 rounded hover:bg-gray-800 text-sm disabled:opacity-40"
            onClick={decryptAll}
            disabled={submissions.length === 0}
          >
            Decrypt all
          </button>

          <button
            className="px-3 py-2 border border-gray-600 rounded hover:bg-gray-800 text-sm disabled:opacity-40"
            onClick={downloadJson}
            disabled={decrypted.length === 0}
          >
            Download JSON
          </button>
        </div>
      )}

      {loading && <p className="text-gray-400 text-sm">Loading...</p>}
      {error && <p className="text-red-500 text-sm">{error}</p>}

      {/* Decrypted output */}
      {decrypted.length > 0 && (
        <section className="mt-6 space-y-4">
          <h2 className="text-xl font-semibold">Decrypted reports</h2>

          {decrypted.map((item) => (
            <div
              key={item.blobId}
              className="border border-gray-700 rounded p-4 bg-black/60"
            >
              <p className="text-xs text-gray-400 mb-2">
                Blob ID: <span className="font-mono break-all">{item.blobId}</span>
              </p>
              {renderDecrypted(item)}
            </div>
          ))}
        </section>
      )}
    </main>
  );
}
