import {Readable} from 'node:stream';
import {websiteMiddleware} from '../server/website.mjs';

export const config = {api: {bodyParser: false}};

export default function handler(req, res) {
  // Support both raw Node requests and Vercel's parsed request helpers.
  let input = req;
  if (req.body !== undefined) {
    const body = Buffer.isBuffer(req.body) ? req.body
      : typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
    input = Readable.from([body]);
    input.method = req.method;
    input.url = req.url;
    input.headers = req.headers;
  }
  return new Promise((resolve, reject) => {
    res.once('finish', resolve);
    res.once('close', resolve);
    res.once('error', reject);
    websiteMiddleware(input, res, () => {
      res.statusCode = 404;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({error: 'API endpoint not found.'}));
    });
  });
}
