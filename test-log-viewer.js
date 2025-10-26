// Test data for log viewer integration
const testSessionData = {
  id: "test-session-123",
  goal: "Create a simple HTML page with a contact form",
  timestamp: Date.now(),
  plan: [
    {
      step: 1,
      task: "Design the HTML structure for the contact form",
      agent: "Code Generator",
      dependencies: [],
      tool: "gemini:generateCode"
    },
    {
      step: 2,
      task: "Add CSS styling for the form",
      agent: "Code Generator",
      dependencies: [1],
      tool: "gemini:generateCode"
    }
  ],
  logEntries: [
    {
      timestamp: new Date(Date.now() - 60000),
      agent: "User",
      message: "User Goal: Create a simple HTML page with a contact form",
      type: "info"
    },
    {
      timestamp: new Date(Date.now() - 50000),
      agent: "Supervisor",
      message: "Created a 2-step plan. Awaiting user approval.",
      type: "info"
    },
    {
      timestamp: new Date(Date.now() - 30000),
      agent: "Orchestrator",
      message: "Executing Step 1: Design the HTML structure for the contact form (Agent: Code Generator)",
      type: "info"
    }
  ],
  scratchpad: "INITIAL CONTEXT:\nUser Goal: Create a simple HTML page with a contact form\n\n--- STEP 1 (Agent: Code Generator) OUTPUT ---\nGenerated HTML structure for contact form\n--- END STEP 1 ---\n\n",
  artifacts: [
    {
      name: "contact.html",
      content: `<html>
<head>
    <title>Contact Form</title>
    <style>
        body { font-family: Arial, sans-serif; }
        .form-group { margin: 10px 0; }
        label { display: block; }
        input, textarea { width: 100%; padding: 8px; }
        button { background: #007bff; color: white; padding: 10px; border: none; }
    </style>
</head>
<body>
    <h1>Contact Us</h1>
    <form>
        <div class="form-group">
            <label for="name">Name:</label>
            <input type="text" id="name" name="name">
        </div>
        <div class="form-group">
            <label for="email">Email:</label>
            <input type="email" id="email" name="email">
        </div>
        <div class="form-group">
            <label for="message">Message:</label>
            <textarea id="message" name="message" rows="4"></textarea>
        </div>
        <button type="submit">Send Message</button>
    </form>
</body>
</html>`,
      language: "html"
    }
  ],
  error: null,
  cost: 0.0234
};

console.log("Test session data created:", testSessionData);
