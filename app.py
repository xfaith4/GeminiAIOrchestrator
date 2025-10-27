import streamlit as st
import json
import os
import time

# --- Constants ---
ORCHESTRATIONS_FILE = "orchestrations.json"
SIMULATION_DELAY_SECONDS = 1  # Delay for simulated API calls

# --- Helper functions for managing orchestrations.json ---
# These are included in app.py for self-containment, consistent with the original repo's structure.

def load_orchestrations(file_path=ORCHESTRATIONS_FILE):
    """Loads orchestrations from a JSON file."""
    if os.path.exists(file_path):
        try:
            with open(file_path, 'r') as f:
                return json.load(f)
        except json.JSONDecodeError:
            st.error(f"Error reading {file_path}. Please check its JSON format.")
            return {}
    return {}

def save_orchestrations(orchestrations_dict, file_path=ORCHESTRATIONS_FILE):
    """Saves orchestrations to a JSON file."""
    try:
        with open(file_path, 'w') as f:
            json.dump(orchestrations_dict, f, indent=2)
        return True
    except IOError as e:
        st.error(f"Error saving orchestrations: {e}")
        return False

# --- Orchestration Logic (adapted from original repository's app.py) ---
# This function would contain the actual Gemini API calls.
# For this example, it uses simulated outputs.
def orchestrate(orchestration_data, provider="Gemini"):
    """
    Executes the AI orchestration defined in orchestration_data.
    Modifies st.session_state.orchestration_log directly.
    """
    st.session_state.orchestration_log = f"Starting orchestration using {provider}...\n"
    final_output = {}
    try:
        orchestration_name = orchestration_data.get("name", "Unnamed Orchestration")
        tasks = orchestration_data.get("tasks", {})

        if not tasks:
            st.session_state.orchestration_log += "[WARNING] No tasks defined in orchestration. Skipping execution.\n"
            return {"error": "No tasks defined"}

        # Execute tasks sequentially or based on dependencies
        for task_id, task_definition in tasks.items():
            st.session_state.orchestration_log += f"Executing task: {task_id} using {provider}\n"
            model_name = task_definition.get("model", "gemini-pro" if provider == "Gemini" else "gpt-4o")
            prompt = task_definition.get("prompt")

            # API call based on selected provider
            if provider == "Gemini":
                # --- Gemini API call ---
                import google.generativeai as genai
                genai.configure(api_key=os.environ.get("GOOGLE_API_KEY"))
                if not genai.api_key:
                    raise ValueError("GOOGLE_API_KEY environment variable not set.")
                model = genai.GenerativeModel(model_name)
                response = model.generate_content(prompt)
                task_output = response.text
            else:  # OpenAI
                # --- OpenAI API call ---
                import openai
                client = openai.OpenAI(api_key=os.environ.get("OPENAI_API_KEY"))
                if not client.api_key:
                    raise ValueError("OPENAI_API_KEY environment variable not set.")
                response = client.chat.completions.create(
                    model=model_name,
                    messages=[{"role": "user", "content": prompt}]
                )
                task_output = response.choices[0].message.content

            final_output[task_id] = {"output": task_output}
            st.session_state.orchestration_log += f"Task {task_id} completed. Output: {task_output[:70]}...\n"

        st.session_state.orchestration_log += "Orchestration completed.\n"
        return final_output

    except Exception as e:
        st.session_state.orchestration_log += f"[ERROR] An error occurred during orchestration: {e}\n"
        raise # Re-raise to be caught by the main execution block for st.error display


# --- Default Example Orchestration ---
DEFAULT_EXAMPLE_ORCHESTRATION = json.dumps(
    {
        "name": "Simple Greeting",
        "description": "A basic orchestration to generate a greeting.",
        "tasks": {
            "greeting_task": {
                "model": "gemini-pro",
                "prompt": "Generate a warm greeting for a new user. Keep it concise.",
                "output_parser": "text",
                "next_tasks": []
            }
        }
    },
    indent=2
)

# --- Session State Initialization ---
# Initialize all necessary session state variables
if 'orchestration_result' not in st.session_state:
    st.session_state.orchestration_result = ""
if 'orchestration_log' not in st.session_state:
    st.session_state.orchestration_log = ""
if 'orchestration_definition' not in st.session_state:
    st.session_state.orchestration_definition = DEFAULT_EXAMPLE_ORCHESTRATION
if 'selected_orchestration_name' not in st.session_state:
    st.session_state.selected_orchestration_name = "Select an orchestration..."
if 'current_orchestration_name_for_editing' not in st.session_state:
    st.session_state.current_orchestration_name_for_editing = ""

# --- Main Streamlit App ---
st.title("Agentic Workflow Orchestrator")

st.info("💡 **Hint:** Ensure you have set either `GOOGLE_API_KEY` (for Gemini) or `OPENAI_API_KEY` (for ChatGPT) environment variables for actual orchestration execution.")

# --- Provider Selection ---
st.subheader("AI Provider Selection")
col_provider1, col_provider2 = st.columns(2)

with col_provider1:
    # Initialize provider selection in session state
    if 'selected_provider' not in st.session_state:
        st.session_state.selected_provider = "Gemini"

    # Provider selection dropdown
    provider = st.selectbox(
        "Choose AI Provider",
        ["Gemini", "OpenAI ChatGPT"],
        index=0 if st.session_state.selected_provider == "Gemini" else 1,
        key="provider_select",
        help="Select which AI provider to use for orchestration tasks."
    )
    st.session_state.selected_provider = provider

with col_provider2:
    # Show API key status
    google_key_set = os.environ.get("GOOGLE_API_KEY") is not None
    openai_key_set = os.environ.get("OPENAI_API_KEY") is not None

    if provider == "Gemini":
        if google_key_set:
            st.success("✅ Gemini API key is configured")
        else:
            st.warning("⚠️ Gemini API key not found. Set GOOGLE_API_KEY environment variable.")
    else:  # OpenAI
        if openai_key_set:
            st.success("✅ OpenAI API key is configured")
        else:
            st.warning("⚠️ OpenAI API key not found. Set OPENAI_API_KEY environment variable.")

st.markdown("---")
st.header("Manage Orchestrations")

orchestrations = load_orchestrations()
orchestration_names = sorted(list(orchestrations.keys()))

def update_definition_from_selection():
    """
    Callback function to update the definition text area and current editing name
    when a new orchestration is selected from the dropdown.
    """
    if st.session_state.selected_orchestration_name and \
       st.session_state.selected_orchestration_name != "Select an orchestration...":
        selected_name = st.session_state.selected_orchestration_name
        st.session_state.orchestration_definition = json.dumps(
            orchestrations.get(selected_name, {}), indent=2
        )
        st.session_state.current_orchestration_name_for_editing = selected_name
    else:
        st.session_state.orchestration_definition = DEFAULT_EXAMPLE_ORCHESTRATION
        st.session_state.current_orchestration_name_for_editing = ""
    st.session_state.orchestration_result = ""
    st.session_state.orchestration_log = ""

# Layout for load/example buttons
col1, col2 = st.columns([2,1])
with col1:
    st.selectbox(
        "Load an existing Orchestration",
        ["Select an orchestration..."] + orchestration_names,
        index=(["Select an orchestration..."] + orchestration_names).index(st.session_state.selected_orchestration_name),
        key="selected_orchestration_name",
        on_change=update_definition_from_selection,
        help="Select an orchestration to load its definition into the editor."
    )

with col2:
    if st.button("Load Example", help="Load a default example orchestration definition."):
        st.session_state.orchestration_definition = DEFAULT_EXAMPLE_ORCHESTRATION
        st.session_state.current_orchestration_name_for_editing = ""
        st.session_state.selected_orchestration_name = "Select an orchestration..." # Reset selectbox
        st.session_state.orchestration_result = ""
        st.session_state.orchestration_log = ""
        st.rerun() # Rerun to update the text area immediately

# Input for saving/updating an orchestration
new_orchestration_name = st.text_input(
    "Name for new/updated orchestration",
    value=st.session_state.current_orchestration_name_for_editing,
    key="new_orchestration_name_input",
    help="Enter a name to save the current definition. If the name exists, it will be updated."
)

# Layout for save, delete, and clear buttons
col_save_delete_clear = st.columns(3)
with col_save_delete_clear[0]:
    if st.button("Save Orchestration", help="Save the current definition under the specified name."):
        if new_orchestration_name:
            try:
                current_definition = json.loads(st.session_state.orchestration_definition)
                orchestrations[new_orchestration_name] = current_definition
                if save_orchestrations(orchestrations):
                    st.success(f"Orchestration '{new_orchestration_name}' saved successfully!")
                    st.session_state.current_orchestration_name_for_editing = new_orchestration_name
                    st.session_state.selected_orchestration_name = new_orchestration_name
                    st.rerun() # Force rerun to update selectbox and reflect new name
                else:
                    st.error("Failed to save orchestration.")
            except json.JSONDecodeError:
                st.error("Cannot save: Invalid JSON format in Orchestration Definition.")
        else:
            st.warning("Please enter a name to save the orchestration.")

with col_save_delete_clear[1]:
    if st.button("Delete Selected Orchestration", help="Delete the currently selected orchestration."):
        if st.session_state.selected_orchestration_name and \
           st.session_state.selected_orchestration_name != "Select an orchestration...":
            if st.session_state.selected_orchestration_name in orchestrations:
                del orchestrations[st.session_state.selected_orchestration_name]
                if save_orchestrations(orchestrations):
                    st.success(f"Orchestration '{st.session_state.selected_orchestration_name}' deleted.")
                    st.session_state.orchestration_definition = DEFAULT_EXAMPLE_ORCHESTRATION
                    st.session_state.selected_orchestration_name = "Select an orchestration..."
                    st.session_state.current_orchestration_name_for_editing = ""
                    st.session_state.orchestration_result = ""
                    st.session_state.orchestration_log = ""
                    st.rerun()
                else:
                    st.error("Failed to delete orchestration.")
            else:
                st.warning("Selected orchestration not found.")
        else:
            st.warning("Please select an orchestration to delete.")

with col_save_delete_clear[2]:
    if st.button("Clear All", help="Reset the editor, results, and logs to default."):
        st.session_state.orchestration_definition = DEFAULT_EXAMPLE_ORCHESTRATION
        st.session_state.orchestration_result = ""
        st.session_state.orchestration_log = ""
        st.session_state.selected_orchestration_name = "Select an orchestration..."
        st.session_state.current_orchestration_name_for_editing = ""
        st.rerun()

st.markdown("---")

# --- Orchestration Definition Editor ---
st.subheader("Orchestration Definition")
st.session_state.orchestration_definition = st.text_area(
    "Edit your orchestration JSON here:",
    value=st.session_state.orchestration_definition,
    height=400,
    key="orchestration_definition_input",
    help="Paste or type your orchestration definition in JSON format. Invalid JSON will prevent execution."
)

# --- Execution Button ---
if st.button("Execute Orchestration", type="primary", help="Run the currently defined orchestration."):
    # Clear previous results and logs before a new execution attempt
    st.session_state.orchestration_result = ""
    st.session_state.orchestration_log = ""
    
    orchestration_data = None
    try:
        orchestration_data = json.loads(st.session_state.orchestration_definition)
    except json.JSONDecodeError:
        st.error("❌ **Invalid JSON format** in Orchestration Definition. Please check your syntax.")

    if orchestration_data:
        try:
            with st.spinner("🚀 Executing orchestration... Please wait."):
                result = orchestrate(orchestration_data, st.session_state.selected_provider) # orchestrate function updates log directly
            st.success("✅ Orchestration completed successfully!")
            st.session_state.orchestration_result = json.dumps(result, indent=2) # Store as JSON string
        except ValueError as ve:
            st.error(f"🚫 **Configuration Error:** {ve}. Please check your API key or task definitions.")
            # Log already updated by orchestrate function for other errors
        except Exception as e:
            st.error(f"❌ **Execution Failed:** An unexpected error occurred: {e}")
            # Log already updated by orchestrate function
    else:
        st.warning("Cannot execute with an invalid or empty orchestration definition.")

st.markdown("---")

# --- Results and Logs Display ---
st.subheader("Execution Results")
if st.session_state.orchestration_result:
    st.json(json.loads(st.session_state.orchestration_result)) # Use st.json for formatted output
else:
    st.info("No result yet. Execute an orchestration to see output.")

st.subheader("Orchestration Log")
if st.session_state.orchestration_log:
    st.code(st.session_state.orchestration_log, language="log", height=300) # Use st.code for logs
else:
    st.info("No logs yet.")
