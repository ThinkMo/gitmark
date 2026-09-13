const assert = require("assert");
const childProcess = require("child_process");
const fs = require("fs");

const tests = [];

function test(name, fn) {
  tests.push({ name, fn });
}

function pngSize(path) {
  const bytes = fs.readFileSync(path);
  const signature = bytes.subarray(0, 8).toString("hex");
  assert.strictEqual(signature, "89504e470d0a1a0a", `${path} must be a PNG`);
  return {
    width: bytes.readUInt32BE(16),
    height: bytes.readUInt32BE(20),
  };
}

test("release manifest identifies the current publisher", () => {
  const manifest = JSON.parse(fs.readFileSync("manifest.json", "utf8"));

  assert.strictEqual(manifest.version, "1.0.2");
  assert.strictEqual(manifest.homepage_url, "https://github.com/ThinkMo/gitmark");
  assert.strictEqual(manifest.author, "thinkmo");
  assert.match(manifest.description, /^Edit and commit GitHub Markdown files/);
  assert.ok(manifest.description.length <= 132);
});

test("Chrome Web Store screenshots use the required 1280 by 800 size", () => {
  for (const path of [
    "images/store/01-popup.png",
    "images/store/02-editor.png",
  ]) {
    assert.deepStrictEqual(pngSize(path), { width: 1280, height: 800 });
  }
});

test("Chrome Web Store promo image uses the required 440 by 280 size", () => {
  assert.deepStrictEqual(pngSize("images/store/promo-440x280.png"), {
    width: 440,
    height: 280,
  });
});

test("PowerShell release builder packages only runtime files", () => {
  const build = childProcess.spawnSync(
    "powershell.exe",
    ["-NoProfile", "-ExecutionPolicy", "Bypass", "-File", "build.ps1"],
    { encoding: "utf8" }
  );
  assert.strictEqual(build.status, 0, build.stderr || build.stdout);

  const zipPath = "dist/gitmark-v1.0.2.zip";
  assert.ok(fs.existsSync(zipPath), `${zipPath} was not created`);
  const listing = childProcess.spawnSync("tar", ["-tf", zipPath], {
    encoding: "utf8",
  });
  assert.strictEqual(listing.status, 0, listing.stderr);
  const entries = listing.stdout.split(/\r?\n/).filter(Boolean);

  assert.ok(entries.includes("manifest.json"));
  assert.ok(entries.includes("editor/editor.html"));
  assert.ok(entries.every((entry) => !entry.startsWith("images/")));
  assert.ok(entries.every((entry) => !entry.startsWith("tests/")));
});

let failures = 0;
for (const { name, fn } of tests) {
  try {
    fn();
    console.log(`PASS ${name}`);
  } catch (error) {
    failures++;
    console.error(`FAIL ${name}`);
    console.error(error.stack || error);
  }
}
process.exitCode = failures ? 1 : 0;
