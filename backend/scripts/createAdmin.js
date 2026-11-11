import readline from 'node:readline/promises';
import { connectDB, disconnectDB } from '../src/config/db.js';
import User from '../src/models/User.js';
import { signupSchema } from '../src/validators/authValidators.js';

const listOnly = process.argv.includes('--list');

// Normal question (the answer is visible).
const ask = async (question) => {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  try {
    return await rl.question(question);
  } finally {
    rl.close();
  }
};

const confirmYes = async (question) => (await ask(`${question} (yes/no): `)).trim().toLowerCase() === 'yes';

// Question whose answer is not shown on screen. Pasting works.
const askHidden = (question) =>
  new Promise((resolve) => {
    const stdin = process.stdin;
    process.stdout.write(question);
    stdin.setRawMode(true);
    stdin.resume();
    stdin.setEncoding('utf8');
    let value = '';

    const onData = (chunk) => {
      for (const char of chunk) {
        if (char === '\u0003') process.exit(130); // Ctrl+C
        if (char === '\r' || char === '\n') {
          stdin.setRawMode(false);
          stdin.pause();
          stdin.off('data', onData);
          process.stdout.write('\n');
          return resolve(value);
        }
        if (char === '\u007f' || char === '\b') value = value.slice(0, -1);
        else value += char;
      }
      return undefined;
    };

    stdin.on('data', onData);
  });

const printFieldErrors = (issues) => {
  for (const issue of issues) {
    console.error(`  - ${issue.path.join('.') || 'input'}: ${issue.message}`);
  }
};

const listAdmins = async () => {
  const admins = await User.find({ role: 'admin' }).select('name email isEmailVerified createdAt');
  if (admins.length === 0) {
    console.log('No admin accounts exist yet.');
    return;
  }
  console.log(`Admin accounts (${admins.length}):`);
  for (const admin of admins) {
    console.log(
      `  - ${admin.name} <${admin.email}> (email verified: ${admin.isEmailVerified}, created: ${admin.createdAt.toISOString()})`,
    );
  }
};

const run = async () => {
  await connectDB();

  if (listOnly) {
    await listAdmins();
    return;
  }

  if (!process.stdin.isTTY) {
    throw new Error('Run this script in an interactive terminal (it asks questions).');
  }

  // 1. Email
  const emailInput = (await ask('Admin email: ')).trim();
  const emailResult = signupSchema.shape.email.safeParse(emailInput);
  if (!emailResult.success) {
    console.error('Invalid email:');
    printFieldErrors(emailResult.error.issues);
    process.exitCode = 1;
    return;
  }
  const email = emailResult.data;

  // 2. Existing account with this email?
  const existing = await User.findOne({ email });
  if (existing?.role === 'admin') {
    console.log(`${email} is already an admin. Nothing to do.`);
    return;
  }
  if (existing) {
    console.log(`A customer account named "${existing.name}" already exists with this email.`);
    if (!(await confirmYes('Promote it to admin? Its password stays the same'))) {
      console.log('Cancelled. No changes made.');
      return;
    }
    existing.role = 'admin';
    existing.isEmailVerified = true;
    await existing.save();
    console.log(`Done. ${email} is now an admin. Sign in with its existing password.`);
    return;
  }

  // 3. Warn if other admins exist
  const otherAdmins = await User.find({ role: 'admin' }).select('name email');
  if (otherAdmins.length > 0) {
    console.log('An admin already exists:');
    otherAdmins.forEach((admin) => console.log(`  - ${admin.name} <${admin.email}>`));
    if (!(await confirmYes('Create another admin anyway?'))) {
      console.log('Cancelled. No changes made.');
      return;
    }
  }

  // 4. Name and password
  const name = (await ask('Admin name: ')).trim();
  const password = await askHidden('Password (hidden): ');
  const confirmPassword = await askHidden('Confirm password (hidden): ');

  if (password !== confirmPassword) {
    console.error('The two passwords do not match. No account was created.');
    process.exitCode = 1;
    return;
  }

  const parsed = signupSchema.safeParse({ name, email, password });
  if (!parsed.success) {
    console.error('Please fix the following. No account was created:');
    printFieldErrors(parsed.error.issues);
    process.exitCode = 1;
    return;
  }

  // 5. Create (this trusted script is the only place a role is set)
  await User.create({ ...parsed.data, role: 'admin', isEmailVerified: true });
  console.log(`\nAdmin account created for ${parsed.data.email}. You can now sign in.`);
};

try {
  await run();
} catch (error) {
  console.error('Failed:', error.message);
  process.exitCode = 1;
} finally {
  await disconnectDB();
}