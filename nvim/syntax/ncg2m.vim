if exists('b:current_syntax')
  finish
endif
runtime syntax/circuitgame2/common.vim
syntax keyword ncg2Keyword defn defmacro fn let if match case fold-nat fold-list as-type syntax unsyntax splice
syntax match ncg2Keyword /\<let\*\ze\%($\|[ \t();]\)/
syntax keyword ncg2Type Nat Int Bool Symbol List Fn Syntax
highlight default link ncg2Type Type
let b:current_syntax = 'ncg2m'
