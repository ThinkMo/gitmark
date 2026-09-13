const assert = require("assert");
const fs = require("fs");
const vm = require("vm");

const tests = [];

function test(name, fn) {
  tests.push({ name, fn });
}

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

class FakeElement {
  constructor() {
    this.classList = { add() {}, remove() {} };
    this.dataset = {};
    this.disabled = false;
    this.listeners = new Map();
    this.parentElement = { after() {} };
    this.style = {};
    this.textContent = "";
    this.value = "";
  }

  addEventListener(type, listener) {
    const listeners = this.listeners.get(type) || [];
    listeners.push(listener);
    this.listeners.set(type, listeners);
  }

  fire(type) {
    const listener = (this.listeners.get(type) || [])[0];
    if (!listener) return undefined;
    return listener({ preventDefault() {}, target: this });
  }

  focus() {}
  prepend() {}
}

function loadPopup({ query, sendMessage }) {
  const elements = new Map();
  const ids = [
    "tokenState",
    "token",
    "save",
    "clear",
    "openHere",
    "tabHint",
    "newFile",
    "langSelect",
  ];
  ids.forEach((id) => elements.set(id, new FakeElement()));
  elements.get("openHere").disabled = true;

  let statusElement;
  elements.get("save").parentElement.after = (element) => {
    statusElement = element;
  };

  let closeCount = 0;
  const document = {
    body: new FakeElement(),
    documentElement: { setAttribute() {} },
    createElement: () => new FakeElement(),
    getElementById: (id) => elements.get(id) || null,
    querySelectorAll: () => [],
  };
  const context = {
    URL,
    chrome: {
      runtime: { sendMessage },
      tabs: { query },
    },
    document,
    getAuthenticatedUser: async () => ({ login: "tester" }),
    getLang: () => "zh",
    getToken: async () => "",
    setLang() {},
    setTimeout() {},
    t: (key, vars) =>
      vars?.error ? `${key}: ${vars.error}` : key,
    window: { close: () => closeCount++ },
  };

  const source = fs
    .readFileSync("popup/popup.js", "utf8")
    .replace(/import\s*\{[\s\S]*?\}\s*from\s*"[^"]+";\s*/g, "")
    .replace(
      /initTabShortcut\(\);\s*$/,
      "globalThis.__initPromise = initTabShortcut();"
    );
  vm.runInNewContext(source, context, { filename: "popup/popup.js" });

  return {
    context,
    elements,
    get closeCount() {
      return closeCount;
    },
    get statusElement() {
      return statusElement;
    },
  };
}

function loadBackground(createTab) {
  let listener;
  const context = {
    URL,
    chrome: {
      runtime: {
        getURL: (path) => `chrome-extension://test/${path}`,
        onMessage: { addListener: (fn) => (listener = fn) },
      },
      tabs: { create: createTab },
    },
  };
  vm.runInNewContext(
    fs.readFileSync("src/background.js", "utf8"),
    context,
    { filename: "src/background.js" }
  );
  return listener;
}

function loadContent(sendMessage = async () => ({ ok: true })) {
  const elements = new Map();
  const messages = [];
  const document = {
    body: {
      appendChild(element) {
        elements.set(element.id, element);
      },
      classList: { add() {}, remove() {} },
    },
    addEventListener() {},
    createElement() {
      const element = new FakeElement();
      element.remove = () => elements.delete(element.id);
      return element;
    },
    getElementById: (id) => elements.get(id) || null,
    querySelector: () => null,
  };
  const location = {
    pathname: "/owner/repo/blob/main/docs/one.md",
  };
  const history = {
    pushState() {},
    replaceState() {},
  };
  const context = {
    chrome: {
      runtime: {
        async sendMessage(message) {
          messages.push(message);
          return sendMessage(message);
        },
      },
      storage: {
        local: { get(_key, callback) { callback({}); } },
        onChanged: { addListener() {} },
      },
    },
    document,
    history,
    location,
    setTimeout(callback) {
      callback();
    },
    window: { addEventListener() {} },
  };
  vm.runInNewContext(
    fs.readFileSync("src/content.js", "utf8"),
    context,
    { filename: "src/content.js" }
  );
  return { context, elements, history, location, messages };
}

function loadI18n(storedLanguage) {
  const context = {
    chrome: { storage: { local: { set() {} } } },
    localStorage: {
      getItem: () => storedLanguage,
      setItem() {},
    },
  };
  const source = `${fs
    .readFileSync("src/i18n.js", "utf8")
    .replace(/export\s+/g, "")}\nglobalThis.__i18n = { getLang, t };`;
  vm.runInNewContext(source, context, { filename: "src/i18n.js" });
  return context.__i18n;
}

function loadEditorPreload(getStoredValue) {
  const attributes = {};
  const context = {
    document: {
      documentElement: {
        setAttribute(name, value) {
          attributes[name] = value;
        },
      },
    },
    localStorage: { getItem: getStoredValue },
    window: { matchMedia: () => ({ matches: false }) },
  };
  vm.runInNewContext(
    fs.readFileSync("editor/preload.js", "utf8"),
    context,
    { filename: "editor/preload.js" }
  );
  return attributes;
}

test("English is used when no language preference is stored", () => {
  const i18n = loadI18n(null);

  assert.strictEqual(i18n.getLang(), "en");
  assert.strictEqual(i18n.t("newFile"), "✎ New file");
});

test("a stored language preference overrides the English default", () => {
  const i18n = loadI18n("zh");

  assert.strictEqual(i18n.getLang(), "zh");
  assert.strictEqual(i18n.t("newFile"), "✎ 新建");
});

test("editor preload marks the initial document as English", () => {
  const attributes = loadEditorPreload(() => null);

  assert.strictEqual(attributes.lang, "en");
});

test("GitHub edit button defaults to an English accessible label", () => {
  const page = loadContent();

  assert.strictEqual(
    page.elements.get("gmh-edit-btn").title,
    "Edit this file in GitMark"
  );
});

test("new-file action is bound before active-tab lookup completes", () => {
  const tabLookup = deferred();
  const popup = loadPopup({
    query: () => tabLookup.promise,
    sendMessage: async () => ({ ok: true }),
  });

  assert.strictEqual(
    (popup.elements.get("newFile").listeners.get("click") || []).length,
    1
  );
  tabLookup.resolve([]);
});

test("edit-current stays open until the editor tab is confirmed", async () => {
  const acknowledgement = deferred();
  let sentMessage;
  const popup = loadPopup({
    query: async () => [
      { url: "https://github.com/owner/repo/blob/main/README.md" },
    ],
    sendMessage: (message) => {
      sentMessage = message;
      return acknowledgement.promise;
    },
  });
  await popup.context.__initPromise;

  const click = popup.elements.get("openHere").fire("click");
  assert.strictEqual(popup.closeCount, 0);
  assert.strictEqual(sentMessage.params.path, "README.md");

  acknowledgement.resolve({ ok: true });
  await click;
  assert.strictEqual(popup.closeCount, 1);
});

test("popup reports an editor-open failure without closing", async () => {
  const popup = loadPopup({
    query: async () => [],
    sendMessage: async () => ({ ok: false, error: "tab creation blocked" }),
  });
  await popup.context.__initPromise;

  await popup.elements.get("newFile").fire("click");

  assert.strictEqual(popup.closeCount, 0);
  assert.match(popup.statusElement.textContent, /tab creation blocked/);
});

test("background acknowledges only after Chrome creates the tab", async () => {
  const created = deferred();
  const listener = loadBackground(() => created.promise);
  let response;

  const keepChannelOpen = listener(
    { type: "OPEN_EDITOR", params: { mode: "new" } },
    {},
    (value) => (response = value)
  );

  assert.strictEqual(keepChannelOpen, true);
  assert.strictEqual(response, undefined);

  created.resolve({ id: 42 });
  await new Promise((resolve) => setImmediate(resolve));
  assert.strictEqual(response.ok, true);
});

test("background returns the tab-creation error to the sender", async () => {
  const created = deferred();
  created.promise.catch(() => {});
  const listener = loadBackground(() => created.promise);
  let response;

  listener(
    { type: "OPEN_EDITOR", params: { mode: "new" } },
    {},
    (value) => (response = value)
  );
  created.reject(new Error("tab creation blocked"));
  await new Promise((resolve) => setImmediate(resolve));

  assert.strictEqual(response.ok, false);
  assert.match(response.error, /tab creation blocked/);
});

test("GitHub SPA navigation updates the existing edit button target", async () => {
  const page = loadContent();
  const button = page.elements.get("gmh-edit-btn");

  await button.fire("click");
  assert.strictEqual(page.messages.at(-1).params.path, "docs/one.md");

  page.location.pathname = "/owner/repo/blob/main/docs/two.md";
  page.history.pushState({}, "", page.location.pathname);
  await page.elements.get("gmh-edit-btn").fire("click");

  assert.strictEqual(page.messages.at(-1).params.path, "docs/two.md");
});

test("GitHub edit button exposes an editor-open failure", async () => {
  const page = loadContent(async () => ({
    ok: false,
    error: "tab creation blocked",
  }));
  const button = page.elements.get("gmh-edit-btn");

  await button.fire("click");

  assert.match(button.title, /tab creation blocked/);
});

(async () => {
  let failures = 0;
  for (const { name, fn } of tests) {
    try {
      await fn();
      console.log(`PASS ${name}`);
    } catch (error) {
      failures++;
      console.error(`FAIL ${name}`);
      console.error(error.stack || error);
    }
  }
  process.exitCode = failures ? 1 : 0;
})();
