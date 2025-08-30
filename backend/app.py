from fastapi import FastAPI
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
import re
from faker import Faker
from typing import Optional, Dict

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
    enabled_labels: Optional[Dict[str, bool]] = None

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
    
    # Comprehensive Singapore phone number patterns
    phone_patterns = [
        # Singapore mobile numbers (8/9 prefix)
        r'\b[89]\d{7}\b',  # 8-digit mobile: 92124222, 81234567
        r'\b[89]\d{3}[-\s]\d{4}\b',  # With separator: 9212-4222, 8123 4567
        
        # Singapore landline numbers (6 prefix)
        r'\b6\d{7}\b',  # 8-digit landline: 61234567
        r'\b6\d{3}[-\s]\d{4}\b',  # With separator: 6123-4567, 6123 4567
        
        # With Singapore country code (+65)
        r'\+65[-\s]?[689]\d{3}[-\s]?\d{4}\b',  # +65-6123-4567, +65 9212 4222
        r'\+65[-\s]?\d{8}\b',  # +65-92124222, +65 61234567
        
        # Parentheses format
        r'\(\+65\)[-\s]?[689]\d{3}[-\s]?\d{4}\b',  # (+65) 9212-4222
        r'\b\([89]\d{3}\)[-\s]?\d{4}\b',  # (9212) 4222
        
        # International format variations  
        r'\b65[-\s][689]\d{3}[-\s]\d{4}\b',  # 65-9212-4222, 65 6123 4567
        
        # Toll-free and special numbers
        r'\b1800[-\s]?\d{3}[-\s]?\d{4}\b',  # 1800-123-4567 (toll-free)
        r'\b800[-\s]?\d{3}[-\s]?\d{4}\b',  # 800-123-4567
        
        # With extension
        r'\b[689]\d{7}[-\s]?(?:ext|extension|x)[-\s]?\d{2,4}\b'  # 61234567 ext 123
    ]
    
    for pattern in phone_patterns:
        for match in re.finditer(pattern, text):
            entities.append({
                "start": match.start(),
                "end": match.end(),
                "entity_group": "PHONE",
                "confidence": 0.8
            })
    
    # Singapore name patterns with surname recognition
    singapore_surnames = [
        # Most common Chinese surnames in Singapore
        'tan', 'lim', 'lee', 'ng', 'ong', 'wong', 'goh', 'teo', 'lau', 'sia',
        'chan', 'chen', 'chong', 'chua', 'gan', 'ho', 'koh', 'low', 'neo', 'seah',
        'soh', 'tay', 'toh', 'wee', 'yap', 'yeo', 'yeoh', 'yong', 'yu', 'chin',
        'chew', 'foo', 'heng', 'hong', 'hoo', 'koo', 'lam', 'leong', 'loo', 'mok',
        'sim', 'sng', 'soo', 'thong', 'tong', 'wang', 'woo', 'yak', 'yam', 'yang',
        # Additional common Chinese given names also used as surnames
        'li', 'wei', 'ming', 'jun', 'jie', 'hui', 'bin', 'han', 'yang', 'xin',
        # Common Malay surnames
        'ahmad', 'hassan', 'ibrahim', 'ismail', 'mohamed', 'mohammad', 'rahman', 'ali',
        'omar', 'osman', 'salleh', 'abdullah', 'adam', 'hamid', 'hussain', 'rashid',
        # Common Indian surnames
        'singh', 'kumar', 'raj', 'rajan', 'krishnan', 'murugan', 'nathan', 'ravi',
        'samy', 'devi', 'lakshmanan', 'suresh', 'prakash', 'menon', 'nair', 'pillai',
        # Common Western surnames in Singapore
        'smith', 'johnson', 'williams', 'brown', 'jones', 'garcia', 'miller', 'davis'
    ]
    
    name_patterns = [
        # Names after "I'm" or "I am" - capture group extracts just the name (case-insensitive)
        (r'(?:I\'m|I am)\s+([A-Z][a-z]{1,12}(?:\s+[A-Z][a-z]{1,12}){0,3})', True),
        # Names after "My name is" - capture group extracts just the name (case-insensitive), stop before "and"
        (r'(?:my name is|name is)\s+([A-Z][a-z]{1,12}(?:\s+[A-Z][a-z]{1,12})*?)(?=\s+and|\s+or|$|\.|,)', True),
        # Names after greetings - capture group extracts just the name (2-4 parts)
        (r'(?:Hi|Hello|Hey|Meet)\s+([A-Z][a-z]{1,12}\s+[A-Z][a-z]{1,12}(?:\s+[A-Z][a-z]{1,12})?(?:\s+[A-Z][a-z]{1,12})?)', True),
        # Names starting with Singapore surnames (case-insensitive) - capture full name
        (r'\b((?:' + '|'.join([s.capitalize() for s in singapore_surnames]) + r')\s+[A-Z][a-z]{1,12}(?:\s+[A-Z][a-z]{1,12})?)\b', True),
        # Standalone names with proper capitalization and Singapore context
        (r'\b[A-Z][a-z]{1,12}\s+(?:' + '|'.join([s.capitalize() for s in singapore_surnames]) + r')\b', False)
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
            
            # Comprehensive false positive filtering
            name_lower = name_text.lower().strip()
            false_positives = [
                # Common phrases
                'thank you', 'good morning', 'good afternoon', 'good evening', 'good night',
                'how are', 'nice to', 'see you', 'talk to', 'speak to', 'email me',
                'phone number', 'mobile number', 'contact number', 'telephone number',
                'user name', 'full name', 'first name', 'last name', 'display name',
                'company name', 'business name', 'file name', 'folder name',
                # Geographic locations
                'united states', 'new york', 'hong kong', 'kuala lumpur', 'penang',
                'johor bahru', 'singapore city', 'orchard road', 'marina bay',
                # Time and date related
                'today', 'tomorrow', 'yesterday', 'monday', 'tuesday', 'wednesday', 
                'thursday', 'friday', 'saturday', 'sunday', 'january', 'february',
                'march', 'april', 'june', 'july', 'august', 'september', 'october',
                'november', 'december', 'morning', 'afternoon', 'evening', 'night',
                # Common words and fillers
                'the', 'and', 'but', 'for', 'with', 'you', 'are', 'can', 'will', 'have',
                'this', 'that', 'what', 'when', 'where', 'why', 'how', 'who', 'which',
                'would', 'could', 'should', 'might', 'must', 'shall', 'may', 'need',
                'make', 'take', 'give', 'tell', 'ask', 'work', 'play', 'help', 'want',
                'about', 'from', 'they', 'them', 'were', 'been', 'said', 'each', 'she',
                'their', 'time', 'very', 'after', 'first', 'well', 'year', 'name',
                # Technology and business terms
                'email', 'password', 'account', 'login', 'logout', 'signin', 'signup',
                'website', 'internet', 'google', 'facebook', 'twitter', 'instagram',
                'whatsapp', 'telegram', 'linkedin', 'youtube', 'microsoft', 'apple',
                # Singapore context that aren't names
                'singapore', 'nric', 'passport', 'address', 'postal code', 'zip code',
                'street', 'road', 'avenue', 'lane', 'block', 'unit', 'floor'
            ]
            
            # More flexible validation for Singapore names
            is_valid_name = (
                len(name_lower) >= 3 and  # At least 3 characters
                not any(fp == name_lower for fp in false_positives) and  # Exact match check (not contains)
                not name_text.isdigit() and
                name_text.replace(' ', '').isalpha() and  # Only alphabetic characters and spaces
                (' ' in name_text or len(name_text.split()) == 1) and  # Single names OK for contextual matches
                len(name_text.split()) >= 1 and  # Must have at least 1 part  
                len(name_text.split()) <= 4  # Maximum 4 parts
            )
            
            
            # Check for common non-name patterns but be less strict
            if is_valid_name:
                name_parts = name_text.split()
                for part in name_parts:
                    # Each part must be 1-15 characters (more flexible)
                    if len(part) < 1 or len(part) > 15:
                        is_valid_name = False
                        break
                
                # Check if it's likely a person name vs. common phrase
                likely_name_indicators = [
                    # Has common Singapore surnames as exact word match
                    any(surname == part.lower() for surname in singapore_surnames for part in name_parts),
                    # Proper capitalization pattern
                    all(part[0].isupper() for part in name_parts if len(part) > 0),
                    # Not all parts are common English words
                    not all(part.lower() in ['the', 'and', 'of', 'to', 'a', 'in', 'for', 'is', 'on', 'that', 'by', 'this', 'with', 'you', 'it', 'not', 'or', 'be', 'are', 'was', 'born', 'my', 'name', 'phone', 'number', 'email', 'address'] for part in name_parts)
                ]
                
                # If it doesn't have any indicators, be more strict about false positives
                if not any(likely_name_indicators):
                    # More comprehensive false positive check for non-obvious names
                    extended_false_positives = [
                        'phone number', 'mobile number', 'email address', 'today tomorrow',
                        'good morning', 'thank you', 'how are', 'see you', 'talk to'
                    ]
                    if any(fp in name_lower for fp in extended_false_positives):
                        is_valid_name = False
            
            if is_valid_name:
                entities.append({
                    "start": start_pos,
                    "end": end_pos,
                    "entity_group": "PERSON",
                    "confidence": 0.8 if ' ' in name_text else 0.6  # Lower confidence for single names
                })
    
    # Comprehensive PII patterns (Singapore-focused)
    
    # Singapore NRIC (National Registration Identity Card)
    nric_patterns = [
        r'\b[STFG]\d{7}[A-Z]\b',  # Standard Singapore NRIC format (S1234567A)
        r'\b[stfg]\d{7}[a-z]\b',  # Lowercase version
        r'\b[STFGstfg]\d{7}[A-Za-z]\b'  # Mixed case
    ]
    for pattern in nric_patterns:
        for match in re.finditer(pattern, text):
            entities.append({
                "start": match.start(),
                "end": match.end(),
                "entity_group": "NRIC",
                "confidence": 0.95
            })
    
    # Comprehensive credit card patterns
    credit_card_patterns = [
        # Visa (starts with 4, 16 digits)
        r'\b4\d{3}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b',  # 4123-4567-8901-2345
        r'\b4\d{15}\b',  # 4123456789012345 (no separators)
        
        # Mastercard (starts with 5, 16 digits)
        r'\b5[1-5]\d{2}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b',  # 5123-4567-8901-2345
        r'\b5[1-5]\d{14}\b',  # 5123456789012345
        
        # American Express (starts with 34/37, 15 digits)
        r'\b3[47]\d{2}[-\s]?\d{6}[-\s]?\d{5}\b',  # 3712-345678-90123
        r'\b3[47]\d{13}\b',  # 371234567890123
        
        # Discover (starts with 6, 16 digits)
        r'\b6(?:011|5\d{2})[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b',  # 6011-1234-5678-9012
        r'\b6(?:011|5\d{2})\d{12}\b',  # 6011123456789012
        
        # Generic patterns (various lengths)
        r'\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b',  # 16-digit with separators
        r'\b\d{4}[-\s]?\d{6}[-\s]?\d{5}\b',  # 15-digit with separators
        r'\b\d{16}\b',  # 16 consecutive digits
        r'\b\d{15}\b',  # 15 consecutive digits
        
        # With dots as separators
        r'\b\d{4}\.\d{4}\.\d{4}\.\d{4}\b',  # 4123.4567.8901.2345
        r'\b\d{4}\.\d{6}\.\d{5}\b'  # 3712.345678.90123
    ]
    for pattern in credit_card_patterns:
        for match in re.finditer(pattern, text):
            entities.append({
                "start": match.start(),
                "end": match.end(),
                "entity_group": "CREDIT_CARD",
                "confidence": 0.9
            })
    
    # Singapore Driver's License Numbers
    license_patterns = [
        r'\b[A-Z]\d{7,8}[A-Z]?\b',  # Singapore format similar to NRIC but for licenses
        r'\bSPDL\d{6,8}\b'  # Singapore Police Driving License format (if applicable)
    ]
    for pattern in license_patterns:
        for match in re.finditer(pattern, text):
            # Additional context check for driver's license
            context_before = text[max(0, match.start()-25):match.start()].lower()
            context_after = text[match.end():match.end()+25].lower()
            if any(term in context_before + context_after for term in ['license', 'licence', 'dl', 'driver', 'driving', 'singapore']):
                entities.append({
                    "start": match.start(),
                    "end": match.end(),
                    "entity_group": "DRIVER_LICENSE",
                    "confidence": 0.85
                })
    
    # Bank Account Numbers
    bank_patterns = [
        r'\b\d{8,17}\b',  # 8-17 digit account numbers
        r'\b\d{4}[-\s]\d{4}[-\s]\d{4}[-\s]\d{4,8}\b'  # Formatted account numbers
    ]
    for pattern in bank_patterns:
        for match in re.finditer(pattern, text):
            context_before = text[max(0, match.start()-30):match.start()].lower()
            context_after = text[match.end():match.end()+30].lower()
            if any(term in context_before + context_after for term in ['account', 'bank', 'routing', 'iban']):
                entities.append({
                    "start": match.start(),
                    "end": match.end(),
                    "entity_group": "BANK_ACCOUNT",
                    "confidence": 0.8
                })
    
    # Comprehensive Singapore address patterns
    address_patterns = [
        # Singapore street addresses with various formats
        r'\b\d{1,4}[A-Z]?\s+[A-Za-z0-9\s]{2,50}\s+(Road|Rd|Street|St|Avenue|Ave|Drive|Dr|Lane|Ln|Close|Crescent|Walk|Park|Gardens?|Heights?|View|Terrace|Place|Plaza|Way|Circuit|Link|Grove)\b',
        
        # HDB block addresses - various formats
        r'\b(?:Blk|Block)\s+\d{1,4}[A-Z]?\s+[A-Za-z0-9\s]{3,50}(?:\s+(?:Street|St|Road|Rd|Avenue|Ave|Lane|Ln|Drive|Dr|Close|Crescent|Walk))?\b',
        r'\b(?:Block|Blk)\.?\s+\d{1,4}[A-Z]?,?\s+[A-Za-z0-9\s,]{5,60}\b',
        
        # With unit numbers - various formats
        r'\b\d{1,4}[A-Z]?\s+[A-Za-z0-9\s]{2,40}\s+(?:Road|Rd|Street|St|Avenue|Ave|Drive|Dr)\s*[,]?\s*#\d{2}-\d{2,4}\b',
        r'\b\d{1,4}[A-Z]?\s+[A-Za-z0-9\s]{2,40}\s+(?:Road|Rd|Street|St|Avenue|Ave)\s*[,]?\s*(?:Unit|Apt|Apartment)\s*\d{1,4}[-]?\d{0,4}\b',
        r'\b\d{1,4}[A-Z]?\s+[A-Za-z0-9\s]{2,40}\s+(?:Road|Rd|Street|St|Avenue|Ave)\s*[,]?\s*Level\s*\d{1,3}\b',
        
        # Shopping centers and buildings
        r'\b[A-Za-z0-9\s]{3,40}\s+(?:Shopping Centre|Shopping Center|Mall|Tower|Building|Complex|Plaza|Centre|Center)\b',
        r'\b\d{1,4}[A-Z]?\s+[A-Za-z0-9\s]{3,40}\s+(?:Building|Tower|Centre|Center|Complex)\b',
        
        # Condominium and private housing
        r'\b[A-Za-z0-9\s]{3,50}\s+(?:Condominium|Condo|Residences?|Court|Manor|Villa|Estate)\b',
        
        # PO Box variations
        r'\b(?:P\.?O\.?\s*Box|Post\s+Office\s+Box|POB)\s+\d{1,6}\b',
        
        # Singapore iconic locations
        r'\b\d{1,4}[A-Z]?\s+(?:Marina\s+Bay\s+Sands|Raffles\s+Place|Orchard\s+Road|Sentosa|Clarke\s+Quay|Boat\s+Quay|Chinatown|Little\s+India)\b',
        
        # General format with comma separation
        r'\b\d{1,4}[A-Z]?\s+[A-Za-z0-9\s]{5,50},\s+[A-Za-z\s]{3,30},?\s+Singapore\b'
    ]
    for pattern in address_patterns:
        for match in re.finditer(pattern, text, re.IGNORECASE):
            entities.append({
                "start": match.start(),
                "end": match.end(),
                "entity_group": "ADDRESS",
                "confidence": 0.85
            })
    
    # Singapore postal codes (6-digit format)
    postal_patterns = [
        r'\b\d{6}\b',  # Singapore postal codes (098765)
        r'\bSingapore\s+\d{6}\b'  # "Singapore 098765" format
    ]
    for pattern in postal_patterns:
        for match in re.finditer(pattern, text, re.IGNORECASE):
            # For Singapore, be more lenient with postal code detection
            postal_code = match.group(0)
            if 'Singapore' in postal_code:
                # Extract just the 6-digit code
                digits_match = re.search(r'\d{6}', postal_code)
                if digits_match:
                    start_pos = match.start() + digits_match.start()
                    end_pos = match.start() + digits_match.end()
                else:
                    start_pos = match.start()
                    end_pos = match.end()
            else:
                # Context check for standalone 6-digit numbers
                context_before = text[max(0, match.start()-25):match.start()].lower()
                context_after = text[match.end():match.end()+25].lower()
                context_indicators = ['postal', 'code', 'singapore', 'address', 'zip']
                if not any(term in context_before + context_after for term in context_indicators):
                    continue  # Skip if no context indicators
                start_pos = match.start()
                end_pos = match.end()
            
            entities.append({
                "start": start_pos,
                "end": end_pos,
                "entity_group": "POSTAL_CODE",
                "confidence": 0.85
            })
    
    # Comprehensive date patterns for birth dates
    dob_patterns = [
        # Numeric formats
        r'\b\d{1,2}/\d{1,2}/\d{4}\b',  # DD/MM/YYYY or MM/DD/YYYY
        r'\b\d{1,2}-\d{1,2}-\d{4}\b',  # DD-MM-YYYY or MM-DD-YYYY
        r'\b\d{4}/\d{1,2}/\d{1,2}\b',  # YYYY/MM/DD
        r'\b\d{4}-\d{1,2}-\d{1,2}\b',  # YYYY-MM-DD
        r'\b\d{1,2}\.\d{1,2}\.\d{4}\b',  # DD.MM.YYYY
        
        # Written month formats (full names)
        r'\b(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},?\s+\d{4}\b',  # January 15, 1990
        r'\b\d{1,2}\s+(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{4}\b',  # 15 January 1990
        
        # Abbreviated month formats
        r'\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)\.?\s+\d{1,2},?\s+\d{4}\b',  # Jan 15, 1990 or Jan. 15, 1990
        r'\b\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)\.?\s+\d{4}\b',  # 15 Jan 1990 or 15 Jan. 1990
        
        # Ordinal date formats
        r'\b(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2}(?:st|nd|rd|th),?\s+\d{4}\b',  # January 1st, 1990
        r'\b\d{1,2}(?:st|nd|rd|th)\s+(?:of\s+)?(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{4}\b',  # 1st of January 1990
        
        # Casual date formats
        r'\b(?:born\s+(?:on\s+)?)(\d{1,2}\s+(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{4})\b',  # born on 1 January 1990
        r'\b(?:birthday\s+(?:is\s+)?(?:on\s+)?)(\d{1,2}/\d{1,2}/\d{4})\b'  # birthday is on 01/01/1990
    ]
    for pattern in dob_patterns:
        for match in re.finditer(pattern, text, re.IGNORECASE):
            context_before = text[max(0, match.start()-30):match.start()].lower()
            context_after = text[match.end():match.end()+30].lower()
            if any(term in context_before + context_after for term in ['birth', 'born', 'dob', 'birthday']):
                entities.append({
                    "start": match.start(),
                    "end": match.end(),
                    "entity_group": "DATE_OF_BIRTH",
                    "confidence": 0.85
                })
    
    # Singapore Work Pass and Foreign ID Numbers
    foreign_id_patterns = [
        r'\b[FGM]\d{7}[A-Z]\b',  # Foreign ID in Singapore (F1234567A, G1234567B, M1234567C)
        r'\bWP\d{8}\b',  # Work Permit numbers
        r'\bEP\d{8}\b',  # Employment Pass numbers
        r'\bDP\d{8}\b'   # Dependant Pass numbers
    ]
    for pattern in foreign_id_patterns:
        for match in re.finditer(pattern, text):
            context_before = text[max(0, match.start()-25):match.start()].lower()
            context_after = text[match.end():match.end()+25].lower()
            if any(term in context_before + context_after for term in ['id', 'identity', 'card', 'work', 'permit', 'pass', 'employment', 'singapore']):
                entities.append({
                    "start": match.start(),
                    "end": match.end(),
                    "entity_group": "WORK_PASS",
                    "confidence": 0.85
                })
    
    # Tax Numbers
    tax_patterns = [
        r'\b\d{2}-\d{7}\b',  # EIN format
        r'\b\d{3}-\d{2}-\d{4}\b'  # Also catches SSN used as tax ID
    ]
    for pattern in tax_patterns:
        for match in re.finditer(pattern, text):
            context_before = text[max(0, match.start()-20):match.start()].lower()
            context_after = text[match.end():match.end()+20].lower()
            if any(term in context_before + context_after for term in ['tax', 'ein', 'itin']):
                entities.append({
                    "start": match.start(),
                    "end": match.end(),
                    "entity_group": "TAX_NUMBER",
                    "confidence": 0.85
                })
    
    # Passwords (basic patterns - look for context)
    password_patterns = [
        r'(?:password|pwd|pass)\s*[:=]\s*([A-Za-z0-9@#$%^&*!]{6,})',
        r'(?:password|pwd|pass)\s+is\s+([A-Za-z0-9@#$%^&*!]{6,})'
    ]
    for pattern in password_patterns:
        for match in re.finditer(pattern, text, re.IGNORECASE):
            # Extract just the password part
            password_text = match.group(1)
            password_start = match.start(1)
            password_end = match.end(1)
            entities.append({
                "start": password_start,
                "end": password_end,
                "entity_group": "PASSWORD",
                "confidence": 0.9
            })
    
    # Remove duplicate/overlapping entities (prefer longer, more specific matches)
    entities.sort(key=lambda x: (-(x['end'] - x['start']), x['start']))  # Sort by length desc, then start pos
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
    
    # Final sort by position for consistent output
    filtered_entities.sort(key=lambda x: x['start'])
    
    return filtered_entities

def replace_with_fake_data(results, text, enabled_labels=None):
    """Replace detected entities with fake data only if enabled"""
    if enabled_labels is None:
        enabled_labels = {}  

    anonymized_text = text
    results_sorted = sorted(results, key=lambda x: x["start"], reverse=True)

    for item in results_sorted:
        entity_type = item["entity_group"].upper()
        if not enabled_labels.get(entity_type, True):
            continue 

        start, end = item["start"], item["end"]

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

        anonymized_text = anonymized_text[:start] + replacement + anonymized_text[end:]
        item["replacement"] = replacement

    return anonymized_text, results


@app.post("/replace_with_fake")
async def replace_with_fake(request: TextRequest):
    text = request.text
    enabled_labels = request.enabled_labels 
    results = detect_basic_pii(text)

    anonymized_text, updated_entities = replace_with_fake_data(
        results, text, enabled_labels
    )

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

