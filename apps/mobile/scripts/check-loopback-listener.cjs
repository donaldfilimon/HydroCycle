"use strict";

const assert = require("node:assert/strict");
const http = require("node:http");

const {
  LOOPBACK_HOST,
  installLoopbackListenerGuard,
  withLoopbackHost,
} = require("./loopback-listener-guard.cjs");

assert.deepEqual(withLoopbackHost([8081]), [8081, LOOPBACK_HOST]);
assert.deepEqual(withLoopbackHost([8081, 511]), [8081, LOOPBACK_HOST, 511]);
assert.deepEqual(withLoopbackHost([8081, "::1"]), [8081, "::1"]);
assert.deepEqual(withLoopbackHost([{ port: 8081, host: null }]), [
  { port: 8081, host: LOOPBACK_HOST },
]);
assert.deepEqual(withLoopbackHost(["/private/tmp/metro.sock"]), [
  "/private/tmp/metro.sock",
]);

installLoopbackListenerGuard();

const server = http.createServer();
server.listen(0, () => {
  try {
    const address = server.address();
    assert.notEqual(address, null);
    assert.equal(typeof address, "object");
    assert.equal(address.address, LOOPBACK_HOST);
    assert.equal(address.family, "IPv4");
    process.stdout.write(`Loopback listener guard: ${address.address}\n`);
  } finally {
    server.close();
  }
});
