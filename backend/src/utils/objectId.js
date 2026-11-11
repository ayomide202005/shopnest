// True only for a 24-character hex id (Mongoose's own check also accepts some 12-character strings).
export const isObjectId = (value) => typeof value === 'string' && /^[a-f0-9]{24}$/i.test(value);