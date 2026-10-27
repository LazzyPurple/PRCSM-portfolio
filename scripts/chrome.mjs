// CDP transport adapted from Ardia apps/site/scripts/hero-posters.mjs.
// https://github.com/mantrakp04/ardia — Copyright 2026 Mantra Patel, Apache-2.0.
// SPDX-License-Identifier: Apache-2.0
// Modified: isolated Windows Chrome, bounded requests and guarded cleanup.
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdir, mkdtemp, readFile, rm } from "node:fs/promises";
import { resolve, sep, basename } from "node:path";

export const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

export async function launchChrome(directory) {
  const output = resolve(directory);
  await mkdir(output, { recursive: true });
  const profile = await mkdtemp(resolve(output, "chrome-"));
  const proc = spawn(process.env.CHROME ?? "C:/Program Files/Google/Chrome/Application/chrome.exe", [
    "--headless=new", "--remote-debugging-port=0", `--user-data-dir=${profile}`,
    "--no-first-run", "--no-default-browser-check", "--disable-extensions", "--enable-gpu",
    "--window-size=1440,900", "about:blank",
  ], { stdio: "ignore", windowsHide: true });
  let socket, send, launchError, nextId = 0;
  const pending = new Map(), events = [], errors = [];
  proc.on("error", error => { launchError = error; });
  const close = async () => {
    if (socket?.readyState === WebSocket.OPEN) await send("Browser.close", {}, undefined, 2000).catch(() => {});
    socket?.close();
    await sleep(300);
    if (proc.exitCode === null) proc.kill();
    assert.ok(profile.startsWith(output + sep) && basename(profile).startsWith("chrome-"));
    await rm(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 })
      .catch(error => console.warn(`Chrome profile retained: ${error.message}`));
  };
  try {
    let port;
    for (let i = 0; i < 100 && !port; i++) {
      if (launchError) throw launchError;
      port = await readFile(resolve(profile, "DevToolsActivePort"), "utf8").then(text => Number(text.split("\n")[0])).catch(() => null);
      if (!port) await sleep(100);
    }
    assert.ok(port, "Chrome did not start within 10 seconds");
    const { webSocketDebuggerUrl } = await fetch(`http://127.0.0.1:${port}/json/version`).then(res => res.json());
    socket = new WebSocket(webSocketDebuggerUrl);
    await new Promise((resolve, reject) => { socket.onopen = resolve; socket.onerror = reject; });
    socket.onmessage = event => {
      const message = JSON.parse(event.data);
      if (message.method) {
        events.push(message);
        if (message.method === "Runtime.exceptionThrown" || (message.method === "Log.entryAdded" && message.params.entry.level === "error")) errors.push(message);
      }
      const waiter = pending.get(message.id);
      if (!waiter) return;
      clearTimeout(waiter.timeout); pending.delete(message.id);
      if (message.error) waiter.reject(new Error(JSON.stringify(message.error)));
      else waiter.resolve(message.result);
    };
    socket.onclose = () => {
      for (const waiter of pending.values()) { clearTimeout(waiter.timeout); waiter.reject(new Error("Chrome connection closed")); }
      pending.clear();
    };
    send = (method, params = {}, sessionId, timeoutMs = 30000) => new Promise((resolve, reject) => {
      const id = ++nextId;
      const timeout = setTimeout(() => { pending.delete(id); reject(new Error(`${method} timed out`)); }, timeoutMs);
      pending.set(id, { resolve, reject, timeout });
      socket.send(JSON.stringify({ id, method, params, sessionId }));
    });
    const { targetId } = await send("Target.createTarget", { url: "about:blank" });
    const { sessionId } = await send("Target.attachToTarget", { targetId, flatten: true });
    const page = (method, params) => send(method, params, sessionId);
    const evaluate = async expression => {
      const result = await page("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true });
      if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description ?? result.exceptionDetails.text);
      return result.result.value;
    };
    const waitFor = async expression => {
      const deadline = Date.now() + 30000;
      while (!(await evaluate(expression))) {
        if (Date.now() > deadline) throw new Error(`Timed out: ${expression}`);
        await sleep(100);
      }
    };
    return { send, page, evaluate, waitFor, events, errors, close };
  } catch (error) { await close(); throw error; }
}
