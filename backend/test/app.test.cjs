const {test} = require('node:test');
const assert = require('node:assert/strict');
const {createApp} = require('../dist/app');
const {readEnvironment} = require('../dist/config/environment');

test('health route and exact CORS origin work on a real HTTP listener', async () => {
  const {app} = await createApp({NODE_ENV:'test',CORS_ORIGINS:'https://rami.example'});
  await app.listen(0,'127.0.0.1');
  try {
    const url = await app.getUrl();
    const response = await fetch(`${url}/api/health`,{headers:{Origin:'https://rami.example'}});
    assert.equal(response.status,200);
    assert.deepEqual(await response.json(),{status:'ok',service:'rami-api',multiplayerReady:true});
    assert.equal(response.headers.get('access-control-allow-origin'),'https://rami.example');
    const denied = await fetch(`${url}/api/health`,{headers:{Origin:'https://other.example'}});
    assert.equal(denied.headers.get('access-control-allow-origin'),null);
    assert.equal((await fetch(`${url}/api/rooms`)).status,401);
  } finally { await app.close(); }
});

test('deployment configuration accepts Render PORT and rejects invalid inputs',()=>{
  assert.equal(readEnvironment({PORT:'10000'}).port,10000);
  assert.deepEqual(readEnvironment({NODE_ENV:'production'}).corsOrigins,[]);
  assert.throws(()=>readEnvironment({PORT:'invalid'}));
  assert.throws(()=>readEnvironment({CORS_ORIGINS:'*'}));
  assert.throws(()=>readEnvironment({CORS_ORIGINS:'https://rami.example/path'}));
  for (const PORT of ['0', '65536', '1.5']) assert.throws(() => readEnvironment({PORT}));
  for (const TRUST_PROXY_HOPS of ['-1', '11', '1.5', 'invalid']) {
    assert.throws(() => readEnvironment({TRUST_PROXY_HOPS}));
  }
  assert.throws(() => readEnvironment({DATABASE_PATH:'  '}));
  assert.equal(readEnvironment({NODE_ENV:'test'}).databasePath, ':memory:');
  assert.deepEqual(readEnvironment({CORS_ORIGINS:' https://rami.example , http://localhost:3000 '}).corsOrigins,
    ['https://rami.example', 'http://localhost:3000']);
});
