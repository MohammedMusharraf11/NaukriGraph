import os
import shutil
from fastapi import FastAPI, File, UploadFile, Form
from fastapi.middleware.cors import CORSMiddleware

# Import your modularized functions
from utils import get_resume_text
from graph import create_graph
from langchain_groq import ChatGroq

app = FastAPI()

# Allow CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:8080"],  # Adjust as needed for your frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize LLM and graph
llm = ChatGroq(model="llama-3.3-70b-versatile")
graph_app = create_graph(llm)

def map_backend_to_frontend(result):
    # Map skill_match to a percentage for the progress bar
    skill_map = {"Match": 100, "No Match": 0}
    # Map response to decision
    if "shortlisted" in result.get("response", "").lower():
        decision = "accept"
    elif "recruiter" in result.get("response", "").lower():
        decision = "maybe"
    else:
        decision = "reject"
    return {
        "candidate_email": result.get("email"),
        "experience_level": result.get("experience_level"),
        "skill_match": skill_map.get(result.get("skill_match"), 0),
        "decision": decision,
    }

@app.post("/screen")
async def screen_candidate(
    job_description: str = Form(...),
    resume: UploadFile = File(...)
):
    temp_path = f"temp_{resume.filename}"
    with open(temp_path, "wb") as buffer:
        shutil.copyfileobj(resume.file, buffer)
    try:
        resume_text = get_resume_text(temp_path)
        raw_result = graph_app.invoke({"resume": resume_text, "job_description": job_description})
        mapped_result = map_backend_to_frontend(raw_result)
        return {"success": True, "data": mapped_result}
    except Exception as e:
        return {"success": False, "error": str(e)}
    finally:
        os.remove(temp_path)


# To run this app, use: uvicorn main:app --reload
