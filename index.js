import dotenv from "dotenv";
import axios from "axios";
import dayjs from "dayjs";
import fs from "fs";

// Load environment variables
dotenv.config();

const JIRA_BASE_URL = process.env.JIRA_BASE_URL;
const JIRA_EMAIL = process.env.JIRA_EMAIL;
const JIRA_API_TOKEN = process.env.JIRA_API_TOKEN;
const JIRA_QA_ENGINEER_FIELD = process.env.JIRA_QA_ENGINEER_FIELD; // e.g., "customfield_XXXXX"
const JIRA_USER = process.env.JIRA_USER || "";

if (!JIRA_BASE_URL || !JIRA_EMAIL || !JIRA_API_TOKEN) {
  console.error("Missing required environment variables. Please check your .env file.");
  process.exit(1);
}

// Date range: past 12 months
const endDate = dayjs();
const startDate = endDate.subtract(12, "month");

const JIRA_COOKIES = undefined;
const JIRA_XSRF_TOKEN = undefined;

// Helper: Jira API request (standard REST API)
async function jiraRequest(path, params = {}) {
  const url = `${JIRA_BASE_URL}/rest/api/2/${path}`;
  const auth = Buffer.from(`${JIRA_EMAIL}:${JIRA_API_TOKEN}`).toString("base64");
  try {
    const response = await axios.get(url, {
      params,
      headers: {
        Authorization: `Basic ${auth}`,
        Accept: "application/json",
      },
    });
    return response.data;
  } catch (error) {
    console.error("Jira API error:", error.response?.data || error.message);
    process.exit(1);
  }
}

// Main logic placeholder
/**
 * Fetch all issues for a given JQL query, handling pagination.
 */
async function fetchIssues(jql) {
  const allIssues = [];
  let startAt = 0;
  const maxResults = 50;
  let total = 0;

  do {
    const data = await jiraRequest("search", {
      jql,
      startAt,
      maxResults,
      fields: [
        "issuetype",
        "status",
        "created",
        "resolutiondate",
        "summary",
        JIRA_QA_ENGINEER_FIELD || "",
      ].filter(Boolean).join(","),
    });
    if (data.issues) {
      allIssues.push(...data.issues);
      total = data.total;
      startAt += data.issues.length;
      console.log(`[JQL] Fetched ${allIssues.length}/${total} issues...`);
    } else {
      break;
    }
  } while (allIssues.length < total);

  return allIssues;
}

/**
 * Process issues to extract summary data and table rows.
 */
function processIssues(issues) {
  const monthlyVolume = {};
  const issueTypeCounts = {};
  const statusCounts = {};
  const tableRows = [];

  issues.forEach(issue => {
    const fields = issue.fields;
    // Created month
    const created = fields.created ? dayjs(fields.created) : null;
    const month = created ? created.format("YYYY-MM") : "Unknown";
    monthlyVolume[month] = (monthlyVolume[month] || 0) + 1;

    // Issue type
    const issueType = fields.issuetype?.name || "Unknown";
    issueTypeCounts[issueType] = (issueTypeCounts[issueType] || 0) + 1;

    // Status
    const status = fields.status?.name || "Unknown";
    statusCounts[status] = (statusCounts[status] || 0) + 1;

    // Table row
    tableRows.push({
      key: issue.key,
      summary: fields.summary || "",
      status,
      issueType,
      created: created ? created.format("YYYY-MM-DD") : "",
      resolved: fields.resolutiondate ? dayjs(fields.resolutiondate).format("YYYY-MM-DD") : "",
    });
  });

  return {
    totalIssues: issues.length,
    monthlyVolume,
    issueTypeCounts,
    statusCounts,
    tableRows,
  };
}

/**
 * Generate the HTML report from sections and user name.
 */
function generateReport(sections, userName, userEmail) {
  const template = fs.readFileSync("report_template.html", "utf-8");
  const reportHtml = template
    .replace("const chartData = __CHART_DATA__;", `const chartData = ${JSON.stringify(sections, null, 2)};`)
    .replace("const userName = __USER_NAME__;", `const userName = ${JSON.stringify(userName)};`);
  // Sanitize email for filename
  const safeEmail = (userEmail || "").replace(/[@.]/g, "_");
  const reportsDir = "reports";
  if (!fs.existsSync(reportsDir)) {
    fs.mkdirSync(reportsDir);
  }
  const fileName = `${reportsDir}/jira_report.${safeEmail}.html`;
  fs.writeFileSync(fileName, reportHtml);
  console.log(`Report generated: ${fileName}`);
}

/**
 * Main entry point.
 */
async function main() {
  // Define the three queries
  const queries = [
    {
      title: 'Tickets created',
      jql: `project = APP AND reporter in ("${JIRA_EMAIL}")`,
    },
    {
      title: 'Bugs created',
      jql: `project = APP AND issuetype in (Bug, "Acceptance bug") AND reporter in ("${JIRA_EMAIL}")`,
    },
    {
      title: 'Worked as QA',
      jql: `project = APP AND "QA Engineer" in ("${JIRA_EMAIL}")`,
    },
  ];

  const sections = [];
  for (const { title, jql } of queries) {
    const issues = await fetchIssues(jql);
    const summary = processIssues(issues);
    sections.push({
      title,
      ...summary,
    });
  }

  // Save processed data for inspection (optional)
  fs.writeFileSync("jira_issues_summary.json", JSON.stringify(sections, null, 2));

  // Generate HTML report with all sections
  generateReport(sections, JIRA_USER, JIRA_EMAIL);
}

main();
