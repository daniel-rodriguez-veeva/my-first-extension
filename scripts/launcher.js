#!/usr/bin/env node
/**
 * MCP Server Launcher
 * 
 * This script ensures that the extension is built before starting the MCP server.
 * This is necessary for installations from source (e.g., via 'gemini extensions install <GITHUB URL>')
 * where the 'dist/' directory is not included in the repository.
 */

import { existsSync } from 'node:fs';
import { spawn, spawnSync } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const extensionPath = join(__dirname, '..');
const distPath = join(extensionPath, 'dist', 'index.js');
const nodeModulesPath = join(extensionPath, 'node_modules');

/**
 * Ensures the extension is built locally.
 */
function ensureBuild() {
  if (!existsSync(distPath)) {
    process.stderr.write('MCP server entry point not found. Initializing local build...\n');
    
    // 1. Install dependencies if node_modules is missing
    if (!existsSync(nodeModulesPath)) {
      process.stderr.write('Installing dependencies (npm install)...\n');
      const installResult = spawnSync('npm', ['install'], { 
        cwd: extensionPath, 
        stdio: 'inherit',
        shell: true // Useful for Windows support
      });
      
      if (installResult.status !== 0) {
        process.stderr.write('Failed to install dependencies.\n');
        process.exit(1);
      }
    }
    
    // 2. Run the build script defined in package.json
    process.stderr.write('Building extension (npm run build)...\n');
    const buildResult = spawnSync('npm', ['run', 'build'], { 
      cwd: extensionPath, 
      stdio: 'inherit',
      shell: true
    });
    
    if (buildResult.status !== 0) {
      process.stderr.write('Failed to build extension.\n');
      process.exit(1);
    }
    
    process.stderr.write('Build completed successfully!\n');
  }
}

/**
 * Starts the MCP server.
 */
function startServer() {
  // We use spawn to execute the server as a child process and inherit stdio.
  // This is critical for MCP communication which happens over stdin/stdout.
  const server = spawn('node', [distPath], {
    cwd: extensionPath,
    stdio: ['inherit', 'inherit', 'inherit'],
    env: process.env
  });

  server.on('exit', (code) => {
    process.exit(code ?? 0);
  });

  server.on('error', (err) => {
    process.stderr.write(`Failed to start MCP server: ${err.message}\n`);
    process.exit(1);
  });
}

// Execute the lifecycle
ensureBuild();
startServer();
