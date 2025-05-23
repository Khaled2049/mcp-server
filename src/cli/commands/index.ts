// src/cli/commands/index.ts
export { AddCommand } from "./add.command";
export { QueryCommand } from "./query.command";
export { TextToSqlCommand } from "./textToSql.command";
export { GreetingCommand } from "./greeting.command";
export { SchemaCommand } from "./schema.command";
export { ChatCommand } from "./chat.command";

import { AddCommand as _AddCommand } from "./add.command";
import { QueryCommand as _QueryCommand } from "./query.command";
import { TextToSqlCommand as _TextToSqlCommand } from "./textToSql.command";
import { GreetingCommand as _GreetingCommand } from "./greeting.command";
import { SchemaCommand as _SchemaCommand } from "./schema.command";
import { ChatCommand as _ChatCommand } from "./chat.command";

export const commandList = [
  _AddCommand,
  _QueryCommand,
  _TextToSqlCommand,
  _GreetingCommand,
  _SchemaCommand,
  _ChatCommand,
];
