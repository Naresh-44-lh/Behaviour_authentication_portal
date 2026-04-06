// simple test: create a user then delete it

async function run() {
  const base = 'http://localhost:8000';
  try {
    // login as admin
    let r = await fetch(`${base}/auth/login`, {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({username:'admin', password:'admin123'})
    });
    const d = await r.json();
    console.log('admin login', d);
    const token = d.token;
    // create user via admin
    // attempt to delete a specific id (change as needed)
    const uid = 6;
    r = await fetch(`${base}/admin/users/${uid}/delete`, {method:'POST', headers:{Authorization:`Bearer ${token}`}});
    console.log('delete status', r.status);
    const text = await r.text();
    console.log('delete response', text);
  } catch(e){console.error(e);}
}
run();
