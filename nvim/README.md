# Neknaj Circuit Game 2 の Neovim 拡張

Neovim 0.11.0 以降で使える。ファイルを開くと `.ncg2` と `.ncg2m` を認識し、括弧の対応、コメント、インデント、基本の色付けを設定する。

## インストール

GitHub にログインし、[GitHub Actions の検査結果](https://github.com/neknaj/circuitgame2-editors/actions/workflows/neovim.yml)から `main` の成功した実行を開く。保存期間内に Artifacts 欄から `circuitgame2-neovim.zip` をダウンロードし、展開する。`ftdetect/` と `lsp/` がある展開先のディレクトリを、`init.lua` で `runtimepath` に追加する。

~~~lua
vim.opt.runtimepath:prepend("/path/to/circuitgame2-neovim")
~~~

## 言語サーバー

実行ホストの `PATH` に `circuitgame2-lsp` を置き、`runtimepath` を設定した後で `init.lua` に次を加える。検査に使ったサーバーは `.ncg2` の診断、補完、定義への移動、ホバー、文書シンボルに対応する。

~~~lua
vim.lsp.enable("circuitgame2")
~~~

定常化の推論結果を表示するには、サーバーに接続したバッファーで `:lua vim.lsp.inlay_hint.enable(true, { bufnr = 0 })` を実行する。

標準の配色では、サーバーから得た意味に応じて名前空間、`func`、`module`、内部信号、入出力ポートを区別する。明暗は `background` に従う。

実行ファイルの場所を明示する場合は、`vim.lsp.enable()` の前に `vim.lsp.config()` で `cmd` を設定する。

~~~lua
vim.lsp.config("circuitgame2", { cmd = { "/path/to/circuitgame2-lsp" } })
~~~

検査に使うサーバーは [CLI 0.1.0 のコミット d9d2596](https://github.com/neknaj/circuitgame2-cli/commit/d9d2596fe356f33779b42e38553ef06c54d65cec) からインストールできる。

~~~sh
rustup toolchain install 1.99.1 --profile minimal
cargo +1.99.1 install --locked --git https://github.com/neknaj/circuitgame2-cli --rev d9d2596fe356f33779b42e38553ef06c54d65cec --bin circuitgame2-lsp
~~~
