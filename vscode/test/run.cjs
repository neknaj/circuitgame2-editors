const { cp, mkdir, mkdtemp, rm } = require("node:fs/promises");
const { dirname, join, resolve } = require("node:path");
const { runTests, runVSCodeCommand } = require("@vscode/test-electron");

async function main() {
  const version = "1.147.0";
  const cache = resolve(__dirname, "../.vscode-test");
  await mkdir(cache, { recursive: true });
  const profile = await mkdtemp(join(cache, "ncg2-"));
  try {
    const extensions = join(profile, "extensions");
    const workspace = join(profile, "workspace");
    await cp(resolve(__dirname, "../../fixtures"), workspace, { recursive: true });
    await cp(resolve(__dirname, "../circuitgame2.vsix"), join(profile, "circuitgame2.vsix"));

    // 配布した VSIX を別の拡張ディレクトリに入れ、テスト用の拡張とは別に読み込む。
    const install = await runVSCodeCommand(
      ["--user-data-dir=data", "--extensions-dir=extensions", "--install-extension", "circuitgame2.vsix"],
      { version, reuseMachineInstall: true, spawn: { cwd: profile } },
    );
    process.stdout.write(install.stdout);
    await runTests({
      version,
      extensionDevelopmentPath: join(__dirname, "probe"),
      extensionTestsPath: join(__dirname, "suite.cjs"),
      extensionTestsEnv: { NCG2_TEST_EXTENSIONS: extensions },
      launchArgs: [
        "--user-data-dir=" + join(profile, "data"),
        "--extensions-dir=" + extensions,
        workspace,
      ],
    });
  } finally {
    if (dirname(profile) === cache) {
      await rm(profile, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 });
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
