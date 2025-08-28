from fastapi import FastAPI
from pydantic import BaseModel
from transformers import AutoTokenizer, AutoModelForTokenClassification, pipeline

app = FastAPI()

tokenizer = AutoTokenizer.from_pretrained("iiiorg/piiranha-v1-detect-personal-information")
model = AutoModelForTokenClassification.from_pretrained("iiiorg/piiranha-v1-detect-personal-information")

pii_detector = pipeline(
    "token-classification",
    model=model,
    tokenizer=tokenizer,
    aggregation_strategy="simple"
)

class TextRequest(BaseModel):
    text: str

@app.post("/detect_pii")
async def detect_pii(request: TextRequest):
    text = request.text
    results = pii_detector(text)

    results_sorted = sorted(results, key=lambda x: x["start"], reverse=True)

    for item in results_sorted:
        start, end = item["start"], item["end"]
        entity = item["entity_group"].upper() 
        text = text[:start] + f"[{entity}]" + text[end:]

    return {"anonymized_text": text}

