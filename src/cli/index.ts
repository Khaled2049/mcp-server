#!/usr/bin/env ts-node

import { Cli, Builtins } from "clipanion";
import { commandList } from "./commands"; // Using the array export
import { disconnectClient } from "./services/McpClientService";

const cli = new Cli({
  binaryLabel: "MCP CLI Client",
  binaryName: "mcp-cli",
  binaryVersion: "1.0.0",
});

// Register all commands from the list
for (const command of commandList) {
  cli.register(command);
}

// Register built-in commands like --help and --version
cli.register(Builtins.HelpCommand);
cli.register(Builtins.VersionCommand);

// Graceful shutdown handling for SIGINT (Ctrl+C) and SIGTERM
const signals: NodeJS.Signals[] = ["SIGINT", "SIGTERM"];
signals.forEach((signal) => {
  process.on(signal, async () => {
    console.error(
      `\n[CLI] ${signal} received. Attempting graceful shutdown...`
    );
    await disconnectClient(); // Ensure client is disconnected on interrupt
    process.exit(128 + (signal === "SIGINT" ? 2 : 15));
  });
});

// Run the CLI with command line arguments
cli.run(process.argv.slice(2)).catch((error) => {
  // This catch is for unexpected errors from cli.run() itself
  console.error("[CLI] Critical error during CLI execution:", error);
  process.exitCode = 1; // Default error code
});
