const express = require('express');

const app = express();
const PORT = 3000;

// Stage 0: Hello server
app.get('/', (req, res) => {
  res.send('Hello, server!');
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
