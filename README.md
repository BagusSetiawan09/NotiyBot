# NotiyBot - Ultimate Developer Productivity Dashboard

![Status](https://img.shields.io/badge/Status-Active-success?style=for-the-badge)
![Electron.js](https://img.shields.io/badge/Electron.js-47848F?style=for-the-badge&logo=electron&logoColor=white)
![TailwindCSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-blue?style=for-the-badge)

**NotiyBot** is an advanced, offline-first desktop application designed specifically for software engineers and digital professionals. It unifies task management, environment automation, habit tracking, and AI assistance into a single, cohesive interface built with a modern glassmorphism design language.

Powered by **Electron.js** and **Tailwind CSS**, NotiyBot operates efficiently with minimal system resources while providing real-time data tracking, API integrations, and an uncompromising focus on deep work.

---

## Core Modules & Features

The application is architected into eight distinct modules to handle every aspect of your daily productivity cycle:

### 1. Task Management & Daily Targets
A comprehensive task management system structured into four main views: To-Do, Task, Focus, and History.
- **Smart Input:** Seamlessly add daily targets and track their completion status.
- **AI Task Analysis:** Automatically assigns priorities and scheduled times based on conversational inputs from the AI Assistant.

### 2. Focus & Health Tracker
A dedicated environment for deep work sessions.
- **Pomodoro Timer:** Configurable focus sessions (e.g., 25 minutes) with smooth, interactive progress indicators.
- **Hydration & Health:** Built-in trackers for daily water intake and standing/stretching intervals.
- **Do Not Disturb Mode:** A quick toggle to suppress all system notifications during critical focus periods.

### 3. Habits & GitHub Activity
Bridge the gap between personal routines and professional development.
- **Daily Routines:** An interactive grid system to track and maintain streaks for daily habits (e.g., Reading, Exercise, Ideation).
- **Real-Time GitHub Dashboard:** Integrates via GitHub REST API to securely render an authentic, dark-mode contribution heatmap and a dynamic activity overview of your repositories directly within the app.

### 4. Screen Time Analytics
Monitor your digital consumption to prevent burnout.
- **Live Tracking:** Records application usage dynamically.
- **Visual Insights:** Features detailed daily timelines showing exact application usage (e.g., VS Code, Chrome) and weekly real-time graphs for analytical review.

### 5. Think (AI Assistant & Zen Scratchpad)
A dual-pane knowledge and ideation hub.
- **Context-Aware AI Chat:** Powered by Google Gemini (Fast, Reasoning, and Pro models). Capable of processing text, voice, and visual inputs.
- **Zen Scratchpad:** A distraction-free, rich-text editor that slides in via a split-view panel. Features auto-markdown formatting, table generation, and real-time auto-save capabilities.

### 6. Calendar & Timeline
Visual scheduling for strict deadline management.
- **Interactive Timeline:** View scheduled tasks mapped across specific hours of the day to visualize your upcoming workload efficiently.

### 7. Workspaces (1-Click Automation)
Eliminate the repetitive setup process of your development environments.
- **Automated Bootstrapping:** Configure custom workspaces by defining the Project Folder Path, Local Server executable (e.g., XAMPP), Terminal Commands (e.g., `php artisan serve`), and Live Browser URLs.
- **One-Click Launch:** Boot your entire development stack simultaneously with a single click.

### 8. Custom Notifications & Timers
Highly personalized alert systems.
- **Interval & Specific Timers:** Set recurring reminders or exact alarms.
- **Face Customization:** Replace default notification animations with custom images, GIFs, or SVGs to personalize your workspace alerts.

---

## Tech Stack

* **Core Framework:** Electron.js
* **Frontend Architecture:** HTML5, CSS3, Vanilla JavaScript
* **Styling:** Tailwind CSS
* **Typography:** Plus Jakarta Sans
* **Data Persistence:** LocalStorage (Privacy-first, offline capable)
* **External APIs:** Google Gemini API, GitHub REST API

---

## System Requirements

* OS: Windows 10/11, macOS, or Linux
* Node.js (Latest LTS version recommended)
* NPM (Node Package Manager)

---

## Quick Start & Installation

Clone the repository and install the dependencies to run the application locally:

```bash
# 1. Clone the repository
git clone [https://github.com/BagusSetiawan09/NotiyBot.git](https://github.com/BagusSetiawan09/NotiyBot.git)
cd NotiyBot

# 2. Install dependencies
npm install

# 3. Launch the application
npm start
```

## Configuration Note
- **AI Integration:** Navigate to the Think module and input your Gemini API Key in the settings modal.
-- **GitHub Heatmap:** Navigate to the Habits & Activity module settings and input your GitHub Username and a Personal Access Token (PAT) to fetch private repository data.

---

## Support & Contribution

NotiyBot is an open-source initiative. If this application enhances your productivity, consider supporting the continuous development of future features:

[![Trakteer](https://img.shields.io/badge/Traktir_Kopi_di-Trakteer-E12A3E?style=for-the-badge&logo=ko-fi&logoColor=white)](https://teer.id/BagusSetiawan90)