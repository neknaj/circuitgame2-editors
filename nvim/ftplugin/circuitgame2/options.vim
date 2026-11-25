if exists('b:did_ftplugin')
  finish
endif
let b:did_ftplugin = 1

setlocal commentstring=;\ %s
setlocal comments=:;
setlocal iskeyword+=-
setlocal lisp autoindent
setlocal lispwords+=namespace,func,module,module-part,struct,test,defn,defmacro,fn,let,let*,if,match
let b:undo_ftplugin = 'setlocal commentstring< comments< iskeyword< lisp< autoindent< lispwords<'
