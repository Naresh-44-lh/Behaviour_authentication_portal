// simulate role change notification and stats
async function run() {
  const base = 'http://localhost:8000';
  try {
    // login admin
    let r = await fetch(`${base}/auth/login`,{
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({username:'admin', password:'admin123'})
    });
    const adm = await r.json();
    const token = adm.token;
    console.log('admin token', token);
    // create new user
    r = await fetch(`${base}/auth/register`,{
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({username:'testuser', email:'t@t.com', password:'pass'})
    });
    console.log('register', await r.json());
    // login as testuser once
    r = await fetch(`${base}/auth/login`,{
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({username:'testuser', password:'pass'})
    });
    console.log('first login', await r.json());
    // admin change role
    r = await fetch(`${base}/admin/users/`,`
      // not available directly easier to update via new endpoint? just call our role change
    );
  } catch(e){console.error(e);}
}
run();
