from fastapi import FastAPI
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
import re
from faker import Faker

app = FastAPI()
faker = Faker()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class TextRequest(BaseModel):
    text: str

def detect_basic_pii(text):
    """Basic PII detection including Singapore names and phone numbers"""
    entities = []
    
    # Email detection
    email_pattern = r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b'
    for match in re.finditer(email_pattern, text):
        entities.append({
            "start": match.start(),
            "end": match.end(),
            "entity_group": "EMAIL",
            "confidence": 0.9
        })
    
    # Singapore phone number patterns
    phone_patterns = [
        r'\b[89]\d{7}\b',  # 8-digit Singapore mobile (92124222, 81234567)
        r'\+65\s*[6]\d{3}\s*\d{4}\b',  # Singapore landline with country code
        r'\+65\s*[89]\d{3}\s*\d{4}\b',  # Singapore mobile with country code
        r'\b\d{3}-\d{3}-\d{4}\b',  # US format
        r'\b\d{4}\s*\d{4}\b'  # 4-4 digit format
    ]
    
    for pattern in phone_patterns:
        for match in re.finditer(pattern, text):
            entities.append({
                "start": match.start(),
                "end": match.end(),
                "entity_group": "PHONE",
                "confidence": 0.8
            })
    
    # Singapore-style name patterns (case-insensitive)
    name_patterns = [
        # Names after "I'm" or "I am" - capture group extracts just the name
        (r'(?:I\'m|I am)\s+([a-zA-Z]{3,12}(?:\s+[a-zA-Z]{3,12}){0,2})', True),
        # Names after "My name is" - capture group extracts just the name  
        (r'(?:my name is|name is)\s+([a-zA-Z]{3,12}(?:\s+[a-zA-Z]{3,12}){0,2})', True),
        # Names after greetings - capture group extracts just the name
        (r'(?:Hi|Hello|Hey)\s+([a-zA-Z]{3,12}(?:\s+[a-zA-Z]{3,12}){0,2})', True),
        # Direct multi-part names: "sally wong", "lim jun jie" (2-3 parts)
        (r'\b[a-zA-Z]{3,8}\s+[a-zA-Z]{3,8}(?:\s+[a-zA-Z]{3,8})?\b', False),
        # Single names in certain contexts (more restrictive)
        (r'\b[a-zA-Z]{4,12}\b', True)  # Single names, any case
    ]
    
    for pattern_data in name_patterns:
        pattern, has_capture_group = pattern_data
        for match in re.finditer(pattern, text, re.IGNORECASE):
            # Get the name part (might be in capture group)
            if has_capture_group and match.groups() and match.group(1):
                name_text = match.group(1)
                start_pos = match.start(1)
                end_pos = match.end(1)
            else:
                name_text = match.group(0)
                start_pos = match.start()
                end_pos = match.end()
            
            # Filter false positives
            name_lower = name_text.lower().strip()
            false_positives = [
                'thank you', 'good morning', 'good afternoon', 'good evening', 'good night',
                'how are', 'nice to', 'see you', 'talk to', 'speak to', 'email me',
                'user name', 'full name', 'first name', 'last name', 'display name',
                'united states', 'new york', 'hong kong',
                # Common single words that aren't names
                'the', 'and', 'but', 'for', 'with', 'you', 'are', 'can', 'will', 'have',
                'this', 'that', 'what', 'when', 'where', 'why', 'how', 'who', 'which',
                'would', 'could', 'should', 'might', 'must', 'shall', 'may', 'need',
                'make', 'take', 'give', 'tell', 'ask', 'work', 'play', 'help', 'want',
                'about', 'from', 'they', 'them', 'were', 'been', 'said', 'each', 'she',
                'their', 'time', 'very', 'after', 'first', 'well', 'year', 'name'
            ]
            
            # Valid name criteria (more permissive for lowercase)
            is_valid_name = (
                len(name_lower) >= 3 and  # At least 3 characters
                not any(fp == name_lower for fp in false_positives) and  # Exact match check
                not name_text.isdigit() and
                name_text.isalpha()  # Only alphabetic characters
            )
            
            # For single names, additional validation but don't require capitalization
            if ' ' not in name_text:
                # Single names should be at least 4 characters to avoid common words
                is_valid_name = is_valid_name and len(name_text) >= 4
            
            if is_valid_name:
                entities.append({
                    "start": start_pos,
                    "end": end_pos,
                    "entity_group": "PERSON",
                    "confidence": 0.8 if ' ' in name_text else 0.6  # Lower confidence for single names
                })
    
    # SSN detection
    ssn_pattern = r'\b\d{3}-\d{2}-\d{4}\b'
    for match in re.finditer(ssn_pattern, text):
        entities.append({
            "start": match.start(),
            "end": match.end(),
            "entity_group": "SSN",
            "confidence": 0.95
        })
    
    # Remove duplicate/overlapping entities (prefer longer matches)
    entities.sort(key=lambda x: (x['start'], -(x['end'] - x['start'])))
    filtered_entities = []
    for entity in entities:
        # Check if this entity overlaps with any existing entity
        overlaps = False
        for existing in filtered_entities:
            if (entity['start'] < existing['end'] and entity['end'] > existing['start']):
                overlaps = True
                break
        if not overlaps:
            filtered_entities.append(entity)
    
    return filtered_entities

def replace_with_fake_data(results, text):
    """Replace detected entities with random fake persona details"""
    anonymized_text = text
    results_sorted = sorted(results, key=lambda x: x["start"], reverse=True)

    for item in results_sorted:
        start, end = item["start"], item["end"]
        entity_type = item["entity_group"].upper()

        if entity_type == "EMAIL":
            replacement = faker.email()
        elif entity_type == "PHONE":
            replacement = faker.phone_number()
        elif entity_type == "PERSON":
            replacement = faker.name()
        elif entity_type == "SSN":
            replacement = faker.ssn()
        else:
            replacement = f"[{entity_type}]"

        # Replace in text
        anonymized_text = anonymized_text[:start] + replacement + anonymized_text[end:]
        # Track replacement
        item["replacement"] = replacement  

    return anonymized_text, results

@app.post("/replace_with_fake")
async def replace_with_fake(request: TextRequest):
    text = request.text
    results = detect_basic_pii(text)

    anonymized_text, updated_entities = replace_with_fake_data(results, text)

    return {
        "anonymized_text": anonymized_text,
        "entities": updated_entities,
        "original_text": text
    }


@app.post("/detect_pii")
async def detect_pii(request: TextRequest):
    """
    Basic PII detection endpoint - mainly for emails, phones, SSNs.
    Frontend handles name detection and most PII logic via regex-patterns.js
    """
    text = request.text
    
    # Basic backend detection for high-confidence patterns
    results = detect_basic_pii(text)

    # Create anonymized version
    anonymized_text = text
    results_sorted = sorted(results, key=lambda x: x["start"], reverse=True)

    for item in results_sorted:
        start, end = item["start"], item["end"]
        entity = item["entity_group"].upper() 
        anonymized_text = anonymized_text[:start] + f"[{entity}]" + anonymized_text[end:]

    return {
        "anonymized_text": anonymized_text,
        "entities": results,
        "original_text": text
    }

@app.get("/")
async def root():
    return {"message": "DigitalTwin PII Detection API", "status": "active"}

