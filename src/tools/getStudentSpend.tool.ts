import { McpServer } from "@modelcontextprotocol/sdk/server/mcp";

import { fetchStudentSpend } from "../graphql/queries";

export const getStudentSpend = (server: McpServer) => {
  console.error("[Tool 'getStudentSpend'] Initializing tool...");
  server.tool("getStudentSpend", {}, async () => {
    try {
      const GET_STUDENT_SPEND_VARIABLES = {
        guildUuid: "47cbf684-7bfa-49b8-ae70-a80a90006b2f",
        employerId: "6307979a-db8d-437a-aa67-7cddd6e23e12",
        spendAsOf: "2024-03-21",
        capAsOf: "2024-03-11",
        product: "TUITION_ASSISTANCE",
        programUuid: "81be91c4-997e-499a-ae95-db53a7650223",
      };
      console.error(
        "[Tool 'getStudentSpend'] Fetching student spend data with variables:",
        GET_STUDENT_SPEND_VARIABLES
      );
      const res = await fetchStudentSpend(GET_STUDENT_SPEND_VARIABLES);
      console.error(
        `[Tool 'getStudentSpend'] Fetched student spend data:`,
        res
      );
      return {
        content: [
          {
            type: "text",
            text: `Student spend data:\n${JSON.stringify(res, null, 2)}`,
          },
        ],
      };
    } catch (error: any) {
      console.error(`[Tool 'getStudentSpend'] Error:`, error.message);
      return {
        content: [
          {
            type: "text",
            text: `Error fetching student spend data: ${error.message}`, // Added an error message for the user
          },
        ],
        isError: true,
        errorDetails: {
          message: error.message,
        },
      };
    }
  });
};
