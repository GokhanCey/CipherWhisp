from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import secrets
import requests

app = FastAPI()

# --- CORS ---
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- In-memory metadata (DEV ONLY) ---
forms: dict[str, dict] = {}
submissions: dict[str, list[dict]] = {}

# --- Walrus Publisher / Aggregator (Testnet) ---
PUBLISHER_BASE = "https://publisher.walrus-testnet.walrus.space"
AGGREGATOR_BASE = "https://aggregator.walrus-testnet.walrus.space"

# --- Models ---
class CreateFormRequest(BaseModel):
    publicKey: str
    schema: dict

class CreateFormResponse(BaseModel):
    formId: str
    adminLink: str
    submitLink: str

class SubmitRequest(BaseModel):
    encrypted: str


# --- Walrus Upload ---
def walrus_upload(encrypted_str: str) -> str:
    """
    Store encrypted_str as a Walrus blob.
    Returns Walrus blobId (used later with the aggregator).
    """
    blob_bytes = encrypted_str.encode("utf-8")
    url = f"{PUBLISHER_BASE}/v1/blobs?epochs=1&permanent=true"

    try:
        resp = requests.put(url, data=blob_bytes, timeout=30)
    except requests.RequestException as e:
        print("Walrus upload network error:", e)
        raise HTTPException(status_code=500, detail="walrus upload network error")

    if resp.status_code != 200:
        print("Walrus upload error:", resp.status_code, resp.text)
        raise HTTPException(status_code=500, detail="walrus upload failed")

    try:
        j = resp.json()
    except ValueError:
        print("Walrus upload non-JSON response:", resp.text[:200])
        raise HTTPException(status_code=500, detail="walrus upload bad response")

    # Two possible shapes: newlyCreated or alreadyCertified
    if "newlyCreated" in j:
        return j["newlyCreated"]["blobObject"]["blobId"]
    if "alreadyCertified" in j:
        return j["alreadyCertified"]["blobId"]

    print("Walrus upload missing blobId:", j)
    raise HTTPException(status_code=500, detail="walrus upload missing blobId")


# --- Walrus Fetch ---
def walrus_fetch(blob_id: str) -> str:
    """
    Download blob contents from Walrus aggregator by blobId.
    Returns UTF-8 string (we only store JSON text).
    """
    url = f"{AGGREGATOR_BASE}/v1/blobs/{blob_id}"

    try:
        resp = requests.get(url, timeout=30)
    except requests.RequestException as e:
        print("Walrus fetch network error:", e)
        raise HTTPException(status_code=500, detail="walrus fetch network error")

    if resp.status_code != 200:
        print("Walrus fetch error:", resp.status_code, resp.text[:200])
        raise HTTPException(status_code=500, detail="walrus fetch failed")

    # We always store UTF-8 text
    return resp.content.decode("utf-8")


# --- Routes ---

@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/create-form", response_model=CreateFormResponse)
def create_form(data: CreateFormRequest):
    form_id = secrets.token_hex(16)

    forms[form_id] = {
        "publicKey": data.publicKey,
        "schema": data.schema,
    }

    submissions[form_id] = []

    return CreateFormResponse(
        formId=form_id,
        adminLink=f"/admin/{form_id}",
        submitLink=f"/f/{form_id}",
    )


@app.post("/submit/{formId}")
def submit(formId: str, data: SubmitRequest):
    if formId not in forms:
        raise HTTPException(status_code=404, detail="form not found")

    # 1) upload encrypted payload to Walrus
    blob_id = walrus_upload(data.encrypted)

    # 2) only store the blobId in our metadata
    submissions[formId].append({"blobId": blob_id})

    return {"status": "stored", "blobId": blob_id}


@app.get("/submissions/{formId}")
def list_submissions(formId: str):
    if formId not in submissions:
        raise HTTPException(status_code=404, detail="form not found")

    result = []
    for item in submissions[formId]:
        blob_id = item["blobId"]
        encrypted = walrus_fetch(blob_id)
        result.append({"blobId": blob_id, "encrypted": encrypted})

    return result


@app.get("/form/{formId}")
def get_form(formId: str):
    if formId not in forms:
        raise HTTPException(status_code=404, detail="form not found")

    return forms[formId]
