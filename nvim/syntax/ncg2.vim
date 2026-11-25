if exists('b:current_syntax')
  finish
endif
runtime syntax/circuitgame2/common.vim
syntax keyword ncg2Keyword using module module-part func def test struct latch memory in out
syntax keyword ncg2Keyword bit bits slice concat field as raw expand
let b:current_syntax = 'ncg2'
