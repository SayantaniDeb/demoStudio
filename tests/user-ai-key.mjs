import assert from 'node:assert/strict';
import { requestGroqKey } from '../server/ai-key.mjs';
const original = process.env.GROQ_API_KEY;
process.env.GROQ_API_KEY = 'server-test';
try {
  assert.equal(
    requestGroqKey({ headers: { 'x-groq-api-key': 'gsk_test_user_key_12345' } }),
    'gsk_test_user_key_12345',
  );
  assert.equal(requestGroqKey({ headers: {} }), 'server-test');
  assert.throws(() => requestGroqKey({ headers: { 'x-groq-api-key': 'invalid' } }), /valid Groq/);
  assert.throws(() =>
    requestGroqKey({ headers: { 'x-groq-api-key': ['gsk_test_user_key_12345'] } }),
  );
  assert.equal(process.env.GROQ_API_KEY, 'server-test');
  console.log('PASS: user key precedence, request validation, server key unchanged.');
} finally {
  if (original === undefined) delete process.env.GROQ_API_KEY;
  else process.env.GROQ_API_KEY = original;
}
