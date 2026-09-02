"use strict";

const net = require("node:net");

const LOOPBACK_HOST = "127.0.0.1";
const INSTALL_MARK = Symbol.for("hydrocycle.loopback-listener-guard");

/**
 * Force every TCP listener onto the explicit IPv4 loopback address.
 * Unix-domain sockets remain unchanged.
 */
function withLoopbackHost(args) {
  if (typeof args[0] === "number") {
    return typeof args[1] === "string"
      ? [args[0], LOOPBACK_HOST, ...args.slice(2)]
      : [args[0], LOOPBACK_HOST, ...args.slice(1)];
  }

  if (
    args[0] !== null &&
    typeof args[0] === "object" &&
    Object.prototype.hasOwnProperty.call(args[0], "port")
  ) {
    return [{ ...args[0], host: LOOPBACK_HOST }, ...args.slice(1)];
  }

  return args;
}

function installLoopbackListenerGuard() {
  if (net.Server.prototype[INSTALL_MARK]) return;

  const originalListen = net.Server.prototype.listen;
  Object.defineProperty(net.Server.prototype, INSTALL_MARK, {
    value: true,
  });
  net.Server.prototype.listen = function hydrocycleLoopbackListen(...args) {
    return originalListen.apply(this, withLoopbackHost(args));
  };
}

module.exports = {
  LOOPBACK_HOST,
  installLoopbackListenerGuard,
  withLoopbackHost,
};
