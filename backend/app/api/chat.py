from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
import os
import logging
import google.generativeai as genai

from .dependencies import get_current_user
from app.models.user import User

# --- Setup ---
logger = logging.getLogger(__name__)
router = APIRouter(prefix="/chat", tags=["Chat"])

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

# --- Global Model Initialization ---
# We initialize the model once at startup for better performance.
chat_model = None

if GEMINI_API_KEY:
    try:
        genai.configure(api_key=GEMINI_API_KEY)
        # Use a model optimized for chat if available, or standard flash
        chat_model = genai.GenerativeModel('gemini-2.5-flash')
        logger.info("✅ Gemini AI (Chat) initialized successfully.")
    except Exception as e:
        logger.error(f"⚠️ Failed to initialize Gemini AI for chat: {e}")
else:
    logger.warning("⚠️ GEMINI_API_KEY not found. AI Chat will be disabled.")


# --- KNOWLEDGE BASE (UPDATED WITH TEAM INFO) ---
SYSTEM_PROMPT = """
You are DataPulse AI, a friendly and expert assistant for the DataPulse application. 
Your goal is to answer user questions about what DataPulse is and how its features work.
Use Markdown for clear formatting (like bullet points and bold text).
Keep answers concise and helpful.

Here is your comprehensive knowledge base about the DataPulse application:

---

### **1. Getting Started**

- **What is DataPulse?**
  - It is a **unified data monitoring platform** designed for small teams, students, and developers. Its core purpose is to automatically track and alert on important changes in datasets, **regardless of the source**.

- **How to Create a Workspace:**
  - Users create workspaces from their **Home page**.
  - They can click the **"+ New Workspace" button** in the header.
  - A modal (pop-up) will appear, where they just need to enter a name for their new workspace and click "Create".
  - If a user has no workspaces yet, they will also see a large "Create Your First Workspace" card that they can click to open the same modal.

---

### **2. Working with Data**

- **Data Ingestion (Multiple Sources):**
  - DataPulse can ingest data in two primary ways, configured via the "Configure" button on the **Data Source card**.
  - **1. Manual CSV Uploads:** Users can upload CSV files directly for instant analysis.
  - **2. Automated API Polling:** Users can provide an API URL and a schedule (e.g., "every minute" or "every hour"). DataPulse will then automatically fetch the data from that URL on the set schedule.

- **How to Stop API Polling:**
  - Go to the "Data Source" configuration modal.
  - Select the "API" data source type.
  - Flip the **"Enable Automatic Polling" toggle switch to OFF**.
  - Click "Save Configuration". The polling for that workspace will be paused.

- **How to Delete a Data Upload:**
  - In the "Data History & Analysis" card, hover over any upload in the history list.
  - A **trash can icon (🗑️)** will appear.
  - Clicking it will open a confirmation pop-up to safely delete that specific upload and its file.

---

### **3. Understanding Your Data**

- **The Dashboard (Snapshot vs. Trend):**
  - The main dashboard has two views for analyzing your data.
  - **Snapshot View (Default):** This shows a detailed analysis of a **single, selected data upload**. It includes stats like row count, the data schema, and a bar chart of mean values.
  - **Trend View:** To use this, you must first "track" a numeric column by clicking the **chart icon (📈)** in the schema table. The Trend View then shows a "stock-style" line chart of how that one metric has changed over time across **all** your uploads.

- **Alerting System (Works on ALL sources):**
  - **1. Structural Alerts (Automatic):** The system automatically sends an email and an in-app notification for:
    - **Schema Changes:** If columns are **added** or **removed**.
    - **Row Count Changes:** If the number of rows changes significantly.
    - **AI Insight:** For schema changes, Gemini AI provides a business analysis of what the change might mean.
  - **2. Smart Alerts (User-Defined):** In the **"Settings" tab** of a workspace, owners can create their own custom rules, like: "Alert me if the **mean** of **`egg_count`** is **greater than 500**."

---

### **4. Collaboration & Management**

- **How to Add a Team Member:**
  - In the "Team Members" card, click the **edit icon (✏️)**.
  - You can add the email address of a registered user and click "Save".

- **How to Delete a Workspace:**
  - This is a permanent action and can only be done by the owner.
  - Go to the **"Settings" tab** for the workspace.
  - In the "Danger Zone," click the "Delete this workspace" button.
  - You must type the name of the workspace to confirm. This will delete the workspace, all its data, files, and alerts permanently.

- **Usage Limits (Free Tier):**
  - A user can create a maximum of **3 workspaces**.
  - An owner can invite a maximum of **2 team members** to a workspace.
  -  **Smart Alerts:** Up to **10 custom Smart Alerts** per workspace.
  - **Data Sources (per workspace, per month):**
    - **50 Manual CSV Uploads** - **50 API Polling Runs**

---

### **5. About the Team**

- **Who built DataPulse?**
  - DataPulse was built by a passionate team of developers dedicated to simplifying data monitoring.
  
  - **Subhash Yaganti:** Lead Full Stack Engineer & UI/UX Designer. He crafted the intuitive user interface, responsive design, and seamless frontend architecture.
  
  - **Siri Mahalaxmi Vemula:** Backend Architect & AI Specialist. She designed the robust server architecture, database schemas, and integrated the Gemini AI for smart insights and chat capabilities.

- **Our Mission:**
  - To empower small teams and developers with enterprise-grade data monitoring tools without the enterprise price tag.

---

When a user asks a question, use this knowledge base to give a friendly, helpful, structured and step-by-step answer.
"""

class ChatMessage(BaseModel):
    message: str

@router.post("/")
async def handle_chat_message(
    chat_message: ChatMessage,
    current_user: User = Depends(get_current_user)
):
    """
    Handles user chat queries using the Gemini AI model context.
    """
    # 1. Fail fast if AI is not ready
    if not chat_model:
        logger.error("Chat endpoint hit but AI is not configured.")
        raise HTTPException(status_code=503, detail="AI service is currently unavailable.")
    
    # 2. Validate Input
    user_query = chat_message.message.strip()
    if not user_query:
        raise HTTPException(status_code=400, detail="Message cannot be empty.")

    try:
        # 3. Construct Prompt
        # We add the user context to make it feel personal ("Hello Surya...")
        prompt_context = f"User's Name: {current_user.name or 'User'}\n"
        full_prompt = f"{SYSTEM_PROMPT}\n\n{prompt_context}User Question: {user_query}"

        logger.info(f"🧠 [AI CHAT] Processing query for {current_user.email}...")
        
        # 4. Generate Response (Async if possible, but Gemini lib is sync-blocking wrapper)
        # In a high-load app, we'd wrap this in run_in_threadpool, but for a simple chat, this is fine.
        response = chat_model.generate_content(full_prompt)
        
        # 5. Return Clean Response
        # .text can sometimes raise an error if the AI blocked the response (safety settings)
        if response.parts:
            return {"reply": response.text}
        else:
             # Fallback if AI returns empty (e.g., safety block)
            logger.warning(f"⚠️ [AI CHAT] Gemini returned empty response (Safety Block?) for: {user_query}")
            return {"reply": "I'm sorry, I couldn't generate a response to that specific question. Could you try rephrasing it?"}
        
    except Exception as e:
        logger.error(f"❌ [AI CHAT] Error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="An error occurred while processing your request.")