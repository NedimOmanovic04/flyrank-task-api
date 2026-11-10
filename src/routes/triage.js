const express = require('express');
const { input, judgement } = require('../llm/schema');
const { classify } = require('../llm/triage');
const router = express.Router();

router.post('/triage', async (req, res, next) => {
  const parsed = input.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Expected only text, a nonblank string of up to 2000 characters' });
  if (process.env.LLM_STUB === '1') return res.json(judgement.parse({ category: 'other', confidence: 0 }));
  try {
    return res.json(await classify(parsed.data.text));
  } catch (error) {
    if (error.publicStatus) return res.status(error.publicStatus).json({ error: error.message });
    return next(error);
  }
});
module.exports = router;
