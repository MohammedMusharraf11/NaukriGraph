import os
import re
import json
from PyPDF2 import PdfReader
import docx

def extract_text_from_pdf(file_path):
    reader = PdfReader(file_path)
    text = "".join(page.extract_text() or "" for page in reader.pages)
    return text

def extract_text_from_docx(file_path):
    doc = docx.Document(file_path)
    text = "\n".join(paragraph.text for paragraph in doc.paragraphs)
    return text

def get_resume_text(file_path):
    ext = os.path.splitext(file_path)[1].lower()
    if ext == ".pdf":
        return extract_text_from_pdf(file_path)
    elif ext in [".docx", ".doc"]:
        return extract_text_from_docx(file_path)
    else:
        raise ValueError("Unsupported file type: " + ext)

def extract_json_from_response(response: str) -> str:
    response = response.strip()

    match = re.search(r"\{.*\}", response, re.DOTALL)
    if match:
        return match.group(0)
    return response
