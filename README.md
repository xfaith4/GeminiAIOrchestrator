# Gemini AI Orchestrator

This project provides a Streamlit-based web interface for defining, managing, and executing chains of Gemini AI tasks. It aims to simplify the creation and execution of complex AI workflows by providing a user-friendly UI for orchestration definitions.

## Features

*   **Interactive Web UI:** Built with Streamlit for an intuitive user experience.
*   **Orchestration Definition:** Define complex AI workflows using a JSON structure.
*   **Gemini Integration:** Leverage Google's Gemini AI models for task execution.
*   **Load & Execute:** Select and run pre-defined or user-saved orchestrations.
*   **Improved Output Display:** Clear and structured presentation of results and logs.

**New Features & Enhancements (Post-Review):**

*   **In-App Orchestration Management:**
    *   **Save New/Update:** Easily save your custom orchestration definitions with a chosen name or update existing ones.
    *   **Delete:** Remove unwanted orchestrations directly through the UI.
*   **Robust Input Validation:** Instant feedback for invalid JSON definitions, preventing execution errors.
*   **Enhanced User Feedback:** Visual cues (spinners, success/error messages) during execution and for actions.
*   **Better Onboarding:** A default example orchestration guides new users on the expected JSON structure.
*   **Clear All Functionality:** Quickly reset the UI to start a new workflow.
*   **API Key Guidance:** Clear instructions within the UI about setting up your `GOOGLE_API_KEY`.

## Setup and Run

### Prerequisites

*   Python 3.8+
*   Google Gemini API Key (set as an environment variable)

### Installation

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/xfaith4/GeminiAIOrchestrator.git
    cd GeminiAIOrchestrator
    ```
2.  **Create and activate a virtual environment:**
    ```bash
    python -m venv venv
    # On Windows
    .\venv\Scripts\activate
    # On macOS/Linux
    source venv/bin/activate
    ```
3.  **Install dependencies:**
    ```bash
    pip install -r requirements.txt
    ```
4.  **Set your Google Gemini API Key:**
    The application requires your Google Gemini API key to interact with the models. Set it as an environment variable:
    ```bash
    # On macOS/Linux
    export GOOGLE_API_KEY="YOUR_GEMINI_API_KEY"
    # On Windows (Command Prompt)
    set GOOGLE_API_KEY="YOUR_GEMINI_API_KEY"
    # On Windows (PowerShell)
    $env:GOOGLE_API_KEY="YOUR_GEMINI_API_KEY"
    ```
    Replace `"YOUR_GEMINI_API_KEY"` with your actual key.

### Running the Application

1.  Ensure your virtual environment is active and `GOOGLE_API_KEY` is set.
2.  Run the Streamlit application:
    ```bash
    streamlit run app.py
    ```
    This will open the application in your web browser, usually at `http://localhost:8501`.

## How to Use

1.  **Initial State:** When the app loads, you'll see a default example orchestration in the "Orchestration Definition" text area.
2.  **Load an Existing Orchestration:** Use the "Load an existing Orchestration" dropdown to select from previously saved workflows.
3.  **Define/Edit Orchestration:** Modify the JSON in the "Orchestration Definition" text area to create your own workflow.
    *   Refer to the example for the expected JSON structure.
    *   The UI will provide immediate feedback if your JSON is invalid.
4.  **Save Orchestration:**
    *   Enter a unique name in the "Name for new/updated orchestration" input field.
    *   Click "Save Orchestration" to store your current definition. If the name already exists, it will update the existing orchestration.
5.  **Delete Orchestration:** Select an orchestration from the dropdown and click "Delete Selected Orchestration" to remove it.
6.  **Clear All:** Use the "Clear All" button to reset the UI (definition, results, logs) to its default example state.
7.  **Execute Orchestration:** Once your definition is ready, click the "Execute Orchestration" button.
    *   A spinner will indicate that the execution is in progress.
    *   Results and logs will appear below, with `st.json` for structured results and `st.code` for logs, improving readability.
8.  **Review Results and Logs:** Check the "Execution Results" and "Orchestration Log" sections for output and any messages.

## Orchestration Definition Structure (Example)

```json
{
    "name": "Your Orchestration Name",
    "description": "A brief description of what this orchestration does.",
    "tasks": {
        "first_task_id": {
            "model": "gemini-pro",
            "prompt": "Your prompt for the first task.",
            "output_parser": "text",
            "next_tasks": ["second_task_id"]
        },
        "second_task_id": {
            "model": "gemini-pro",
            "prompt": "Another prompt, potentially using output from {{first_task_id.output}}.",
            "output_parser": "json",
            "next_tasks": []
        }
    }
}
```
*(Note: The actual `orchestrate` function in `app.py` currently uses a simulated output for demonstration. For real Gemini interactions, ensure `GOOGLE_API_KEY` is set and uncomment the relevant API call lines within the `orchestrate` function.)*

## Project Structure

*   `app.py`: The main Streamlit application script, handling the UI, orchestration logic, and user interactions.
*   `orchestrations.json`: Stores user-defined orchestration definitions.
*   `requirements.txt`: Lists Python dependencies.

## Contributing

Feel free to open issues or submit pull requests for further improvements.
