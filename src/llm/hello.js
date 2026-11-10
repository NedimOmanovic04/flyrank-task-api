const { completion } = require('./client');
completion([{ role: 'user', content: 'Reply with exactly the word ready.' }])
  .then(console.log).catch(error => { console.error(error.message); process.exitCode = 1; });
