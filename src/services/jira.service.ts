import axios from "axios";

export async function getJiraTicketDetails(
  ticketNumber: string
): Promise<Object | null> {
  const JIRA_BASE_URL = "https://guild-education.atlassian.net";
  const JIRA_API_TOKEN = ""; // Your Jira API token
  const JIRA_USER_EMAIL = "khaled.hossain@guildeducation.com";

  // Validate that necessary credentials are provided
  if (!JIRA_API_TOKEN || !JIRA_USER_EMAIL) {
    console.error(
      "Error: JIRA_API_TOKEN or JIRA_USER_EMAIL environment variables are not set."
    );
    return null;
  }

  // Construct the API endpoint for fetching a single issue
  const apiUrl = `${JIRA_BASE_URL}/rest/api/3/issue/${ticketNumber}`;
  console.error("apiUrl", apiUrl);
  // Create the Basic Auth header.
  // The credentials string is "email:api_token" base64 encoded.
  const credentials = `${JIRA_USER_EMAIL}:${JIRA_API_TOKEN}`;
  const encodedCredentials = btoa(credentials); // btoa() is available in browser environments

  try {
    const response = await axios.get(apiUrl, {
      headers: {
        Authorization: `Basic ${encodedCredentials}`,
        Accept: "application/json", // Request JSON response
        "Content-Type": "application/json",
      },
    });

    // Log the successful response data
    console.error(
      `Successfully fetched details for ticket ${ticketNumber}:`,
      response.data
    );
    return response.data;
  } catch (error) {
    // Handle different types of errors
    console.error(`Error fetching details for ticket ${ticketNumber}:`, error);
    return null; // Return null to indicate failure
  }
}
