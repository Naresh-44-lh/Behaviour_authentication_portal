(async () => {
  try {
    const res = await fetch('http://localhost:8000/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'naresh', email: 'naresh@gmail.com', password: 'password123' })
    });
    const data = await res.text();
    console.log(res.status, data);
  } catch (err) {
    console.error('fetch error', err);
  }
})();
