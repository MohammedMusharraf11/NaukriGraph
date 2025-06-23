from langgraph.graph import StateGraph, START, END
from state import State
from nodes import (
    make_parse_text_node,
    make_categorize_experience_node,
    make_assess_skillset_node,
    schedule_hr_interview,
    escalate_to_recruiter,
    reject_application,
    route_app
)

def create_graph(llm):
    graph = StateGraph(State)
    
    # Create nodes with LLM dependency
    parse_text = make_parse_text_node(llm)
    categorize_experience = make_categorize_experience_node(llm)
    assess_skillset = make_assess_skillset_node(llm)
    
    # Add nodes to graph
    graph.add_node("parse_text", parse_text)
    graph.add_node("categorize_experience", categorize_experience)
    graph.add_node("assess_skillset", assess_skillset)
    graph.add_node("schedule_hr_interview", schedule_hr_interview)
    graph.add_node("escalate_to_recruiter", escalate_to_recruiter)
    graph.add_node("reject_application", reject_application)

    # Define edges
    graph.add_edge(START, "parse_text")
    graph.add_edge("parse_text", "categorize_experience")
    graph.add_edge("categorize_experience", "assess_skillset")
    graph.add_conditional_edges("assess_skillset", route_app)
    graph.add_edge("schedule_hr_interview", END)
    graph.add_edge("escalate_to_recruiter", END)
    graph.add_edge("reject_application", END)

    return graph.compile()
