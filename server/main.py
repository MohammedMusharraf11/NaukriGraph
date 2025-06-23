import os
from dotenv import load_dotenv
from langchain_groq import ChatGroq
from utils import get_resume_text
from graph import create_graph

load_dotenv()

def main():
    # Initialize LLM
    llm = ChatGroq(model="llama-3.3-70b-versatile")
    
    # Create and compile graph
    app = create_graph(llm)
    
    # Example usage
    resume_file_path = 'C:/Users/Musharraf/Downloads/Musharraf-ModernDataComp.pdf'
    job_description_text = "Entry Level Python Developer with LangChain experience"
    
    # Run screening
    resume_text = get_resume_text(resume_file_path)
    results = app.invoke({
        "resume": resume_text,
        "job_description": job_description_text
    })
    
    # Print results
    print("\nScreening Results:")
    print(f"Email: {results.get('email')}")
    print(f"Experience Level: {results.get('experience_level')}")
    print(f"Skill Match: {results.get('skill_match')}")
    print(f"Decision: {results.get('response')}")

if __name__ == "__main__":
    main()
