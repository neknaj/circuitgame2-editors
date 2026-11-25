local api = vim.api
local fixtures = assert(vim.env.NCG2_TEST_FIXTURES)
local timeout = 10000

local function edit(name)
  local path = vim.fs.joinpath(fixtures, name)
  vim.cmd.edit(vim.fn.fnameescape(path))
  return api.nvim_get_current_buf()
end

local function check_syntax(line, column, expected)
  local id = vim.fn.synID(line, column, true)
  assert(vim.fn.synIDattr(id, "name") == expected, "色付けが一致しない")
end

local function jump_to_definition(line, name, target, target_line)
  assert(vim.wait(timeout, function()
    return #vim.lsp.get_clients({ bufnr = 0, method = "textDocument/definition" }) > 0
  end), "定義への移動を利用できない")
  local source = api.nvim_buf_get_lines(0, line - 1, line, false)[1]
  local column = assert(source:find(name, 1, true))
  api.nvim_win_set_cursor(0, { line, column })
  vim.lsp.buf.definition()
  assert(vim.wait(timeout, function()
    local cursor = api.nvim_win_get_cursor(0)
    return api.nvim_get_current_buf() == target and vim.deep_equal(cursor, target_line)
  end), name .. " の定義位置が一致しない")
end

local function check_settling_hint(basis)
  -- Neovim は表示中のバッファーに対してヒントの更新要求を処理する。
  vim.cmd.split()
  local module = edit("project/settling.ncg2")
  vim.lsp.inlay_hint.enable(true, { bufnr = module })

  local function check_hint(ticks)
    assert(vim.wait(timeout, function()
      local hints = vim.lsp.inlay_hint.get({ bufnr = module })
      if #hints ~= 1 then
        return false
      end
      local hint = hints[1].inlay_hint
      return hint.label == ("定常化 ≤ %d tick"):format(ticks)
        and hint.position.line == 0 and hint.position.character == #"(module settling"
        and hint.kind == nil and hint.textEdits == nil
        and type(hint.tooltip) == "string" and hint.tooltip:find("固定入力", 1, true)
    end), ("モジュール名の直後に定常化 ≤ %d tick のヒントがない"):format(ticks))
  end

  check_hint(1)
  local row = 3
  local original = api.nvim_buf_get_lines(basis, row, row + 1, false)[1]
  local edited, replacements = original:gsub("%(def y %(nor x x%)%)",
    "(def z (nor x x)) (def y (nor z z))")
  assert(replacements == 1)
  api.nvim_buf_set_lines(basis, row, row + 1, false, { edited })
  assert(vim.bo[basis].modified and not vim.bo[module].modified)
  check_hint(2)
  api.nvim_buf_set_lines(basis, row, row + 1, false, { original })
  check_hint(1)
  vim.bo[basis].modified = false
  vim.cmd.only()
end

local function run()
  vim.opt.runtimepath:prepend(assert(vim.env.NCG2_TEST_RUNTIME))
  vim.cmd("filetype plugin on")
  vim.cmd("syntax enable")

  if arg[1] == "no-server" then
    vim.env.PATH = ""
    assert(vim.fn.executable("circuitgame2-lsp") == 0)
    vim.lsp.enable("circuitgame2")
    local buffer = edit("standalone.ncg2")
    assert(vim.bo.filetype == "ncg2" and vim.bo.commentstring == "; %s" and vim.bo.lisp)
    check_syntax(1, 2, "ncg2Keyword")
    assert(#vim.lsp.get_clients({ bufnr = buffer }) == 0)
    local messages = api.nvim_exec2("messages", { output = true }).output
    assert(messages:find("circuitgame2-lsp", 1, true) and messages:find("PATH", 1, true))
    return
  end

  assert(vim.fn.executable("circuitgame2-lsp") == 1)
  vim.lsp.config("circuitgame2", { capabilities = { general = { positionEncodings = { "utf-16" } } } })
  vim.lsp.enable("circuitgame2")
  local buffer = edit("standalone.ncg2")
  assert(vim.bo.filetype == "ncg2" and vim.bo.commentstring == "; %s" and vim.bo.lisp)
  check_syntax(1, 2, "ncg2Keyword")

  assert(vim.wait(timeout, function()
    local client = vim.lsp.get_clients({ bufnr = buffer, name = "circuitgame2" })[1]
    return client and client.offset_encoding == "utf-16"
  end), "PATH 上のサーバーに UTF-16 で接続できない")
  jump_to_definition(3, "invert", buffer, { 2, 6 })

  local line = api.nvim_buf_line_count(buffer)
  api.nvim_buf_set_lines(buffer, line, line, false, { '"漢😀" )' })
  assert(vim.bo[buffer].modified)
  assert(vim.wait(timeout, function()
    for _, diagnostic in ipairs(vim.diagnostic.get(buffer)) do
      if diagnostic.code == "UnexpectedClose" and diagnostic.lnum == line
        and diagnostic.end_lnum == line and diagnostic.col == 10 and diagnostic.end_col == 11
      then
        return true
      end
    end
  end), "未保存の UTF-16 の診断が Neovim のバイト位置に変換されない")
  api.nvim_buf_set_lines(buffer, line, line + 1, false, {})
  assert(vim.wait(timeout, function()
    return #vim.diagnostic.get(buffer) == 0
  end), "不正な括弧を除いた後も診断が残っている")
  vim.bo[buffer].modified = false

  local basis = edit("project/basis.ncg2")
  edit("project/caller.ncg2")
  jump_to_definition(3, "::logic::invert", basis, { 4, 8 })
  edit("project/caller.ncg2")
  jump_to_definition(4, "(inv", basis, { 4, 8 })

  check_settling_hint(basis)

  edit("functions.ncg2m")
  assert(vim.bo.filetype == "ncg2m" and vim.bo.commentstring == "; %s" and vim.bo.lisp)
  check_syntax(1, 2, "ncg2Keyword")
  check_syntax(1, 27, "ncg2Type")
end

local ok, message = xpcall(run, debug.traceback)
if not ok then
  api.nvim_err_writeln(message)
  vim.cmd.cquit()
end
print("Neovim: " .. (arg[1] or "LSP") .. " の確認が完了した。")
vim.cmd.qa()
