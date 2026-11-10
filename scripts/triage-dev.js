// Run the same Express app for local triage without provisioning the task database.
const app = require('../server');
app.listen(Number(process.env.PORT || 3000), '127.0.0.1');
