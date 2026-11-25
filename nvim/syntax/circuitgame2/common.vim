syntax match ncg2Comment /;.*/ contains=@Spell
syntax region ncg2String start=/"/ skip=/\\["\\]/ end=/"/ oneline
syntax match ncg2Number /\%(^\|[ \t();]\)\zs\%(-\=[0-9]\+\|#b[01]\+\|#x[0-9a-fA-F]\+\)\ze\%($\|[ \t();]\)/
syntax match ncg2Delimiter /[()]/
syntax keyword ncg2Keyword namespace export use

highlight default link ncg2Comment Comment
highlight default link ncg2String String
highlight default link ncg2Number Number
highlight default link ncg2Delimiter Delimiter
highlight default link ncg2Keyword Keyword
