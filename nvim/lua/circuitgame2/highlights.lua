local colors = {
  dark = {
    ncg2Namespace = "#C59AF0",
    ncg2Function = "#EAB46F",
    ncg2Module = "#E3CE72",
    ncg2Signal = "#8FB7EC",
    ncg2Port = "#75D3EB",
  },
  light = {
    ncg2Namespace = "#7243A8",
    ncg2Function = "#8A5006",
    ncg2Module = "#816A00",
    ncg2Signal = "#255DAA",
    ncg2Port = "#006F89",
  },
}

local function apply_colors()
  for kind, color in pairs(colors[vim.o.background]) do
    vim.api.nvim_set_hl(0, "@lsp.type." .. kind .. ".ncg2", { fg = color, default = true })
  end
end

vim.api.nvim_create_autocmd("ColorScheme", {
  group = vim.api.nvim_create_augroup("circuitgame2_highlights", {}),
  callback = apply_colors,
})
apply_colors()
