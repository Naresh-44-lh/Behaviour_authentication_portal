// simple test script using fetch (Node 18+)

async function test() {
  try {
    const base = 'http://localhost:8000';
    const loginResp = await fetch(`${base}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'admin', password: 'admin123' }),
    });
    const text = await loginResp.text();
    console.log('status', loginResp.status);
    console.log('body', text);
    try {
      const data = JSON.parse(text);
      console.log('parsed', data);
    } catch(e){}
  } catch (err) {
    console.error('error', err);
  }
}

test();
