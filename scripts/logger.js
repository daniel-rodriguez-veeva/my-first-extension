 import pino from 'pino';
import path from 'path';
import os from 'os';

// Define your custom log path
const logPath = path.join(os.homedir(), '.gemini/extensions/my-first-extension', 'mcp-debug.log');

const logger = pino({
  level: 'debug'
}, pino.multistream([
  { stream: process.stderr }, // Send to the MCP Host 
  { stream: pino.destination(logPath) } // Send to your local project folder
]));

export default logger;