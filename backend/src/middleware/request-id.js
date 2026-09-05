import crypto from 'node:crypto';

// SEC-08: validate/cap the client-supplied X-Request-Id so it cannot inject
// log content or overflow storage. Anything non-conforming falls back to a
// server-generated id.
const REQUEST_ID_PATTERN = /^[A-Za-z0-9_-]{1,64}$/;

export default function requestId(req, res, next) {
  const supplied = req.headers['x-request-id'];
  req.id =
    typeof supplied === 'string' && REQUEST_ID_PATTERN.test(supplied)
      ? supplied
      : crypto.randomUUID();
  res.setHeader('X-Request-Id', req.id);
  next();
}
