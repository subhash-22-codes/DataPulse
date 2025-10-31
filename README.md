DataPulse pulse
An intelligent, lightweight data monitoring platform with a real-time UI and AI-powered insights.

Note: Replace the link above with a real screenshot of your beautiful dashboard!

🚀 About DataPulse
DataPulse is a modern, full-stack data intelligence platform designed to empower small teams, students, and developers to effortlessly monitor and analyze their datasets. It addresses the gap between simple spreadsheets and complex, enterprise-grade BI tools by providing a unified system for data ingestion, automated analysis, and intelligent alerting, all wrapped in a clean, real-time user interface.

Whether you're tracking daily sales via a manual CSV upload or monitoring a live data stream with automated API polling, DataPulse works in the background to turn your raw data into actionable insights.

✨ Key Features
Distributed & Asynchronous Architecture: Built on a professional-grade stack using FastAPI, Celery, and Redis to handle heavy data processing in the background without ever blocking the user.

Multi-Source Data Ingestion:

Manual CSV Uploads: For ad-hoc analysis.

Automated API Polling: Configure the app to fetch data from any API on a recurring schedule (e.g., every minute, every hour).

Real-Time UI: The frontend, built with React, uses WebSockets to update the dashboard instantly the moment a background job is complete. No page refreshes needed.

Intelligent Alerting Engine:

Structural Alerts: Automatically detects and sends alerts for changes in a dataset's schema (new or missing columns) or volume (row count changes).

Smart Alerts: A user-configurable rules engine to create custom data-driven thresholds (e.g., "Alert me if the average of egg_count is greater than 500").

🤖 AI Business Analyst: Integrated with the Google Gemini AI, DataPulse provides human-like, formatted insights on what a schema change might mean from a business perspective, delivered directly in-app and via email.

Advanced Data Dashboards:

A "Mission Control" home page for a high-level overview.

An interactive "Trend View" with "stock-style" line charts to visualize metrics over time.

Complete User & Team Management: Features a full JWT authentication system, a professional team invitation workflow, and a persistent in-app notification center.

AI Concierge: An in-app chatbot powered by Gemini that acts as a helpful guide, answering user questions about how to use the platform's features.

Production-Ready Security: Includes API Rate Limiting to prevent abuse and secure workflows for all sensitive actions.

🛠️ Tech Stack
Backend: FastAPI, Python, PostgreSQL, Celery, Redis, SQLAlchemy

Frontend: React, TypeScript, Tailwind CSS, Vite

AI: Google Gemini 2.5 Flash

DevOps: Docker, Docker Compose

🏁 Getting Started
Follow these instructions to get a copy of the project up and running on your local machine for development and testing purposes.

Prerequisites
Docker and Docker Compose

Node.js and npm (or yarn)

Python

Installation & Setup
Clone the repository:

git clone [https://your-repo-url.com/DataPulse.git](https://your-repo-url.com/DataPulse.git)
cd DataPulse

Configure the Backend:

Navigate to the backend directory: cd backend

Create a .env file by copying the example: cp .env.example .env

Fill in all the required variables in the .env file (Database credentials, JWT secret, Google Client ID, Gemini API Key, etc.).

# .env.example
DATABASE_URL=postgresql://user:password@host.docker.internal/dbname
JWT_SECRET=your_super_secret_key
GOOGLE_CLIENT_ID=your_google_client_id.apps.googleusercontent.com
GEMINI_API_KEY=your_gemini_api_key
# ... other variables ...

Configure the Frontend:

Navigate to the frontend directory: cd ../frontend

Install dependencies: npm install

Create a .env.local file. This file tells the frontend where to find the backend API.

# .env.local
VITE_API_BASE_URL=/api

Run the Application:

Navigate back to the root DataPulse directory.

Start the entire application using Docker Compose:

docker-compose up --build

The application will be available at http://localhost:5173.

License
This project is licensed under the MIT License.