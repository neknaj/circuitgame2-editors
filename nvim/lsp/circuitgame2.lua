local executable = "circuitgame2-lsp"

return {
  cmd = function(dispatchers)
    -- Neovim 0.11.0 は見つからないコマンドをログに記録するため、起動時にも設定方法を示す。
    if vim.fn.executable(executable) == 0 then
      error(executable .. " が見つかりません。PATH または vim.lsp.config() の cmd を設定してください。", 0)
    end
    return vim.lsp.rpc.start({ executable }, dispatchers)
  end,
  filetypes = { "ncg2", "ncg2m" },
  root_markers = { "circuitgame2.toml" },
}
