// src/tools/summarizeJira.tool.ts
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp";
import { z } from "zod";
import { summarizeText } from "../services/ollama.service";
import { getJiraTicketDetails } from "../services/jira.service";

export const summarizeJiraTool = (server: McpServer) => {
  server.tool(
    "jira",
    {
      ticketId: z.string(),
    },
    async ({ ticketId }) => {
      console.error(`[Tool 'summarizeJira'] Called for URI: "${ticketId}"`);

      try {
        const details = `Description For Phase 1 of targeted skilling, payment producers will hardcode transactions as PRODUCT= SKILL for targeted skilling employers - because targeted skilling employers like Edward Jones will only have skilling transactions at launch.  (This hardcoding solution will enable us to bypass work needed to make payment facilitation admin tooling recognize skilling as a product.). Since payment producers will be calling Funding Service with transactions as  PRODUCT= SKILL , we need to enhance our endpoints to accept this value. Note:  Why we are preventing context for skilling (to prevent employer overspending) Acceptance Criteria SKILL is an accepted value for product in createSpend. Skilling transactions do not produce a read from or write to FACT Service. Benefit period validation is skipped when writing transactions with SKILL product. API documentation is updated.`;

        const summary = await summarizeText(details);

        return {
          content: [
            {
              type: "text",
              text: summary,
            },
          ],
        };
      } catch (error: any) {
        console.error(`[Tool 'summarizeJira'] Error:`, error.message);
        return {
          content: [
            {
              type: "text",
              text: `I encountered an error trying to summarize ${ticketId}: ${error.message}`,
            },
          ],
          isError: true,
          errorDetails: {
            message: error.message,
          },
        };
      }
    }
  );
};
