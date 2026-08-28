import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { User, Customer, AttendanceLog, QRPool } from '@/models';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

// Weekly data backup: exports the app's collections as JSON and commits
// them into a separate private GitHub repo, so there's a rolling history
// of snapshots independent of the (free-tier, no-automated-backup)
// MongoDB Atlas cluster this app runs on.
//
// Triggered by Vercel Cron (see vercel.json). Vercel automatically sends
// `Authorization: Bearer <CRON_SECRET>` on cron-triggered requests when
// the CRON_SECRET env var is set, which is what's checked below - this
// keeps the endpoint from being triggerable by anyone who finds the URL.

interface GithubPutResult {
  ok: boolean;
  path: string;
  error?: string;
}

async function githubPutFile(params: {
  owner: string;
  repo: string;
  token: string;
  path: string;
  content: string;
  message: string;
}): Promise<GithubPutResult> {
  const { owner, repo, token, path, content, message } = params;
  const url = `https://api.github.com/repos/${owner}/${repo}/contents/${path}`;
  const headers = {
    Authorization: `Bearer ${token}`,
    Accept: 'application/vnd.github+json',
    'Content-Type': 'application/json',
  };

  // Look up the file's current sha (if it already exists) so this is safe
  // to re-run on the same day without failing.
  let sha: string | undefined;
  const existing = await fetch(url, { headers });
  if (existing.ok) {
    const existingJson = await existing.json();
    sha = existingJson.sha;
  }

  const putRes = await fetch(url, {
    method: 'PUT',
    headers,
    body: JSON.stringify({
      message,
      content: Buffer.from(content, 'utf-8').toString('base64'),
      ...(sha ? { sha } : {}),
    }),
  });

  if (!putRes.ok) {
    const errBody = await putRes.text();
    return { ok: false, path, error: `${putRes.status} ${errBody.slice(0, 300)}` };
  }
  return { ok: true, path };
}

export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  const token = process.env.GITHUB_BACKUP_TOKEN;
  const repoFull = process.env.GITHUB_BACKUP_REPO; // e.g. "Ardeekew13/qr-discount-tracker-backup"
  if (!token || !repoFull) {
    return NextResponse.json(
      { error: 'GITHUB_BACKUP_TOKEN / GITHUB_BACKUP_REPO not configured' },
      { status: 500 }
    );
  }
  const [owner, repo] = repoFull.split('/');

  await connectDB();

  // Never back up passwordHash - everything else here is business data,
  // not credentials.
  const [users, customers, attendanceLogs, qrPool] = await Promise.all([
    User.find({}).select('-passwordHash -loginAttempts -lockUntil').lean(),
    Customer.find({}).lean(),
    AttendanceLog.find({}).lean(),
    QRPool.find({}).lean(),
  ]);

  const dateStamp = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  const folder = `backups/${dateStamp}`;

  const files: { name: string; data: unknown }[] = [
    { name: 'users.json', data: users },
    { name: 'customers.json', data: customers },
    { name: 'attendanceLogs.json', data: attendanceLogs },
    { name: 'qrPool.json', data: qrPool },
  ];

  const results: GithubPutResult[] = [];
  for (const file of files) {
    const result = await githubPutFile({
      owner,
      repo,
      token,
      path: `${folder}/${file.name}`,
      content: JSON.stringify(file.data, null, 2),
      message: `Backup ${dateStamp}: ${file.name}`,
    });
    results.push(result);
  }

  const failed = results.filter((r) => !r.ok);
  if (failed.length > 0) {
    return NextResponse.json({ success: false, results }, { status: 500 });
  }

  return NextResponse.json({ success: true, date: dateStamp, results });
}
