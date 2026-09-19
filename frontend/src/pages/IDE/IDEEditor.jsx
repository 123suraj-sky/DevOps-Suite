import { useRef, useEffect, useCallback, forwardRef, useImperativeHandle } from 'react';
import MonacoEditor, { loader } from '@monaco-editor/react';

// ── Configure Monaco loader — explicit CDN ensures all workers load correctly ─
loader.config({
  paths: { vs: 'https://cdn.jsdelivr.net/npm/monaco-editor@0.52.0/min/vs' },
});

// ── Per-file model cache ──────────────────────────────────────────────────────
const modelCache = new Map();

export function disposeEditorModel(filePath) {
  const model = modelCache.get(filePath);
  if (model && !model.isDisposed()) model.dispose();
  modelCache.delete(filePath);
}

// ── Completion data ───────────────────────────────────────────────────────────

const PYTHON_KEYWORDS = [
  'False','None','True','and','as','assert','async','await','break','class',
  'continue','def','del','elif','else','except','finally','for','from',
  'global','if','import','in','is','lambda','nonlocal','not','or','pass',
  'raise','return','try','while','with','yield',
];

const PYTHON_BUILTINS = [
  'print','len','range','type','isinstance','int','str','float','list','dict',
  'set','tuple','bool','input','open','enumerate','zip','map','filter','sorted',
  'reversed','sum','min','max','abs','round','all','any','help','dir','vars',
  'hasattr','getattr','setattr','delattr','super','property','staticmethod',
  'classmethod','object','Exception','ValueError','TypeError','KeyError',
  'IndexError','AttributeError','FileNotFoundError','RuntimeError','StopIteration',
  'NotImplementedError','OverflowError','ZeroDivisionError','ImportError',
  'repr','id','hash','iter','next','callable','format','chr','ord','hex','bin',
  'oct','pow','divmod','complex','bytes','bytearray','memoryview','frozenset',
];

const PYTHON_SNIPPETS = [
  { label: 'def',        insert: 'def ${1:name}(${2:args}):\n\t${3:pass}',                                    detail: 'Function definition' },
  { label: 'class',      insert: 'class ${1:Name}:\n\tdef __init__(self):\n\t\t${2:pass}',                    detail: 'Class definition' },
  { label: 'if',         insert: 'if ${1:condition}:\n\t${2:pass}',                                           detail: 'If statement' },
  { label: 'elif',       insert: 'elif ${1:condition}:\n\t${2:pass}',                                         detail: 'Elif clause' },
  { label: 'else',       insert: 'else:\n\t${1:pass}',                                                        detail: 'Else clause' },
  { label: 'for',        insert: 'for ${1:item} in ${2:iterable}:\n\t${3:pass}',                              detail: 'For loop' },
  { label: 'while',      insert: 'while ${1:condition}:\n\t${2:pass}',                                        detail: 'While loop' },
  { label: 'try',        insert: 'try:\n\t${1:pass}\nexcept ${2:Exception} as e:\n\t${3:pass}',               detail: 'Try/except' },
  { label: 'tryf',       insert: 'try:\n\t${1:pass}\nexcept ${2:Exception} as e:\n\t${3:pass}\nfinally:\n\t${4:pass}', detail: 'Try/except/finally' },
  { label: 'with',       insert: 'with ${1:expression} as ${2:var}:\n\t${3:pass}',                            detail: 'With statement' },
  { label: 'import',     insert: 'import ${1:module}',                                                        detail: 'Import module' },
  { label: 'from',       insert: 'from ${1:module} import ${2:name}',                                         detail: 'From import' },
  { label: 'print',      insert: 'print(${1:value})',                                                          detail: 'print()' },
  { label: 'input',      insert: 'input("${1:prompt}")',                                                       detail: 'input()' },
  { label: 'range',      insert: 'range(${1:start}, ${2:stop}, ${3:step})',                                    detail: 'range()' },
  { label: 'len',        insert: 'len(${1:obj})',                                                              detail: 'len()' },
  { label: 'list comp',  insert: '[${1:expr} for ${2:item} in ${3:iterable}]',                                 detail: 'List comprehension' },
  { label: 'dict comp',  insert: '{${1:k}: ${2:v} for ${3:item} in ${4:iterable}}',                           detail: 'Dict comprehension' },
  { label: 'set comp',   insert: '{${1:expr} for ${2:item} in ${3:iterable}}',                                 detail: 'Set comprehension' },
  { label: 'lambda',     insert: 'lambda ${1:args}: ${2:expr}',                                                detail: 'Lambda' },
  { label: 'ifmain',     insert: 'if __name__ == "__main__":\n\t${1:main()}',                                  detail: '__main__ guard' },
  { label: 'open',       insert: 'with open("${1:file}", "${2:r}") as f:\n\t${3:data = f.read()}',            detail: 'Open file' },
];

const JAVA_KEYWORDS = [
  'abstract','assert','boolean','break','byte','case','catch','char','class',
  'const','continue','default','do','double','else','enum','extends','final',
  'finally','float','for','goto','if','implements','import','instanceof','int',
  'interface','long','native','new','package','private','protected','public',
  'return','short','static','strictfp','super','switch','synchronized','this',
  'throw','throws','transient','try','void','volatile','while','var','record',
  'sealed','permits','yield','true','false','null',
];

const JAVA_SNIPPETS = [
  { label: 'main',      insert: 'public static void main(String[] args) {\n\t${1}\n}',                       detail: 'main method' },
  { label: 'sout',      insert: 'System.out.println(${1:"text"});',                                           detail: 'System.out.println' },
  { label: 'syserr',    insert: 'System.err.println(${1:"text"});',                                           detail: 'System.err.println' },
  { label: 'soutf',     insert: 'System.out.printf("${1:%s}%n", ${2:args});',                                 detail: 'System.out.printf' },
  { label: 'for',       insert: 'for (int ${1:i} = 0; ${1:i} < ${2:n}; ${1:i}++) {\n\t${3}\n}',             detail: 'For loop' },
  { label: 'fori',      insert: 'for (int ${1:i} = 0; ${1:i} < ${2:arr}.length; ${1:i}++) {\n\t${3}\n}',    detail: 'Array for loop' },
  { label: 'foreach',   insert: 'for (${1:Type} ${2:item} : ${3:collection}) {\n\t${4}\n}',                  detail: 'Enhanced for' },
  { label: 'while',     insert: 'while (${1:condition}) {\n\t${2}\n}',                                        detail: 'While loop' },
  { label: 'dowhile',   insert: 'do {\n\t${1}\n} while (${2:condition});',                                    detail: 'Do-while loop' },
  { label: 'if',        insert: 'if (${1:condition}) {\n\t${2}\n}',                                           detail: 'If statement' },
  { label: 'ifelse',    insert: 'if (${1:condition}) {\n\t${2}\n} else {\n\t${3}\n}',                        detail: 'If/else' },
  { label: 'switch',    insert: 'switch (${1:var}) {\n\tcase ${2:value}:\n\t\t${3}\n\t\tbreak;\n\tdefault:\n\t\tbreak;\n}', detail: 'Switch' },
  { label: 'try',       insert: 'try {\n\t${1}\n} catch (${2:Exception} e) {\n\te.printStackTrace();\n}',   detail: 'Try/catch' },
  { label: 'tryfin',   insert: 'try {\n\t${1}\n} catch (${2:Exception} e) {\n\te.printStackTrace();\n} finally {\n\t${3}\n}', detail: 'Try/catch/finally' },
  { label: 'class',     insert: 'public class ${1:Name} {\n\t${2}\n}',                                        detail: 'Class' },
  { label: 'method',    insert: 'public ${1:void} ${2:name}(${3:params}) {\n\t${4}\n}',                       detail: 'Method' },
  { label: 'interface', insert: 'public interface ${1:Name} {\n\t${2}\n}',                                    detail: 'Interface' },
  { label: 'ArrayList', insert: 'ArrayList<${1:String}> ${2:list} = new ArrayList<>();',                      detail: 'ArrayList' },
  { label: 'HashMap',   insert: 'HashMap<${1:String}, ${2:Object}> ${3:map} = new HashMap<>();',              detail: 'HashMap' },
  { label: 'import',    insert: 'import ${1:java.util.List};',                                                 detail: 'Import' },
  { label: 'override',  insert: '@Override\npublic ${1:void} ${2:method}(${3:params}) {\n\t${4}\n}',          detail: '@Override method' },
  { label: 'getter',    insert: 'public ${1:String} get${2:Field}() {\n\treturn ${3:field};\n}',               detail: 'Getter' },
  { label: 'setter',    insert: 'public void set${1:Field}(${2:String} value) {\n\tthis.${3:field} = value;\n}', detail: 'Setter' },
];

const CPP_KEYWORDS = [
  'alignas','alignof','auto','bool','break','case','catch','char','char16_t',
  'char32_t','char8_t','class','concept','const','const_cast','consteval',
  'constexpr','constinit','continue','co_await','co_return','co_yield',
  'decltype','default','delete','do','double','dynamic_cast','else','enum',
  'explicit','export','extern','false','final','float','for','friend','goto',
  'if','inline','int','long','mutable','namespace','new','noexcept','nullptr',
  'operator','override','private','protected','public','reinterpret_cast',
  'requires','return','short','signed','sizeof','static','static_assert',
  'static_cast','struct','switch','template','this','thread_local','throw',
  'true','try','typedef','typeid','typename','union','unsigned','using',
  'virtual','void','volatile','wchar_t','while',
];

const CPP_SNIPPETS = [
  { label: 'main',       insert: '#include <iostream>\nusing namespace std;\n\nint main() {\n\t${1}\n\treturn 0;\n}',  detail: 'main with iostream' },
  { label: 'cout',       insert: 'cout << ${1:"text"} << endl;',                                                       detail: 'cout' },
  { label: 'cerr',       insert: 'cerr << ${1:"error"} << endl;',                                                      detail: 'cerr' },
  { label: 'cin',        insert: 'cin >> ${1:var};',                                                                    detail: 'cin' },
  { label: 'for',        insert: 'for (int ${1:i} = 0; ${1:i} < ${2:n}; ++${1:i}) {\n\t${3}\n}',                      detail: 'For loop' },
  { label: 'foreach',    insert: 'for (auto& ${1:item} : ${2:container}) {\n\t${3}\n}',                                detail: 'Range-based for' },
  { label: 'forconst',   insert: 'for (const auto& ${1:item} : ${2:container}) {\n\t${3}\n}',                          detail: 'Range-based for (const)' },
  { label: 'while',      insert: 'while (${1:condition}) {\n\t${2}\n}',                                                detail: 'While loop' },
  { label: 'dowhile',    insert: 'do {\n\t${1}\n} while (${2:condition});',                                             detail: 'Do-while' },
  { label: 'if',         insert: 'if (${1:condition}) {\n\t${2}\n}',                                                   detail: 'If statement' },
  { label: 'ifelse',     insert: 'if (${1:condition}) {\n\t${2}\n} else {\n\t${3}\n}',                                 detail: 'If/else' },
  { label: 'switch',     insert: 'switch (${1:var}) {\n\tcase ${2:value}:\n\t\t${3}\n\t\tbreak;\n\tdefault:\n\t\tbreak;\n}', detail: 'Switch' },
  { label: 'try',        insert: 'try {\n\t${1}\n} catch (const exception& e) {\n\tcerr << e.what() << endl;\n}',      detail: 'Try/catch' },
  { label: 'class',      insert: 'class ${1:Name} {\npublic:\n\t${2:Name}();\n\t~${2:Name}();\n\nprivate:\n\t${3}\n};', detail: 'Class' },
  { label: 'struct',     insert: 'struct ${1:Name} {\n\t${2}\n};',                                                     detail: 'Struct' },
  { label: 'func',       insert: '${1:void} ${2:name}(${3:params}) {\n\t${4}\n}',                                      detail: 'Function' },
  { label: '#include',   insert: '#include <${1:iostream}>',                                                            detail: '#include <>' },
  { label: '#includel',  insert: '#include "${1:header.h}"',                                                            detail: '#include ""' },
  { label: 'namespace',  insert: 'namespace ${1:name} {\n\t${2}\n}',                                                   detail: 'Namespace' },
  { label: 'using',      insert: 'using namespace ${1:std};',                                                          detail: 'using namespace' },
  { label: 'vector',     insert: 'vector<${1:int}> ${2:v};',                                                           detail: 'vector' },
  { label: 'string',     insert: 'string ${1:s};',                                                                     detail: 'string' },
  { label: 'map',        insert: 'map<${1:string}, ${2:int}> ${3:m};',                                                  detail: 'map' },
  { label: 'unordered_map', insert: 'unordered_map<${1:string}, ${2:int}> ${3:m};',                                     detail: 'unordered_map' },
  { label: 'pair',       insert: 'pair<${1:int}, ${2:int}> ${3:p};',                                                   detail: 'pair' },
  { label: 'auto',       insert: 'auto ${1:var} = ${2:value};',                                                        detail: 'auto variable' },
  { label: 'lambda',     insert: '[${1:capture}](${2:params}) {\n\t${3}\n}',                                           detail: 'Lambda' },
  { label: 'template',   insert: 'template <typename ${1:T}>\n${2:void} ${3:name}(${1:T} ${4:arg}) {\n\t${5}\n}',     detail: 'Template function' },
  { label: 'nullptr',    insert: 'nullptr',                                                                             detail: 'null pointer' },
];

const JS_SNIPPETS = [
  { label: 'clg',        insert: 'console.log(${1:value});',                                                            detail: 'console.log' },
  { label: 'cle',        insert: 'console.error(${1:value});',                                                          detail: 'console.error' },
  { label: 'clw',        insert: 'console.warn(${1:value});',                                                           detail: 'console.warn' },
  { label: 'fn',         insert: 'function ${1:name}(${2:params}) {\n\t${3}\n}',                                        detail: 'Function declaration' },
  { label: 'afn',        insert: 'const ${1:name} = (${2:params}) => {\n\t${3}\n};',                                    detail: 'Arrow function' },
  { label: 'anfn',       insert: 'const ${1:name} = async (${2:params}) => {\n\ttry {\n\t\t${3}\n\t} catch (err) {\n\t\tconsole.error(err);\n\t}\n};', detail: 'Async arrow fn' },
  { label: 'asyncfn',    insert: 'async function ${1:name}(${2:params}) {\n\ttry {\n\t\t${3}\n\t} catch (err) {\n\t\tconsole.error(err);\n\t}\n}', detail: 'Async function' },
  { label: 'class',      insert: 'class ${1:Name} {\n\tconstructor(${2:params}) {\n\t\t${3}\n\t}\n}',                  detail: 'Class' },
  { label: 'const',      insert: 'const ${1:name} = ${2:value};',                                                       detail: 'const' },
  { label: 'let',        insert: 'let ${1:name} = ${2:value};',                                                         detail: 'let' },
  { label: 'for',        insert: 'for (let ${1:i} = 0; ${1:i} < ${2:n}; ${1:i}++) {\n\t${3}\n}',                      detail: 'For loop' },
  { label: 'forin',      insert: 'for (const ${1:key} in ${2:obj}) {\n\t${3}\n}',                                       detail: 'For...in' },
  { label: 'forof',      insert: 'for (const ${1:item} of ${2:arr}) {\n\t${3}\n}',                                      detail: 'For...of' },
  { label: 'forEach',    insert: '${1:arr}.forEach((${2:item}) => {\n\t${3}\n});',                                       detail: 'forEach' },
  { label: 'map',        insert: '${1:arr}.map((${2:item}) => ${3:item});',                                              detail: 'Array.map' },
  { label: 'filter',     insert: '${1:arr}.filter((${2:item}) => ${3:condition});',                                      detail: 'Array.filter' },
  { label: 'reduce',     insert: '${1:arr}.reduce((${2:acc}, ${3:cur}) => ${4:acc}, ${5:initial});',                    detail: 'Array.reduce' },
  { label: 'promise',    insert: 'new Promise((resolve, reject) => {\n\t${1}\n});',                                     detail: 'Promise' },
  { label: 'try',        insert: 'try {\n\t${1}\n} catch (${2:err}) {\n\tconsole.error(${2:err});\n}',                  detail: 'Try/catch' },
  { label: 'import',     insert: "import ${1:name} from '${2:module}';",                                                detail: 'Import' },
  { label: 'require',    insert: "const ${1:name} = require('${2:module}');",                                           detail: 'require' },
  { label: 'if',         insert: 'if (${1:condition}) {\n\t${2}\n}',                                                    detail: 'If statement' },
  { label: 'ifelse',     insert: 'if (${1:condition}) {\n\t${2}\n} else {\n\t${3}\n}',                                 detail: 'If/else' },
  { label: 'ternary',    insert: '${1:condition} ? ${2:trueVal} : ${3:falseVal}',                                        detail: 'Ternary' },
  { label: 'switch',     insert: 'switch (${1:var}) {\n\tcase ${2:value}:\n\t\t${3}\n\t\tbreak;\n\tdefault:\n\t\tbreak;\n}', detail: 'Switch' },
  { label: 'setInterval', insert: 'setInterval(() => {\n\t${1}\n}, ${2:1000});',                                        detail: 'setInterval' },
  { label: 'setTimeout', insert: 'setTimeout(() => {\n\t${1}\n}, ${2:1000});',                                          detail: 'setTimeout' },
  { label: 'destruct',   insert: 'const { ${1:prop} } = ${2:obj};',                                                     detail: 'Destructure object' },
  { label: 'spread',     insert: 'const ${1:copy} = { ...${2:obj} };',                                                  detail: 'Spread object' },
];

const HTML_SNIPPETS = [
  { label: 'doc',       insert: '<!DOCTYPE html>\n<html lang="${1:en}">\n<head>\n\t<meta charset="UTF-8" />\n\t<meta name="viewport" content="width=device-width, initial-scale=1.0" />\n\t<title>${2:Document}</title>\n</head>\n<body>\n\t${3}\n</body>\n</html>', detail: 'HTML5 document skeleton' },
  { label: 'meta',      insert: '<meta name="${1:name}" content="${2:content}" />',                                    detail: '<meta>' },
  { label: 'link',      insert: '<link rel="stylesheet" href="${1:style.css}" />',                                    detail: '<link> stylesheet' },
  { label: 'script',    insert: '<script src="${1:script.js}"></script>',                                             detail: '<script src>' },
  { label: 'scripti',   insert: '<script>\n\t${1}\n</script>',                                                        detail: '<script> inline' },
  { label: 'style',     insert: '<style>\n\t${1}\n</style>',                                                          detail: '<style> inline' },
  { label: 'div',       insert: '<div class="${1:container}">\n\t${2}\n</div>',                                       detail: '<div>' },
  { label: 'span',      insert: '<span class="${1}">${2}</span>',                                                     detail: '<span>' },
  { label: 'p',         insert: '<p>${1}</p>',                                                                        detail: '<p>' },
  { label: 'a',         insert: '<a href="${1:#}">${2:link text}</a>',                                                 detail: '<a>' },
  { label: 'img',       insert: '<img src="${1:image.png}" alt="${2:description}" />',                                 detail: '<img>' },
  { label: 'ul',        insert: '<ul>\n\t<li>${1}</li>\n</ul>',                                                       detail: '<ul>' },
  { label: 'ol',        insert: '<ol>\n\t<li>${1}</li>\n</ol>',                                                       detail: '<ol>' },
  { label: 'li',        insert: '<li>${1}</li>',                                                                      detail: '<li>' },
  { label: 'table',     insert: '<table>\n\t<thead>\n\t\t<tr>\n\t\t\t<th>${1:Header}</th>\n\t\t</tr>\n\t</thead>\n\t<tbody>\n\t\t<tr>\n\t\t\t<td>${2:Data}</td>\n\t\t</tr>\n\t</tbody>\n</table>', detail: '<table>' },
  { label: 'form',      insert: '<form action="${1:#}" method="${2:post}">\n\t${3}\n\t<button type="submit">${4:Submit}</button>\n</form>', detail: '<form>' },
  { label: 'input',     insert: '<input type="${1:text}" name="${2:name}" id="${2:name}" placeholder="${3}" />',       detail: '<input>' },
  { label: 'label',     insert: '<label for="${1:id}">${2:Label}</label>',                                            detail: '<label>' },
  { label: 'button',    insert: '<button type="${1:button}">${2:Click me}</button>',                                  detail: '<button>' },
  { label: 'select',    insert: '<select name="${1:name}" id="${1:name}">\n\t<option value="${2:value}">${3:Label}</option>\n</select>', detail: '<select>' },
  { label: 'textarea',  insert: '<textarea name="${1:name}" id="${1:name}" rows="${2:4}" cols="${3:50}">${4}</textarea>', detail: '<textarea>' },
  { label: 'header',    insert: '<header>\n\t${1}\n</header>',                                                        detail: '<header>' },
  { label: 'footer',    insert: '<footer>\n\t${1}\n</footer>',                                                        detail: '<footer>' },
  { label: 'nav',       insert: '<nav>\n\t${1}\n</nav>',                                                              detail: '<nav>' },
  { label: 'main',      insert: '<main>\n\t${1}\n</main>',                                                            detail: '<main>' },
  { label: 'section',   insert: '<section>\n\t${1}\n</section>',                                                      detail: '<section>' },
  { label: 'article',   insert: '<article>\n\t${1}\n</article>',                                                      detail: '<article>' },
  { label: 'aside',     insert: '<aside>\n\t${1}\n</aside>',                                                          detail: '<aside>' },
  { label: 'h1',        insert: '<h1>${1}</h1>',                                                                      detail: '<h1>' },
  { label: 'h2',        insert: '<h2>${1}</h2>',                                                                      detail: '<h2>' },
  { label: 'h3',        insert: '<h3>${1}</h3>',                                                                      detail: '<h3>' },
  { label: 'figure',    insert: '<figure>\n\t<img src="${1:image.png}" alt="${2}" />\n\t<figcaption>${3}</figcaption>\n</figure>', detail: '<figure>' },
];

const CSS_SNIPPETS = [
  { label: 'rule',      insert: '${1:selector} {\n\t${2:property}: ${3:value};\n}',                                  detail: 'CSS rule' },
  { label: 'media',     insert: '@media (${1:max-width: 768px}) {\n\t${2}\n}',                                        detail: '@media query' },
  { label: 'var',       insert: '--${1:name}: ${2:value};',                                                           detail: 'CSS custom property' },
  { label: 'usevar',    insert: 'var(--${1:name})',                                                                   detail: 'var()' },
  { label: 'flex',      insert: 'display: flex;\njustify-content: ${1:center};\nalign-items: ${2:center};',           detail: 'Flexbox' },
  { label: 'grid',      insert: 'display: grid;\ngrid-template-columns: ${1:repeat(3, 1fr)};\ngap: ${2:1rem};',      detail: 'CSS Grid' },
  { label: 'center',    insert: 'display: flex;\njustify-content: center;\nalign-items: center;',                    detail: 'Flex center' },
  { label: 'abs',       insert: 'position: absolute;\ntop: ${1:0};\nleft: ${2:0};',                                  detail: 'position: absolute' },
  { label: 'rel',       insert: 'position: relative;',                                                               detail: 'position: relative' },
  { label: 'fixed',     insert: 'position: fixed;\ntop: ${1:0};\nleft: ${2:0};',                                     detail: 'position: fixed' },
  { label: 'sticky',    insert: 'position: sticky;\ntop: ${1:0};',                                                   detail: 'position: sticky' },
  { label: 'box',       insert: 'box-sizing: border-box;',                                                           detail: 'box-sizing' },
  { label: 'shadow',    insert: 'box-shadow: ${1:0} ${2:2px} ${3:4px} ${4:rgba(0, 0, 0, 0.1)};',                    detail: 'box-shadow' },
  { label: 'txtshadow', insert: 'text-shadow: ${1:1px} ${2:1px} ${3:2px} ${4:rgba(0, 0, 0, 0.3)};',                 detail: 'text-shadow' },
  { label: 'transition',insert: 'transition: ${1:all} ${2:0.3s} ${3:ease};',                                         detail: 'transition' },
  { label: 'animation', insert: 'animation: ${1:name} ${2:1s} ${3:ease-in-out} ${4:infinite};',                      detail: 'animation' },
  { label: 'keyframes', insert: '@keyframes ${1:name} {\n\tfrom {\n\t\t${2}\n\t}\n\tto {\n\t\t${3}\n\t}\n}',        detail: '@keyframes' },
  { label: 'transform', insert: 'transform: ${1:translateX(0)};',                                                    detail: 'transform' },
  { label: 'radius',    insert: 'border-radius: ${1:4px};',                                                          detail: 'border-radius' },
  { label: 'truncate',  insert: 'overflow: hidden;\nwhite-space: nowrap;\ntext-overflow: ellipsis;',                 detail: 'Text truncate' },
  { label: 'scrollbar', insert: '::-webkit-scrollbar {\n\twidth: ${1:8px};\n}\n::-webkit-scrollbar-thumb {\n\tbackground: ${2:#888};\n\tborder-radius: ${3:4px};\n}', detail: 'Custom scrollbar' },
  { label: 'root',      insert: ':root {\n\t--${1:color-primary}: ${2:#4f46e5};\n}',                                  detail: ':root variables' },
  { label: 'hover',     insert: '&:hover {\n\t${1}\n}',                                                              detail: ':hover' },
  { label: 'focus',     insert: '&:focus {\n\toutline: ${1:2px solid #4f46e5};\n}',                                  detail: ':focus' },
  { label: 'import',    insert: "@import url('${1:style.css}');",                                                     detail: '@import' },
  { label: 'font',      insert: "@font-face {\n\tfont-family: '${1:Name}';\n\tsrc: url('${2:font.woff2}') format('woff2');\n}", detail: '@font-face' },
];

const MD_SNIPPETS = [
  { label: 'h1',        insert: '# ${1:Heading 1}',                                                                  detail: 'Heading 1' },
  { label: 'h2',        insert: '## ${1:Heading 2}',                                                                  detail: 'Heading 2' },
  { label: 'h3',        insert: '### ${1:Heading 3}',                                                                 detail: 'Heading 3' },
  { label: 'bold',      insert: '**${1:bold text}**',                                                                 detail: 'Bold' },
  { label: 'italic',    insert: '_${1:italic text}_',                                                                 detail: 'Italic' },
  { label: 'strike',    insert: '~~${1:strikethrough}~~',                                                             detail: 'Strikethrough' },
  { label: 'code',      insert: '`${1:code}`',                                                                        detail: 'Inline code' },
  { label: 'codeblock', insert: '```${1:language}\n${2:code}\n```',                                                   detail: 'Fenced code block' },
  { label: 'link',      insert: '[${1:link text}](${2:url})',                                                         detail: 'Link' },
  { label: 'img',       insert: '![${1:alt text}](${2:image.png})',                                                   detail: 'Image' },
  { label: 'ul',        insert: '- ${1:Item one}\n- ${2:Item two}\n- ${3:Item three}',                                detail: 'Unordered list' },
  { label: 'ol',        insert: '1. ${1:First}\n2. ${2:Second}\n3. ${3:Third}',                                       detail: 'Ordered list' },
  { label: 'task',      insert: '- [ ] ${1:Task item}',                                                               detail: 'Task list item' },
  { label: 'table',     insert: '| ${1:Column 1} | ${2:Column 2} | ${3:Column 3} |\n|---|---|---|\n| ${4:A} | ${5:B} | ${6:C} |', detail: 'Table' },
  { label: 'blockquote',insert: '> ${1:Quoted text}',                                                                 detail: 'Blockquote' },
  { label: 'hr',        insert: '---',                                                                                detail: 'Horizontal rule' },
  { label: 'details',   insert: '<details>\n<summary>${1:Summary}</summary>\n\n${2:Details content}\n</details>',    detail: '<details> block' },
  { label: 'badge',     insert: '![${1:label}](https://img.shields.io/badge/${1:label}-${2:message}-${3:blue})',      detail: 'Shields.io badge' },
  { label: 'toc',       insert: '## Table of Contents\n\n- [${1:Section}](#${2:section})',                           detail: 'Table of contents' },
  { label: 'frontmatter',insert: '---\ntitle: "${1:Title}"\ndate: "${2:2024-01-01}"\ndescription: "${3}"\n---',       detail: 'YAML front matter' },
];

// ── Helper: build the word-replacement range ──────────────────────────────────

/**
 * Returns a range that covers the word currently being typed at position.
 * Monaco uses this range to replace the partial word when a suggestion is accepted
 * AND to filter which suggestions appear as the user types.
 */
function getWordRange(model, position) {
  const word = model.getWordUntilPosition(position);
  return {
    startLineNumber: position.lineNumber,
    endLineNumber:   position.lineNumber,
    startColumn:     word.startColumn,
    endColumn:       word.endColumn,
  };
}

function makeKeyword(k, kind, range) {
  return { label: k, kind, insertText: k, range };
}

function makeSnippet(s, range, monaco) {
  return {
    label:       s.label,
    kind:        monaco.languages.CompletionItemKind.Snippet,
    detail:      s.detail,
    insertText:  s.insert,
    range,
    insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
    // filterText makes Monaco match on the label when the user types the label prefix
    filterText:  s.label,
  };
}

// ── Component ─────────────────────────────────────────────────────────────────

export const IDEEditor = forwardRef(function IDEEditor(
  { activeTab, onChange, onSave, readOnly = false },
  ref
) {
  const editorRef    = useRef(null);
  const monacoRef    = useRef(null);
  const onSaveRef    = useRef(onSave);
  const onChangeRef  = useRef(onChange);
  const activeTabRef = useRef(activeTab);
  const providersRegistered = useRef(false);

  useEffect(() => { onSaveRef.current    = onSave;    }, [onSave]);
  useEffect(() => { onChangeRef.current  = onChange;  }, [onChange]);
  useEffect(() => { activeTabRef.current = activeTab; }, [activeTab]);

  // ── Imperative API (used by IDEPage for cross-tab sync) ───────────────────
  useImperativeHandle(ref, () => ({
    /**
     * Push new content into the active Monaco model.
     * Called when a BroadcastChannel message arrives from the other tab.
     * Preserves cursor position where possible.
     */
    pushContent(content) {
      const editor = editorRef.current;
      const monaco = monacoRef.current;
      if (!editor || !monaco) return;

      const model = editor.getModel();
      if (!model || model.isDisposed()) return;

      // Only update if content actually differs — avoids a pointless undo entry
      if (model.getValue() === content) return;

      // Save + restore cursor/scroll so the user's position is preserved
      const position    = editor.getPosition();
      const scrollTop   = editor.getScrollTop();
      const scrollLeft  = editor.getScrollLeft();

      model.setValue(content);

      if (position) editor.setPosition(position);
      editor.setScrollTop(scrollTop);
      editor.setScrollLeft(scrollLeft);
    },
  }), []);

  // ── Register completion providers (once) ─────────────────────────────────

  const registerCompletionProviders = useCallback((monaco) => {
    if (providersRegistered.current) return;
    providersRegistered.current = true;
    const CIK = monaco.languages.CompletionItemKind;

    // Python
    monaco.languages.registerCompletionItemProvider('python', {
      provideCompletionItems(model, position) {
        const range = getWordRange(model, position);
        return {
          suggestions: [
            ...PYTHON_KEYWORDS.map(k => makeKeyword(k, CIK.Keyword,   range)),
            ...PYTHON_BUILTINS.map(b => makeKeyword(b, CIK.Function,  range)),
            ...PYTHON_SNIPPETS.map(s => makeSnippet(s, range, monaco)),
          ],
        };
      },
    });

    // Java
    monaco.languages.registerCompletionItemProvider('java', {
      provideCompletionItems(model, position) {
        const range = getWordRange(model, position);
        return {
          suggestions: [
            ...JAVA_KEYWORDS.map(k => makeKeyword(k, CIK.Keyword,  range)),
            ...JAVA_SNIPPETS.map(s => makeSnippet(s, range, monaco)),
          ],
        };
      },
    });

    // C and C++
    ['cpp', 'c'].forEach(lang => {
      monaco.languages.registerCompletionItemProvider(lang, {
        provideCompletionItems(model, position) {
          const range = getWordRange(model, position);
          return {
            suggestions: [
              ...CPP_KEYWORDS.map(k => makeKeyword(k, CIK.Keyword,  range)),
              ...CPP_SNIPPETS.map(s => makeSnippet(s, range, monaco)),
            ],
          };
        },
      });
    });

    // JavaScript / TypeScript — snippets on top of Monaco's native TS server
    ['javascript', 'typescript'].forEach(lang => {
      monaco.languages.registerCompletionItemProvider(lang, {
        provideCompletionItems(model, position) {
          const range = getWordRange(model, position);
          return {
            suggestions: JS_SNIPPETS.map(s => makeSnippet(s, range, monaco)),
          };
        },
      });
    });

    // HTML — snippets on top of Monaco's native HTML language service
    monaco.languages.registerCompletionItemProvider('html', {
      provideCompletionItems(model, position) {
        const range = getWordRange(model, position);
        return {
          suggestions: HTML_SNIPPETS.map(s => makeSnippet(s, range, monaco)),
        };
      },
    });

    // CSS — snippets on top of Monaco's native CSS language service
    monaco.languages.registerCompletionItemProvider('css', {
      provideCompletionItems(model, position) {
        const range = getWordRange(model, position);
        return {
          suggestions: CSS_SNIPPETS.map(s => makeSnippet(s, range, monaco)),
        };
      },
    });

    // Markdown — snippets (Monaco has minimal native MD support)
    monaco.languages.registerCompletionItemProvider('markdown', {
      triggerCharacters: ['#', '-', '`', '[', '!'],
      provideCompletionItems(model, position) {
        const range = getWordRange(model, position);
        return {
          suggestions: MD_SNIPPETS.map(s => makeSnippet(s, range, monaco)),
        };
      },
    });
  }, []);

  // ── Editor mount ──────────────────────────────────────────────────────────

  const handleEditorMount = useCallback((editor, monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;

    editor.addCommand(
      monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS,
      () => onSaveRef.current?.()
    );

    monaco.editor.defineTheme('ide-dark', {
      base: 'vs-dark', inherit: true, rules: [],
      colors: {
        'editor.background':              '#1e1e1e',
        'editor.lineHighlightBackground': '#2a2d2e',
        'editorLineNumber.foreground':    '#5a5a5a',
        'editorCursor.foreground':        '#aeafad',
      },
    });
    monaco.editor.setTheme('ide-dark');

    registerCompletionProviders(monaco);

    const tab = activeTabRef.current;
    if (tab) {
      const model = getOrCreateModel(monaco, tab);
      editor.setModel(model);
      editor.focus();
    }
  }, [registerCompletionProviders]);

  // ── Swap model on tab change ──────────────────────────────────────────────

  useEffect(() => {
    const editor = editorRef.current;
    const monaco = monacoRef.current;
    if (!editor || !monaco || !activeTab) return;
    const model = getOrCreateModel(monaco, activeTab);
    editor.setModel(model);
    editor.focus();
  }, [activeTab?.path]);

  const handleChange = useCallback((value) => {
    onChangeRef.current?.(value ?? '');
  }, []);

  // ── Empty state ───────────────────────────────────────────────────────────

  if (!activeTab) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-[#1e1e1e] text-[#555] select-none">
        <svg className="w-16 h-16 mb-4 opacity-20" viewBox="0 0 24 24" fill="currentColor">
          <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6zm4 18H6V4h7v5h5v11z" />
        </svg>
        <p className="text-sm">Open a file from the explorer to start editing</p>
        <p className="text-xs mt-1 text-[#444]">Right-click in the explorer to create new files</p>
      </div>
    );
  }

  return (
    <div className="flex-1 min-h-0 overflow-hidden">
      <MonacoEditor
        height="100%"
        defaultLanguage="plaintext"
        defaultValue=""
        onChange={handleChange}
        onMount={handleEditorMount}
        options={{
          readOnly,
          fontSize:                        14,
          fontFamily:                      "'Cascadia Code','Fira Code','JetBrains Mono',Consolas,monospace",
          fontLigatures:                   true,
          minimap:                         { enabled: false },
          scrollBeyondLastLine:            false,
          automaticLayout:                 true,
          tabSize:                         4,
          insertSpaces:                    true,
          wordWrap:                        'off',
          renderWhitespace:                'selection',
          smoothScrolling:                 true,
          cursorBlinking:                  'smooth',
          cursorSmoothCaretAnimation:      'on',
          bracketPairColorization:         { enabled: true },
          'semanticHighlighting.enabled':  true,
          // Trigger suggestions on every keystroke, not just specific chars
          quickSuggestions:                { other: true, comments: false, strings: true },
          quickSuggestionsDelay:           50,
          suggestOnTriggerCharacters:      true,
          acceptSuggestionOnEnter:         'on',
          tabCompletion:                   'on',
          wordBasedSuggestions:            'matchingDocuments',
          suggest: {
            showSnippets:   true,
            showKeywords:   true,
            showWords:      true,
            showFunctions:  true,
            filterGraceful: true,
            // Show suggestions even when in the middle of a word
            localityBonus:  true,
          },
          formatOnPaste:  true,
          formatOnType:   true,
          padding:        { top: 8 },
        }}
      />
    </div>
  );
});

// ── Model management ──────────────────────────────────────────────────────────

function getOrCreateModel(monaco, tab) {
  const monacoLang = languageToMonaco(tab.language);
  const uriStr = `file:///${tab.path.replace(/\\/g, '/')}`;
  const uri = monaco.Uri.parse(uriStr);

  let model = modelCache.get(tab.path) ?? monaco.editor.getModel(uri);

  if (!model || model.isDisposed()) {
    model = monaco.editor.createModel(tab.content, monacoLang, uri);
  } else {
    if (model.getLanguageId() !== monacoLang) {
      monaco.editor.setModelLanguage(model, monacoLang);
    }
    if (model.getValue() !== tab.content) {
      model.setValue(tab.content);
    }
  }

  modelCache.set(tab.path, model);
  return model;
}

// ── Language id map ───────────────────────────────────────────────────────────

const LANG_MAP = {
  python:'python', javascript:'javascript', typescript:'typescript',
  java:'java', cpp:'cpp', c:'c', go:'go', ruby:'ruby', rust:'rust',
  shell:'shell', json:'json', yaml:'yaml', xml:'xml', html:'html',
  css:'css', markdown:'markdown', plaintext:'plaintext',
};

function languageToMonaco(language) {
  return LANG_MAP[language?.toLowerCase()] ?? 'plaintext';
}
