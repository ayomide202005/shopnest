const collectErrors = (issues) => {
  const errors = {};
  for (const issue of issues) {
    const field = issue.path.join('.') || 'body';
    if (!errors[field]) errors[field] = issue.message;
  }
  return errors;
};

// Usage: router.post('/signup', validate(signupSchema), controller)
// On success, req.body is replaced by the cleaned data. On failure, responds 400 with
// { message, errors: { fieldName: 'first problem' } } so forms can show messages per field.
export default function validate(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.body ?? {});

    if (!result.success) {
      return res
        .status(400)
        .json({ message: 'Please correct the highlighted fields.', errors: collectErrors(result.error.issues) });
    }

    req.body = result.data;
    return next();
  };
}

// For query strings (?page=2&sort=price_asc). Express 5 makes req.query read-only,
// so the cleaned values are placed in res.locals.query. Empty values (?search=) count as "not provided".
export function validateQuery(schema) {
  return (req, res, next) => {
    const provided = Object.fromEntries(Object.entries(req.query).filter(([, value]) => value !== ''));
    const result = schema.safeParse(provided);

    if (!result.success) {
      return res
        .status(400)
        .json({ message: 'Invalid search or filter options.', errors: collectErrors(result.error.issues) });
    }

    res.locals.query = result.data;
    return next();
  };
}