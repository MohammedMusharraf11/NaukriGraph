from langchain_core.prompts import ChatPromptTemplate
from state import State
from utils import extract_json_from_response
import json

def make_parse_text_node(llm):
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
        try:
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
    return parse_text

def make_categorize_experience_node(llm):
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
    return categorize_experience

def make_assess_skillset_node(llm):
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
    return assess_skillset

def schedule_hr_interview(state: State) -> State:
    print("\nScheduling the interview...")
    return {"response": f"Candidate has been shortlisted for an HR interview. Email has been sent to {state['email']}"}

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
