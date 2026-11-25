# Neknaj Circuit Game 2

VS Code デスクトップで `.ncg2` を開き、診断、補完、定義への移動、アウトライン、ホバー、定常化のインレイヒントを使う。`.ncg2m` でも括弧の対応、コメント操作、基本の色付けを使える。検査に使ったサーバーは `.ncg2` を解析する。

明暗の標準テーマでは、サーバーから得た意味に応じて、名前空間、`func`、`module`、内部信号、入出力ポートを異なる色で表示する。

## インストール

[GitHub Actions の検査結果](https://github.com/neknaj/circuitgame2-editors/actions/workflows/vscode.yml)から成果物をダウンロードし、展開する。VS Code 1.100 以降で `code --install-extension circuitgame2.vsix` を実行する。対応する CLI をインストールし、実行ホストの `PATH` に `circuitgame2-lsp` を置く。

VS Code Remote では、拡張とサーバーを WSL、SSH 先、コンテナのうち接続している側に入れる。`PATH` の代わりに実行ファイルを指定する場合は、実行ホストの設定で `ncg2.server.path` に絶対パスを入力し、ウィンドウを再読み込みする。

## ビルドと検査

Node.js 22 以降で、このディレクトリから次のコマンドを実行する。

~~~sh
npm ci
npm run package
npm test
~~~

`npm run package` は `circuitgame2.vsix` を作る。`npm test` は隔離した VS Code 1.147.0 に VSIX をインストールし、`PATH` 上のサーバーに接続する。

検査で使うサーバーは [CLI 0.1.0 のコミット d9d2596](https://github.com/neknaj/circuitgame2-cli/commit/d9d2596fe356f33779b42e38553ef06c54d65cec) からインストールできる。

~~~sh
rustup toolchain install 1.99.1 --profile minimal
cargo +1.99.1 install --locked --git https://github.com/neknaj/circuitgame2-cli --rev d9d2596fe356f33779b42e38553ef06c54d65cec --bin circuitgame2-lsp
~~~
