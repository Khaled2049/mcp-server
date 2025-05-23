// src/index.ts
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { mcpServer } from "./server";

async function startApplication() {
  try {
    const transport = new StdioServerTransport();
    await mcpServer.connect(transport);
  } catch (e) {
    process.exit(1);
  }

  // const GET_STUDENT_SPEND_VARIABLES = {
  //   guildUuid: "47cbf684-7bfa-49b8-ae70-a80a90006b2f",
  //   employerId: "6307979a-db8d-437a-aa67-7cddd6e23e12",
  //   spendAsOf: "2024-03-21",
  //   capAsOf: "2024-03-11",
  //   product: "TUITION_ASSISTANCE",
  //   programUuid: "81be91c4-997e-499a-ae95-db53a7650223",
  // };
  // fetchStudentSpend(GET_STUDENT_SPEND_VARIABLES);
}

startApplication();
