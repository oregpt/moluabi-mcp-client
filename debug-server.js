// Debug script to catch server startup errors
import { spawn } from 'child_process';

console.log('Starting server with error capture...');

const server = spawn('npx', ['tsx', 'server/index.ts'], {
  stdio: ['inherit', 'pipe', 'pipe'],
  shell: true
});

server.stdout.on('data', (data) => {
  console.log('STDOUT:', data.toString());
});

server.stderr.on('data', (data) => {
  console.error('STDERR:', data.toString());
});

server.on('error', (error) => {
  console.error('Process error:', error);
});

server.on('exit', (code, signal) => {
  console.log(`Server exited with code ${code} and signal ${signal}`);
});

// Keep the process alive for a bit to capture output
setTimeout(() => {
  console.log('Stopping debug...');
  server.kill();
}, 10000);
