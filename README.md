
# Agentic Workflow Orchestrator v2

An advanced agentic system where a supervisor agent creates a plan to achieve a goal. Specialized agents execute the plan step-by-step, using a shared scratchpad for memory, with a reviewer agent ensuring quality at each stage.

This project is a web-based demonstration of a multi-agent AI system designed to tackle complex tasks through collaboration and self-correction.

![Screenshot of the Orchestrator UI](https://storage.googleapis.com/aistudio-project-manager-prod/gallery/2469493a10594396b27d3536341235b6/thumbnail.png)

## 🚀 Getting Started

Follow these instructions to get a copy of the project up and running on your local machine.

### Prerequisites

- **Development Server:** A local web server is needed to run the application. `npx serve` or Python's built-in server are good options.
- **Git:** Required to clone the repository.
- **Google Gemini API Key:** The application uses the Gemini API. Your API key must be available to the application as an environment variable.

### 🔑 API Key Configuration

This application is designed to run in an environment where the Google Gemini API key is securely provided as an environment variable (`GEMINI_API_KEY`). The application's code will automatically use this key.

**Note on Local Development:** Simple static servers (like `python -m http.server` or `npx serve`) do not have a mechanism to inject environment variables into client-side JavaScript. This application is designed for platforms or build systems that can provide these variables at runtime.

### Launching the Application

1. **Clone the repository:**

    ```bash
    git clone <repository_url>
    cd <repository_directory>
    ```

2. **Ensure API Key is available:**
    Make sure your execution environment is configured to provide the `GEMINI_API_KEY`.

3. **Launch a local server:**
    From your terminal in the project's root directory, run one of the following commands:

    ```bash
    # Using npx (part of npm)
    npx serve
    ```

    or if you have Python 3 installed:

    ```bash
    python -m http.server
    ```

    Now you can open your browser and navigate to the local address provided (e.g., `http://localhost:3000` or `http://localhost:8000`).

## ✨ Key Features

- **Goal-Oriented Planning:** You provide a high-level goal, and a **Supervisor** agent breaks it down into a logical, step-by-step plan.
- **File-based Context:** Upload documents (`.docx`), spreadsheets (`.xlsx`, `.csv`), data files (`.json`), and scripts to provide rich context for your goal.
- **Specialized Agents & Tool Use:** The plan is executed by a team of specialized agents. Some agents think (e.g., `Report Writer`), while others act by using tools (e.g., the `GitHub Tool User` can read from public repositories).
- **Stateful Memory (Scratchpad):** Agents share a common "scratchpad" where the results of each step are stored, providing context for subsequent steps.
- **Quality Assurance & Self-Correction:** A **Reviewer** agent inspects the output of each step. If the quality is low, it provides feedback, and the original agent attempts the task again, learning from its mistake.
- **Transparent Process:** The entire workflow, including the plan, agent activities, and the scratchpad, is visualized in real-time, offering a clear view into the AI's "thinking" process.
- **Interactive Workflow:** The user must approve the generated plan before execution begins, providing a "human-in-the-loop" checkpoint.
- **Multi-File Workspace:** The final output is a complete workspace of artifacts (e.g., a Markdown report, a Python script, a JSON data file), not just a single response.

## ⚙️ How It Works

The orchestration follows a structured, multi-step process:

1. **Goal Input:** The user provides a high-level goal and optional context files.
2. **Plan Generation:** The **Supervisor** agent analyzes the goal and creates a detailed execution plan, including dependencies between steps.
3. **Plan Approval:** The user reviews the plan and approves it for execution.
4. **Step Execution:** The **Orchestrator** executes each step in sequence. For each step:
    a. A specialized agent is assigned the task.
    b. The agent performs its task, potentially using a tool (like reading a GitHub repo).
    c. The **Reviewer** agent checks the output for quality. If rejected, the step is retried with the reviewer's feedback.
5. **Synthesis:** Once all steps are complete, the **Synthesizer** agent reviews the entire process log (the scratchpad) and creates a final, coherent multi-file workspace.

## 🤖 The Agent Library

The system is composed of several distinct agents, each with a specific role:

- **Supervisor:** The project manager. Creates the initial plan.
- **Web Researcher:** Searches the web for information.
- **Data Analyst:** Analyzes data and performs calculations.
- **Report Writer:** Synthesizes information into well-structured reports.
- **Code Generator:** Writes, analyzes, and explains code.
- **GitHub Tool User:** Interacts with public GitHub repositories.
- **Reviewer:** The quality assurance expert. Approves or revises step outputs.
- **Synthesizer:** The final editor. Creates the polished end product.

## ⚠️ Limitations

- **Sequential Execution:** The orchestrator processes one step at a time and does not yet support parallel task execution.
- **GitHub Tool Constraints:** The code review tool works only on public repositories and analyzes a maximum of 5 files. It cannot clone repositories or execute code.
- **Stateless Sessions:** Each run is independent. The agents have no long-term memory of past goals.
- **Demonstration Tool:** This application is for demonstration purposes. Do not input sensitive or confidential information.

## 🛠️ Technology Stack

- **Frontend:** React, TypeScript, Tailwind CSS
- **AI Model:** Google Gemini API (`@google/genai`)
- **Syntax Highlighting:** Prism.js
- **Markdown Rendering:** Marked.js