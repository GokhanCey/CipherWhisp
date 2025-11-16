# CipherWhisp

CipherWhisp is a privacy first reporting tool built for the Walrus ecosystem.  
People can submit sensitive reports without logging in and without revealing their identity.  
Plaintext never touches the server. Encrypted blobs live on Walrus.

---

## What it actually does

- Lets an organization create an anonymous report form
- Generates an RSA keypair in the browser for that form
- Encrypts every submission in the browser with the public key
- Stores the encrypted payload as a blob on Walrus testnet
- Lets the form owner pull blobs from Walrus and decrypt them locally with the private key

Walrus is the persistence layer and proof that the stored report has not been tampered with.

---

## Where Walrus fits in

- We talk to the Walrus **publisher** to store encrypted blobs
- We use the Walrus **aggregator** API to read blobs back by id
- The backend never sees plaintext, only base64 encrypted payloads and Walrus blob ids
- For the hackathon this runs on Walrus **testnet**, but nothing blocks a move to mainnet

So the flow is:

Browser encryption → FastAPI → Walrus publisher → Walrus blob id  
Admin inbox → FastAPI → Walrus aggregator → browser decryption.

---

## Project layout

```txt
backend/
  main.py           FastAPI app
                    - create form
                    - send encrypted data to Walrus publisher
                    - fetch blobs from Walrus aggregator

frontend/
  app/              Next.js app
    page.tsx        Landing page
    create/         Form builder and key generation
    f/[formId]/     Public submission page
    admin/[formId]/ Admin inbox and decryption view
```

## Run it locally

Backend

```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

Frontend

```bash
cd frontend
npm install
npm run dev
```

Then open:

- http://localhost:3000 for the landing page
- http://localhost:3000/create to make a new form.

The frontend expects the backend on http://localhost:8000

---

## Why this is interesting for Walrus

- Shows an end to end use of Walrus as an encrypted reporting datastore
- Blobs are immutable per id, so admins can trust that reports were not edited later
- The app is fully off chain from the user point of view, but still benefits from Walrus durability
- It is a concrete example of how to build privacy oriented apps on top of Walrus without forcing wallets or on chain accounts on end users

---

## Links

- Demo video (placeholder): https://youtube.com/your-demo-video
- Website (placeholder): https://cipherwhisp.com
