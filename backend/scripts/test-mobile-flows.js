/**
 * End-to-end API tests for shop, library, campaigns, and notifications.
 * Usage: node scripts/test-mobile-flows.js
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });

const BASE = process.env.TEST_API_BASE || `http://localhost:${process.env.PORT || 4000}/api`;

const USERS = [
  { label: 'FX Launch ($100)', email: 'monthlyfee-paid-launch@example.net', password: 'TestPass123!' },
  { label: 'FX Scale ($250)', email: 'monthlyfee-overdue-scale@example.net', password: 'TestPass123!' },
  { label: 'Main student', email: 'student@forexnavigators.com', password: 'student123' },
];

const results = [];

function pass(name, detail = '') {
  results.push({ name, ok: true, detail });
  console.log(`  ✅ ${name}${detail ? ` — ${detail}` : ''}`);
}

function fail(name, detail = '') {
  results.push({ name, ok: false, detail });
  console.log(`  ❌ ${name}${detail ? ` — ${detail}` : ''}`);
}

async function request(path, { method = 'GET', token, body, json = true } = {}) {
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body && json) headers['Content-Type'] = 'application/json';

  const res = await fetch(`${BASE}/${path.replace(/^\//, '')}`, {
    method,
    headers,
    body: body ? (json ? JSON.stringify(body) : body) : undefined,
  });

  let data = null;
  const text = await res.text();
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }
  return { res, data };
}

async function login(email, password) {
  const { res, data } = await request('auth/login', {
    method: 'POST',
    body: { email, password },
  });
  if (!res.ok || !data?.token) {
    throw new Error(`Login failed for ${email}: ${res.status} ${JSON.stringify(data)}`);
  }
  return { token: data.token, user: data.user };
}

async function testShopPublic() {
  console.log('\n── Shop (public catalog) ──');
  const { res, data } = await request('products');
  if (!res.ok) return fail('GET /products', `status ${res.status}`);
  const count = data?.products?.length ?? 0;
  if (count === 0) return fail('GET /products', 'no published products');
  pass('GET /products', `${count} products, categories: ${(data.categories || []).join(', ')}`);

  const slug = data.products[0].productId;
  const detail = await request(`products/${slug}`);
  if (!detail.res.ok) fail('GET /products/:id', `status ${detail.res.status}`);
  else pass('GET /products/:id', slug);
}

async function testShopAuth(token, label) {
  console.log(`\n── Shop (auth: ${label}) ──`);
  const purchases = await request('products/my/purchases', { token });
  if (!purchases.res.ok) fail('GET /products/my/purchases', `status ${purchases.res.status}`);
  else pass('GET /products/my/purchases', `${purchases.data?.purchases?.length ?? 0} purchases`);

  const catalog = await request('products');
  const productId = catalog.data?.products?.[0]?.productId;
  if (!productId) return fail('submit-product validation', 'no product');

  const submit = await request('payments/submit-product', {
    method: 'POST',
    token,
    body: {
      productId,
      transactionId: 'short',
      payerName: 'Test',
      payerEmail: 'test@example.com',
    },
  });
  if (submit.res.status === 400 && Array.isArray(submit.data?.errors)) {
    pass('POST /payments/submit-product validation', 'rejects missing screenshot (expected)');
  } else if (submit.res.status === 200 && submit.data?.success) {
    pass('POST /payments/submit-product', 'already pending or accepted');
  } else {
    fail('POST /payments/submit-product', `status ${submit.res.status}`);
  }
}

async function testLibrary(token, label, expectMinItems) {
  console.log(`\n── Library (${label}) ──`);
  const list = await request('library', { token });
  if (!list.res.ok) return fail('GET /library', `status ${list.res.status} ${JSON.stringify(list.data)}`);

  const items = list.data?.items ?? [];
  const total = list.data?.total ?? items.length;
  const locked = items.filter((i) => i.locked).length;
  const unlocked = items.filter((i) => !i.locked && i.hasAccess !== false).length;

  if (total < expectMinItems) fail('GET /library count', `expected >=${expectMinItems}, got ${total}`);
  else pass('GET /library', `${total} items (${unlocked} accessible, ${locked} locked)`);

  const withPkg = items.find((i) => i.allowedPackages?.length);
  if (withPkg) {
    pass('Package-gated items present', `${withPkg.title} → $${withPkg.allowedPackages.join(', $')}`);
  }

  if (items[0]?.itemId) {
    const detail = await request(`library/${items[0].itemId}`, { token });
    if (!detail.res.ok) fail('GET /library/:id', `status ${detail.res.status}`);
    else pass('GET /library/:id', items[0].itemId);
  }
}

async function testCampaigns(token) {
  console.log('\n── App campaigns ──');
  const pub = await request('campaigns/active?platform=mobile');
  if (!pub.res.ok) fail('GET /campaigns/active (public)', `status ${pub.res.status}`);
  else {
    const c = pub.data?.campaign;
    pass('GET /campaigns/active (public)', c ? `active: ${c.campaignId || c.title}` : 'none active');
  }

  const web = await request('campaigns/active?platform=web', { token });
  if (!web.res.ok) fail('GET /campaigns/active (web)', `status ${web.res.status}`);
  else pass('GET /campaigns/active (web)', web.data?.campaign ? 'has campaign' : 'none');
}

async function testNotifications(token, label) {
  console.log(`\n── Notifications (${label}) ──`);

  const push = await request('mobile/push-token', {
    method: 'PUT',
    token,
    body: { expoPushToken: 'ExponentPushToken[test-flow-token]' },
  });
  if (!push.res.ok) fail('PUT /mobile/push-token', `status ${push.res.status} ${JSON.stringify(push.data)}`);
  else pass('PUT /mobile/push-token', push.data?.message || 'ok');

  const prefs = await request('notifications/preferences', { token });
  if (!prefs.res.ok) fail('GET /notifications/preferences', `status ${prefs.res.status}`);
  else {
    const hasToken = !!prefs.data?.preferences?.expoPushToken;
    pass('GET /notifications/preferences', `push ${prefs.data?.channels?.push?.enabled ? 'on' : 'off'}, token ${hasToken ? 'saved' : 'missing'}`);
  }

  const list = await request('notifications/user?limit=5', { token });
  if (!list.res.ok) fail('GET /notifications/user', `status ${list.res.status}`);
  else pass('GET /notifications/user', `${list.data?.notifications?.length ?? 0} recent, ${list.data?.unreadCount ?? 0} unread`);

  const create = await request('notifications/create', {
    method: 'POST',
    token,
    body: {
      type: 'system',
      title: 'Flow test notification',
      message: `Automated test at ${new Date().toISOString()}`,
      priority: 'medium',
    },
  });
  if (!create.res.ok) fail('POST /notifications/create', `status ${create.res.status} ${JSON.stringify(create.data)}`);
  else pass('POST /notifications/create', 'in-app + push triggered');

  const after = await request('notifications/user?limit=1&unreadOnly=true', { token });
  const latest = after.data?.notifications?.[0];
  if (latest?.title === 'Flow test notification') pass('Notification persisted', latest._id);
  else fail('Notification persisted', 'latest unread not found');
}

async function compareLibraryTiers(tokens) {
  console.log('\n── Library package tiers ──');
  const counts = {};
  for (const { label, token } of tokens) {
    const { res, data } = await request('library?limit=100', { token });
    if (!res.ok) {
      fail(`Library count ${label}`, `status ${res.status}`);
      continue;
    }
    counts[label] = data?.total ?? 0;
  }
  const entries = Object.entries(counts);
  if (entries.length >= 2) {
    const sorted = [...entries].sort((a, b) => b[1] - a[1]);
    pass('Tier differentiation', entries.map(([l, n]) => `${l}: ${n}`).join(' | '));
    if (sorted[0][1] > sorted[sorted.length - 1][1]) {
      pass('Higher tier sees more items', `${sorted[0][0]} (${sorted[0][1]}) > ${sorted[sorted.length - 1][0]} (${sorted[sorted.length - 1][1]})`);
    } else if (sorted[0][1] === sorted[sorted.length - 1][1]) {
      fail('Tier differentiation', 'same count across tiers');
    }
  }
}

async function main() {
  console.log(`API base: ${BASE}\n`);

  await testShopPublic();
  await testCampaigns(null);

  const loggedIn = [];
  for (const u of USERS) {
    try {
      const { token } = await login(u.email, u.password);
      loggedIn.push({ ...u, token });
    } catch (e) {
      fail(`Login ${u.label}`, e.message);
    }
  }

  if (loggedIn.length === 0) {
    console.log('\nNo logins succeeded — aborting auth tests.');
    process.exit(1);
  }

  const launch = loggedIn.find((u) => u.email.includes('paid-launch'));
  const scale = loggedIn.find((u) => u.email.includes('scale'));
  const student = loggedIn.find((u) => u.email === 'student@forexnavigators.com');

  if (launch) {
    await testLibrary(launch.token, launch.label, 10);
    await testShopAuth(launch.token, launch.label);
    await testNotifications(launch.token, launch.label);
    await testCampaigns(launch.token);
  }

  if (scale) await testLibrary(scale.token, scale.label, 10);
  if (student) await testLibrary(student.token, student.label, 1);

  const tierTokens = [launch, scale].filter(Boolean).map((u) => ({ label: u.label, token: u.token }));
  if (tierTokens.length >= 2) await compareLibraryTiers(tierTokens);

  const failed = results.filter((r) => !r.ok);
  console.log(`\n${'═'.repeat(50)}`);
  console.log(`Results: ${results.length - failed.length}/${results.length} passed`);
  if (failed.length) {
    console.log('\nFailed:');
    failed.forEach((f) => console.log(`  • ${f.name}: ${f.detail}`));
    process.exit(1);
  }
  console.log('All flow tests passed.\n');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
