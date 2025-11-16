"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function HomePage() {
  const router = useRouter();
  const [formIdInput, setFormIdInput] = useState("");
  const [inputError, setInputError] = useState("");

  function handleGoToReport() {
    const trimmed = formIdInput.trim();
    if (!trimmed) {
      setInputError("Paste the form ID you received.");
      return;
    }
    setInputError("");
    router.push(`/f/${trimmed}`);
  }

  return (
    <main className="min-h-screen w-full bg-neutral-950 text-gray-100 px-6 py-12 flex flex-col items-center">
      {/* HERO */}
      <section className="w-full max-w-4xl text-center mb-14">
        <p className="uppercase tracking-wider text-xs text-gray-400 mb-3">
          Sui × Walrus Hackathon
        </p>

        <h1 className="text-5xl sm:text-6xl font-extrabold mb-4">
          CipherWhisp
        </h1>

        <p className="text-base sm:text-lg text-gray-300 max-w-2xl mx-auto leading-relaxed">
          Reporting a problem should not feel dangerous. CipherWhisp lets people
          speak up safely. Reports are encrypted in the browser and stored on
          Walrus. Only the form owner can read them.
        </p>
      </section>

      {/* TWO MAIN PATHS */}
      <section className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-2 gap-8 mb-16">
        {/* ORGANIZATION CARD */}
        <div className="rounded-2xl border border-neutral-700 bg-neutral-900 p-8 flex flex-col gap-4">
          <p className="text-xs font-semibold tracking-wide text-gray-400">
            For organizations
          </p>
          <h2 className="text-2xl font-bold">Create a secure whistleblow form</h2>
          <p className="text-sm text-gray-300">
            Generate a unique form with its own encryption keys. Share the link
            with your team or community and receive reports that only you can
            decrypt.
          </p>

          <ul className="mt-2 text-sm text-gray-300 space-y-1 list-disc list-inside">
            <li>Keys generated in the browser</li>
            <li>No account or login required</li>
            <li>You keep the private key</li>
          </ul>

          <button
            onClick={() => router.push("/create")}
            className="mt-6 inline-flex items-center justify-center px-5 py-2.5 rounded-lg bg-gray-100 text-black font-medium hover:bg-white transition-colors"
          >
            Create a form
          </button>
        </div>

        {/* REPORTER CARD */}
        <div className="rounded-2xl border border-neutral-700 bg-neutral-900 p-8 flex flex-col gap-4">
          <p className="text-xs font-semibold tracking-wide text-gray-400">
            For reporters
          </p>
          <h2 className="text-2xl font-bold">Submit an anonymous report</h2>

          <p className="text-sm text-gray-300">
            If your organization shared a CipherWhisp link or form ID, paste it
            here to open the report page.
          </p>

          <label className="mt-4 text-xs font-medium text-gray-300">
            Form ID
          </label>

          <input
            value={formIdInput}
            onChange={(e) => setFormIdInput(e.target.value)}
            placeholder="Example: 4f1c9a8e2b0d4c3f..."
            className="mt-1 w-full rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm outline-none focus:border-gray-400"
          />

          {inputError && (
            <p className="text-xs text-red-400 mt-1">{inputError}</p>
          )}

          <div className="mt-5 flex flex-wrap gap-3">
            <button
              onClick={handleGoToReport}
              className="inline-flex items-center justify-center px-5 py-2.5 rounded-lg border border-gray-400 text-gray-200 font-medium hover:bg-neutral-800 transition"
            >
              Open form
            </button>
            <span className="text-xs text-gray-400 self-center">
              You’ll be taken to the submission page.
            </span>
          </div>
        </div>
      </section>

      {/* WHY SECTION */}
      <section className="w-full max-w-4xl mb-16">
        <h3 className="text-center text-xl font-semibold mb-6">
          Why teams use CipherWhisp
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 text-sm">
          <div className="rounded-xl border border-neutral-700 bg-neutral-900 p-4">
            <p className="font-medium mb-1">Real anonymity</p>
            <p className="text-gray-300">
              We never see users or plaintext data. Encryption happens entirely
              in the browser.
            </p>
          </div>

          <div className="rounded-xl border border-neutral-700 bg-neutral-900 p-4">
            <p className="font-medium mb-1">Powered by Walrus</p>
            <p className="text-gray-300">
              Encrypted blobs are stored on Walrus in the Sui ecosystem, giving
              durability and tamper-resistance.
            </p>
          </div>

          <div className="rounded-xl border border-neutral-700 bg-neutral-900 p-4">
            <p className="font-medium mb-1">Simple workflow</p>
            <p className="text-gray-300">
              One link for submissions. One private key for reading them. No
              dashboards or accounts.
            </p>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="w-full max-w-4xl text-center text-xs text-gray-500 mt-auto pt-8 border-t border-neutral-800">
        CipherWhisp is a prototype for the Sui × Walrus Hackathon.  
        All encryption happens in the browser. Keep your private key safe.
      </footer>
    </main>
  );
}
