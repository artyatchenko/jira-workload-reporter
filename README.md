# Jira Workload Report

A Node.js tool to generate a personalized workload and activity report from Jira, with interactive charts and tables.

## Features

- Fetches Jira issues using your API token (no cookies or browser session required)
- Supports multiple queries (tickets created, bugs created, worked as QA, etc.)
- Generates an HTML report with charts and tables for each query
- Customizable for any user via `.env` file
- Modular, maintainable codebase

## Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Configure environment variables:**
   - Copy `.env.example` to `.env`:
     ```bash
     cp .env.example .env
     ```
   - Fill in your Jira credentials and user info in `.env`:

## Usage

Run the script:

```bash
npm start
```

This will generate `jira_report.html` in the project directory. Open it in your browser to view your personalized report.

## Example Output

- Interactive bar and pie charts for each query
- Table of issues with key details
- Report title includes your name

