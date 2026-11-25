import { isAbsolute } from "node:path";
import * as vscode from "vscode";
import { LanguageClient, TransportKind } from "vscode-languageclient/node";

let client: LanguageClient | undefined;

export async function activate(): Promise<void> {
  const executable = vscode.workspace.getConfiguration("ncg2").get<string>("server.path", "");
  if (executable !== "" && !isAbsolute(executable)) {
    void vscode.window.showErrorMessage("ncg2.server.path には言語サーバーの絶対パスを指定してください。");
    return;
  }

  const server = new LanguageClient(
    "ncg2",
    "Neknaj Circuit Game 2",
    { command: executable || "circuitgame2-lsp", transport: TransportKind.stdio },
    {
      documentSelector: [{ language: "ncg2" }, { language: "ncg2m" }],
      initializationOptions: { ncg2SemanticTokens: true },
      initializationFailedHandler: () => false,
    },
  );
  client = server;
  try {
    await server.start();
  } catch (error) {
    server.outputChannel.appendLine(String(error));
    void vscode.window.showErrorMessage(
      "circuitgame2-lsp を起動できません。実行ホストの PATH または ncg2.server.path を確認してください。",
    );
  }
}

export async function deactivate(): Promise<void> {
  await client?.stop();
}
