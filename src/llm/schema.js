const { z } = require('zod');

const input = z.strictObject({ text: z.string().max(2000).trim().min(1) });
const judgement = z.strictObject({
  category: z.enum(['bug', 'feature', 'maintenance', 'other']),
  confidence: z.number().min(0).max(1)
}).refine(value => value.category !== 'other' || value.confidence < 0.5, {
  message: 'Use confidence below 0.5 for other'
});
module.exports = { input, judgement };
