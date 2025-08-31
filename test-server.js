// Simple test to check if the server can start
import express from 'express';

const app = express();
const port = 5000;

app.get('/', (req, res) => {
  res.send('Test server is running!');
});

app.listen(port, () => {
  console.log(`Test server running on http://localhost:${port}`);
}).on('error', (err) => {
  console.error('Server error:', err);
});
