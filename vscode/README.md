# Neknaj Circuit Game 2

VS Code デスクトップで `.ncg2` を開き、NCG2 の診断、補完、定義への移動、定常化のインレイヒントを表示する。`.ncg2m` でも括弧の対応、コメント操作、基本の色付けを使える。検査に使ったサーバーは `.ncg2` を解析する。

## インストール

VS Code 1.100 以降で、VSIX をコマンド `code --install-extension circuitgame2.vsix` でインストールする。対応する CLI をインストールし、実行ホストの `PATH` に `circuitgame2-lsp` を置く。

VS Code Remote では、拡張とサーバーを WSL、SSH 先、コンテナのうち接続している側に入れる。`PATH` の代わりに実行ファイルを指定する場合は、実行ホストの設定で `ncg2.server.path` に絶対パスを入力し、ウィンドウを再読み込みする。

## ビルドと検査

Node.js 22 以降で、このディレクトリから次のコマンドを実行する。

~~~sh
npm ci
npm run package
npm test
~~~

`npm run package` は `circuitgame2.vsix` を作る。`npm test` は隔離した VS Code 1.147.0 に VSIX をインストールし、`PATH` 上のサーバーに接続する。

検査で使うサーバーは [CLI 0.1.0 のコミット e8b9b7f](https://github.com/neknaj/circuitgame2-cli/commit/e8b9b7f9c212e5e25a773930f0ade25c95b9db72) からインストールできる。

~~~sh
rustup toolchain install 1.99.1 --profile minimal
cargo +1.99.1 install --locked --git https://github.com/neknaj/circuitgame2-cli --rev e8b9b7f9c212e5e25a773930f0ade25c95b9db72 --bin circuitgame2-lsp
~~~
