const assert = require("node:assert/strict");
const { relative, sep } = require("node:path");
const { setTimeout: delay } = require("node:timers/promises");
const vscode = require("vscode");

async function waitFor(check, description) {
  const deadline = Date.now() + 20_000;
  while (Date.now() < deadline) {
    if (await check()) {
      return;
    }
    await delay(100);
  }
  assert.fail(description);
}

async function definition(document, offset, declaration, name) {
  const start = declaration.getText().indexOf("(func " + name) + "(func ".length;
  const range = new vscode.Range(
    declaration.positionAt(start),
    declaration.positionAt(start + name.length),
  );
  await waitFor(async () => {
    const results = await vscode.commands.executeCommand(
      "vscode.executeDefinitionProvider",
      document.uri,
      document.positionAt(offset),
    );
    return results?.some((result) => {
      const uri = result.targetUri ?? result.uri;
      const actual = result.targetSelectionRange ?? result.range;
      return uri.toString() === declaration.uri.toString() && actual.isEqual(range);
    });
  }, "定義の位置が宣言と一致しない。");
}

async function checkSettlingHint(module, basis) {
  await vscode.window.showTextDocument(module);
  const basisEditor = await vscode.window.showTextDocument(basis, vscode.ViewColumn.Beside);
  const position = new vscode.Position(0, "(module settling".length);
  const range = module.lineAt(0).range;
  const hints = (requestedRange) =>
    vscode.commands.executeCommand("vscode.executeInlayHintProvider", module.uri, requestedRange);

  async function checkHint(ticks) {
    await waitFor(async () => {
      const results = await hints(range);
      return results?.length === 1
        && results[0].label === `定常化 ≤ ${ticks} tick`
        && results[0].position.isEqual(position)
        && results[0].kind === undefined
        && !results[0].textEdits?.length
        && results[0].tooltip?.includes("固定入力");
    }, `モジュール名の直後に定常化 ≤ ${ticks} tick のヒントがない。`);
  }

  await checkHint(1);
  assert.deepEqual(await hints(new vscode.Range(range.start, position)), []);

  const original = "(def y (nor x x))";
  const edited = "(def z (nor x x)) (def y (nor z z))";
  const start = basis.getText().indexOf(original);
  assert.ok(start >= 0);
  const replace = (before, after) => basisEditor.edit((edit) =>
    edit.replace(new vscode.Range(basis.positionAt(start), basis.positionAt(start + before.length)), after));
  assert.ok(await replace(original, edited));
  assert.ok(basis.isDirty);
  assert.ok(!module.isDirty);
  await checkHint(2);
  assert.ok(await replace(edited, original));
  await checkHint(1);
}

function checkSemanticPalette() {
  const settings = vscode.workspace.getConfiguration("editor").inspect("semanticTokenColorCustomizations");
  const kinds = ["ncg2Namespace", "ncg2Function", "ncg2Module", "ncg2Signal", "ncg2Port"];
  function colorsFor(theme) {
    const defaults = Object.entries(settings.defaultValue)
      .find(([selector]) => selector.includes(`[${theme}]`));
    assert.ok(defaults, `${theme} に配色の既定値がない。`);
    const rules = defaults[1].rules;
    assert.deepEqual(Object.keys(rules).sort(), kinds.map((kind) => `${kind}:ncg2`).sort());
    const colors = Object.values(rules);
    assert.equal(new Set(colors).size, kinds.length, `${theme} で識別子の色が区別できない。`);
    return colors;
  }
  assert.notDeepEqual(colorsFor("Dark 2026"), colorsFor("Light 2026"));
}

async function checkEditorNavigation(document) {
  await vscode.window.showTextDocument(document);
  const source = document.getText();
  function nameRange(name, start = 0) {
    const offset = source.indexOf(name, start);
    assert.ok(offset >= 0, name);
    return new vscode.Range(document.positionAt(offset), document.positionAt(offset + name.length));
  }

  const symbols = await vscode.commands.executeCommand("vscode.executeDocumentSymbolProvider", document.uri);
  const namespace = symbols?.find((symbol) => symbol.name === "palette");
  const flip = namespace?.children?.find((symbol) => symbol.name === "flip");
  const relay = namespace?.children?.find((symbol) => symbol.name === "relay");
  assert.equal(namespace?.kind, vscode.SymbolKind.Namespace);
  assert.equal(flip?.kind, vscode.SymbolKind.Function);
  assert.equal(relay?.kind, vscode.SymbolKind.Module);
  assert.ok(relay.selectionRange.isEqual(nameRange("relay", source.indexOf("(module relay"))));

  async function checkHover(range, expected) {
    const hovers = await vscode.commands.executeCommand("vscode.executeHoverProvider", document.uri, range.start);
    assert.ok(hovers?.some((hover) => hover.range?.isEqual(range)
      && hover.contents.some((content) => {
        const text = typeof content === "string" ? content : content.value;
        return expected.every((part) => text.includes(part));
      })), JSON.stringify(hovers));
  }

  const reference = nameRange("wire", source.indexOf("(nor wire"));
  const call = nameRange("flip", source.indexOf("(flip incoming"));
  await checkHover(reference, ["内部信号", "wire", "bits", "1"]);
  await checkHover(call, ["::palette::flip", "in", "source", "out", "result"]);

  const legend = await vscode.commands.executeCommand("vscode.provideDocumentSemanticTokensLegend", document.uri);
  const tokens = await vscode.commands.executeCommand("vscode.provideDocumentSemanticTokens", document.uri);
  assert.ok(legend && tokens?.data.length);
  const declarationIndex = legend.tokenModifiers.indexOf("declaration");
  assert.ok(declarationIndex >= 0);
  const sites = [];
  let line = 0;
  let column = 0;
  for (let i = 0; i < tokens.data.length; i += 5) {
    const [deltaLine, deltaColumn, length, kind, modifiers] = tokens.data.subarray(i, i + 5);
    line += deltaLine;
    column = deltaLine === 0 ? column + deltaColumn : deltaColumn;
    sites.push({
      range: new vscode.Range(line, column, line, column + length),
      kind: legend.tokenTypes[kind],
      declaration: Boolean(modifiers & (1 << declarationIndex)),
    });
  }

  const expected = [
    [nameRange("palette"), "ncg2Namespace", true],
    [nameRange("flip"), "ncg2Function", true],
    [nameRange("relay", source.indexOf("(module relay")), "ncg2Module", true],
    [nameRange("wire"), "ncg2Signal", true],
    [nameRange("incoming"), "ncg2Port", true],
    [nameRange("outgoing"), "ncg2Port", true],
    [nameRange("outgoing", source.indexOf("(def outgoing")), "ncg2Port", false],
    [nameRange("palette", source.indexOf("::palette")), "ncg2Namespace", false],
    [call, "ncg2Function", false],
    [nameRange("relay", source.indexOf("::palette")), "ncg2Module", false],
    [reference, "ncg2Signal", false],
    [nameRange("incoming", source.indexOf("(flip incoming")), "ncg2Port", false],
  ];
  for (const [range, kind, declaration] of expected) {
    assert.ok(sites.some((site) => site.range.isEqual(range)
      && site.kind === kind && site.declaration === declaration),
    `${document.getText(range)} のトークンが ${kind} に分類されていない。`);
  }
}

exports.run = async function run() {
  const root = vscode.workspace.workspaceFolders[0].uri;
  const open = (...parts) => vscode.workspace.openTextDocument(vscode.Uri.joinPath(root, ...parts));
  const extension = vscode.extensions.getExtension("neknaj.circuitgame2");
  assert.ok(extension, "インストールした拡張が見つからない。");
  const installed = relative(process.env.NCG2_TEST_EXTENSIONS, extension.extensionPath);
  assert.ok(installed && installed !== ".." && !installed.startsWith(".." + sep));
  assert.equal(vscode.workspace.getConfiguration("ncg2").get("server.path"), "");
  checkSemanticPalette();

  const standalone = await open("standalone.ncg2");
  assert.equal(standalone.languageId, "ncg2");
  const editor = await vscode.window.showTextDocument(standalone);
  await definition(standalone, standalone.getText().lastIndexOf("invert") + 1, standalone, "invert");

  const start = standalone.positionAt(standalone.getText().length);
  assert.ok(await editor.edit((edit) => edit.insert(start, '"漢😀" )\n')));
  const expected = new vscode.Range(start.line, 6, start.line, 7);
  assert.ok(standalone.isDirty);
  await waitFor(() => vscode.languages.getDiagnostics(standalone.uri).some(
    (item) => item.code === "UnexpectedClose" && item.range.isEqual(expected),
  ), "未保存の UTF-16 の診断範囲が一致しない。");

  const end = standalone.positionAt(standalone.getText().length);
  assert.ok(await editor.edit((edit) => edit.delete(new vscode.Range(start, end))));
  await waitFor(() => vscode.languages.getDiagnostics(standalone.uri).length === 0,
    "不正な括弧を除いた後も診断が残っている。");

  const basis = await open("project", "basis.ncg2");
  const caller = await open("project", "caller.ncg2");
  await vscode.window.showTextDocument(caller);
  const source = caller.getText();
  await definition(caller, source.indexOf("::logic::invert", source.indexOf("(def a")) + "::logic::i".length, basis, "invert");
  await definition(caller, source.lastIndexOf("(inv x)") + 2, basis, "invert");

  await checkSettlingHint(await open("project", "settling.ncg2"), basis);

  await checkEditorNavigation(await open("project", "identifiers.ncg2"));

  const meta = await open("functions.ncg2m");
  assert.equal(meta.languageId, "ncg2m");
  console.log("VSIX: 診断、定義、定常化ヒント、アウトライン、ホバー、識別子分類、NCG2M の言語登録を確認した。");
};
