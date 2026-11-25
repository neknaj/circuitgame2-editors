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

exports.run = async function run() {
  const root = vscode.workspace.workspaceFolders[0].uri;
  const open = (...parts) => vscode.workspace.openTextDocument(vscode.Uri.joinPath(root, ...parts));
  const extension = vscode.extensions.getExtension("neknaj.circuitgame2");
  assert.ok(extension, "インストールした拡張が見つからない。");
  const installed = relative(process.env.NCG2_TEST_EXTENSIONS, extension.extensionPath);
  assert.ok(installed && installed !== ".." && !installed.startsWith(".." + sep));
  assert.equal(vscode.workspace.getConfiguration("ncg2").get("server.path"), "");

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

  const meta = await open("functions.ncg2m");
  assert.equal(meta.languageId, "ncg2m");
  console.log("VSIX: PATH 上の言語サーバー、診断、定義、NCG2M の言語登録を確認した。");
};
