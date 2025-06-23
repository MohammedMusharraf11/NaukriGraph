import os
import json
from typing_extensions import TypedDict
from dotenv import load_dotenv
import re
from langchain_core.prompts import ChatPromptTemplate
from langgraph.graph import StateGraph, START, END
from langchain_groq import ChatGroq

# For file parsing
from PyPDF2 import PdfReader
import docx

# Load environment variables (for Groq API key, etc.)
load_dotenv()

# Initialize LLM
llm = ChatGroq(model="llama-3.3-70b-versatile")

# ---- File Extraction Utilities ----

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
    """
    Extracts the first JSON object from a string, even if wrapped in markdown or with extra text.
    """
    # Remove markdown code block markers
    response = response.strip()
    # Remove leading/trailing triple backticks and `json`
    response = re.sub(r"^```(?:json)?", "", response, flags=re.IGNORECASE).strip()
    # response = re.sub(r"```

    # Try to find the first {...} block
    match = re.search(r"\{.*\}", response, re.DOTALL)
    if match:
        return match.group(0)
    return response  # fallback

# ---- LangGraph State ----

class State(TypedDict):
    resume: str
    application: str
    email: str
    job_description: str
    experience_level: str
    skill_match: str
    response: str

# ---- Nodes ----

def parse_text(state: State) -> State:
    print("\nExtracting application text and email from resume...")
    prompt = ChatPromptTemplate.from_messages([
        ("system",
         "You are a resume parsing assistant. "
         "Extract the complete application text and the candidate's email address from the following resume. "
         "Respond in JSON format with two fields: 'text' containing the application text, and 'email' containing the extracted email address. "
         "If no email is found, set 'email' to null.\n\n"
         "Resume: {resume}"
        )
    ])
    chain = prompt | llm
    response = chain.invoke({"resume": state["resume"]}).content
    # print("Parsing response:", response)
    try:
        # Extract JSON from the response
        json_str = extract_json_from_response(response)
        parsed = json.loads(json_str)
        application_text = parsed.get('text', '')
        email = parsed.get('email', None)
        print(f"Extracted email: {email}")
        return {
            **state,
            "application": application_text,
            "email": email
        }
    except Exception as e:
        print(f"JSON parsing failed: {e}. Using fallback.")
        return {
            **state,
            "application": state["resume"],
            "email": None
        }



def categorize_experience(state: State) -> State:
    print("\nCategorizing experience level...")
    prompt = ChatPromptTemplate.from_messages([
        ("system", 
         "You are an expert HR assistant. "
         "Based solely on the job application text, categorize experience as: "
         "'Entry-level', 'Mid-level', or 'Senior-level'.\n\n"
         "Application: {application}\n\n"
         "Respond with exactly one label. No explanations."
        )
    ])
    chain = prompt | llm
    experience_level = chain.invoke({"application": state["application"]}).content
    print(f"Experience Level: {experience_level}")
    return {"experience_level": experience_level}

def assess_skillset(state: State) -> State:
    print("\nAssessing skillset match...")
    prompt = ChatPromptTemplate.from_messages([
        ("system",
         "You are an expert technical recruiter. "
         "Review job description and application. "
         "Respond with exactly: 'Match' or 'No Match'.\n\n"
         "Job Description: {job_description}\n"
         "Application: {application}"
        )
    ])
    chain = prompt | llm
    skill_match = chain.invoke({
        "application": state["application"],
        "job_description": state["job_description"]
    }).content
    print(f"Skill Match: {skill_match}")
    return {"skill_match": skill_match}

def schedule_hr_interview(state: State) -> State:
    print("\nScheduling the interview...")
    return {f"response": "Candidate has been shortlisted for an HR interview. and Email has been sent to {state['email']}"}

def escalate_to_recruiter(state: State) -> State:
    print("Escalating to recruiter...")
    return {"response": "Candidate has senior-level experience but doesn't match job skills."}

def reject_application(state: State) -> State:
    print("Sending rejection email...")
    return {"response": "Candidate doesn't meet JD and has been rejected."}

def route_app(state: State) -> str:
    if state["skill_match"] == "Match":
        return "schedule_hr_interview"
    elif state["experience_level"] == "Senior-level":
        return "escalate_to_recruiter"
    else:
        return "reject_application"

# ---- Build the Graph ----

graph = StateGraph(State)
graph.add_node("parse_text", parse_text)
graph.add_node("categorize_experience", categorize_experience)
graph.add_node("assess_skillset", assess_skillset)
graph.add_node("schedule_hr_interview", schedule_hr_interview)
graph.add_node("escalate_to_recruiter", escalate_to_recruiter)
graph.add_node("reject_application", reject_application)

graph.add_edge(START, "parse_text")
graph.add_edge("parse_text", "categorize_experience")
graph.add_edge("categorize_experience", "assess_skillset")
graph.add_conditional_edges("assess_skillset", route_app)
graph.add_edge("schedule_hr_interview", END)
graph.add_edge("escalate_to_recruiter", END)
graph.add_edge("reject_application", END)

app = graph.compile()

# ---- Runner ----

def run_candidate_screening(resume_file_path: str, job_description: str):
    resume_text = get_resume_text(resume_file_path)
    results = app.invoke({
        "resume": resume_text,
        "job_description": job_description
    })
    return {
        "email": results.get("email"),
        # "application": results.get("application"),
        "experience_level": results.get("experience_level"),
        "skill_match": results.get("skill_match"),
        "response": results.get("response")
    }

# ---- Example Usage ----

if __name__ == "__main__":
    # Replace with your actual file path and JD
    resume_file_path = f'C:/Users/Musharraf/Downloads/Musharraf-ModernDataComp.pdf' # or "sample_resume.docx"
    job_description_text = "Entry Level Python Developer with LangChain experience and should have worked with Vector DBs like Pinecone."

    results = run_candidate_screening(resume_file_path, job_description_text)

    # print("\nScreening Results:")
    # print(f"Email: {results['email']}")
    # # print(f"Application: {results['application'][:200]}...")  # Print first 200 chars
    # print(f"Experience Level: {results['experience_level']}")
    # print(f"Skill Match: {results['skill_match']}")
    # print(f"Decision: {results['response']}")
