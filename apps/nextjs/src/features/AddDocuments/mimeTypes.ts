type MimeTypeRecord = Record<
  string,
  { friendlyName: string; extensions: string[] }
>;

// Supporting the top mime types and file extensions for upload.
// FIXME: make sure these are all handled.
// Before shipping to production, this list should be re-curated for completeness.
// FIXME: there may be some vulnerabilities to consider.
export const mimeTypeMapping: MimeTypeRecord = {
  "application/msword": {
    friendlyName: "Microsoft Word",
    extensions: ["doc", "dot"],
  },
  "application/pdf": {
    friendlyName: "PDF",
    extensions: ["pdf"],
  },
  "application/postscript": {
    friendlyName: "PostScript",
    extensions: ["ps", "eps", "ai"],
  },
  "application/rtf": {
    friendlyName: "Rich Text Format",
    extensions: ["rtf"],
  },
  "application/vnd.ms-excel": {
    friendlyName: "Microsoft Excel",
    extensions: ["xls", "xlt", "xla"],
  },
  "application/vnd.ms-powerpoint": {
    friendlyName: "Microsoft PowerPoint",
    extensions: ["ppt", "pps", "pot"],
  },
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": {
    friendlyName: "Microsoft Word (OpenXML)",
    extensions: ["docx", "dotx", "docm", "dotm"],
  },
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": {
    friendlyName: "Microsoft Excel (OpenXML)",
    extensions: ["xlsx", "xltx", "xlsm", "xltm"],
  },
  "application/vnd.openxmlformats-officedocument.presentationml.presentation": {
    friendlyName: "Microsoft PowerPoint (OpenXML)",
    extensions: ["pptx", "ppsx", "potx", "potm"],
  },
  "application/vnd.oasis.opendocument.text": {
    friendlyName: "OpenDocument Text",
    extensions: ["odt"],
  },
  "application/vnd.oasis.opendocument.spreadsheet": {
    friendlyName: "OpenDocument Spreadsheet",
    extensions: ["ods"],
  },
  "application/vnd.oasis.opendocument.presentation": {
    friendlyName: "OpenDocument Presentation",
    extensions: ["odp"],
  },
  "text/plain": {
    friendlyName: "Plain Text",
    extensions: ["txt", "text", "log"],
  },
  "text/csv": {
    friendlyName: "CSV",
    extensions: ["csv"],
  },
  "image/jpeg": {
    friendlyName: "JPEG",
    extensions: ["jpg", "jpeg", "jfif", "pjpeg", "pjp"],
  },
  "image/png": {
    friendlyName: "PNG",
    extensions: ["png"],
  },
  "image/gif": {
    friendlyName: "GIF",
    extensions: ["gif"],
  },
  "image/tiff": {
    friendlyName: "TIFF",
    extensions: ["tif", "tiff"],
  },
  "image/svg+xml": {
    friendlyName: "SVG",
    extensions: ["svg", "svgz"],
  },
  "image/vnd.adobe.photoshop": {
    friendlyName: "Adobe Photoshop",
    extensions: ["psd"],
  },
  "application/zip": {
    friendlyName: "ZIP",
    extensions: ["zip"],
  },
  "application/x-rar-compressed": {
    friendlyName: "RAR",
    extensions: ["rar"],
  },
  "application/vnd.google-apps.document": {
    friendlyName: "Google Docs",
    extensions: ["gdoc"],
  },
  "application/vnd.google-apps.spreadsheet": {
    friendlyName: "Google Sheets",
    extensions: ["gsheet"],
  },
  "application/vnd.google-apps.presentation": {
    friendlyName: "Google Slides",
    extensions: ["gslides"],
  },
  "application/vnd.ms-word.document.macroEnabled.12": {
    friendlyName: "Microsoft Word Macro-Enabled Document",
    extensions: ["docm"],
  },
  "application/vnd.ms-word.template.macroEnabled.12": {
    friendlyName: "Microsoft Word Macro-Enabled Template",
    extensions: ["dotm"],
  },
  "application/vnd.ms-powerpoint.presentation.macroEnabled.12": {
    friendlyName: "Microsoft PowerPoint Macro-Enabled Presentation",
    extensions: ["pptm"],
  },
  "application/vnd.ms-powerpoint.slideshow.macroEnabled.12": {
    friendlyName: "Microsoft PowerPoint Macro-Enabled Slideshow",
    extensions: ["ppsm"],
  },
  "application/vnd.ms-powerpoint.template.macroEnabled.12": {
    friendlyName: "Microsoft PowerPoint Macro-Enabled Template",
    extensions: ["potm"],
  },
  "application/vnd.ms-excel.sheet.macroEnabled.12": {
    friendlyName: "Microsoft Excel Macro-Enabled Workbook",
    extensions: ["xlsm"],
  },
  "application/vnd.ms-excel.sheet.binary.macroEnabled.12": {
    friendlyName: "Microsoft Excel Binary Workbook",
    extensions: ["xlsb"],
  },
  "application/vnd.ms-excel.template.macroEnabled.12": {
    friendlyName: "Microsoft Excel Macro-Enabled Template",
    extensions: ["xltm"],
  },
  "application/x-7z-compressed": {
    friendlyName: "7z",
    extensions: ["7z"],
  },
  "application/x-tar": {
    friendlyName: "TAR",
    extensions: ["tar"],
  },
  "application/x-gzip": {
    friendlyName: "GZIP",
    extensions: ["gz"],
  },
  "application/vnd.apple.pages": {
    friendlyName: "Pages",
    extensions: ["pages"],
  },
  "application/vnd.apple.numbers": {
    friendlyName: "Numbers",
    extensions: ["numbers"],
  },
  "application/vnd.apple.keynote": {
    friendlyName: "Keynote",
    extensions: ["key"],
  },
  "application/vnd.ms-xpsdocument": {
    friendlyName: "XPS Document",
    extensions: ["xps"],
  },
  "application/oxps": {
    friendlyName: "OpenXPS Document",
    extensions: ["oxps"],
  },
  "application/epub+zip": {
    friendlyName: "EPUB",
    extensions: ["epub"],
  },
  "application/vnd.amazon.ebook": {
    friendlyName: "Kindle Format",
    extensions: ["azw"],
  },
  "application/vnd.visio": {
    friendlyName: "Microsoft Visio",
    extensions: ["vsd", "vst", "vss", "vsw"],
  },
  "application/vnd.ms-visio.drawing.macroEnabled.12": {
    friendlyName: "Microsoft Visio Macro-Enabled Drawing",
    extensions: ["vsdm"],
  },
  "application/vnd.ms-visio.stencil.macroEnabled.12": {
    friendlyName: "Microsoft Visio Macro-Enabled Stencil",
    extensions: ["vssm"],
  },
  "application/vnd.ms-visio.template.macroEnabled.12": {
    friendlyName: "Microsoft Visio Macro-Enabled Template",
    extensions: ["vstm"],
  },
  "application/x-python": {
    friendlyName: "Python",
    extensions: ["py"],
  },
  "application/javascript": {
    friendlyName: "JavaScript",
    extensions: ["js"],
  },
  "application/typescript": {
    friendlyName: "TypeScript",
    extensions: ["ts"],
  },
  "application/json": {
    friendlyName: "JSON",
    extensions: ["json"],
  },
  "application/x-httpd-php": {
    friendlyName: "PHP",
    extensions: ["php"],
  },
  "application/java-archive": {
    friendlyName: "Java Archive",
    extensions: ["jar"],
  },
  "application/x-java-class": {
    friendlyName: "Java Class",
    extensions: ["class"],
  },
  "application/java-serialized-object": {
    friendlyName: "Java Serialized Object",
    extensions: ["ser"],
  },
  "application/vnd.android.package-archive": {
    friendlyName: "Android Package",
    extensions: ["apk"],
  },
  "application/x-ruby": {
    friendlyName: "Ruby",
    extensions: ["rb"],
  },
  "application/x-groovy": {
    friendlyName: "Groovy",
    extensions: ["groovy"],
  },
  "application/x-perl": {
    friendlyName: "Perl",
    extensions: ["pl"],
  },
  "application/x-sh": {
    friendlyName: "Shell Script",
    extensions: ["sh"],
  },
  "application/xml": {
    friendlyName: "XML",
    extensions: ["xml"],
  },
  "application/x-csrc": {
    friendlyName: "C Source...",
    extensions: ["c"],
  },
  "application/x-c++src": {
    friendlyName: "C++ Source...",
    extensions: ["cpp", "cxx", "cc"],
  },
  "application/x-object": {
    friendlyName: "C Object...",
    extensions: ["o"],
  },
  "application/wasm": {
    friendlyName: "WebAssembly",
    extensions: ["wasm"],
  },
  "application/x-sql": {
    friendlyName: "SQL",
    extensions: ["sql"],
  },
  "text/html": {
    friendlyName: "HTML",
    extensions: ["html", "htm"],
  },
  "text/css": {
    friendlyName: "CSS",
    extensions: ["css"],
  },
  "text/x-markdown": {
    friendlyName: "Markdown",
    extensions: ["md", "markdown"],
  },
  "application/vnd.github+json": {
    friendlyName: "GitHub JSON",
    extensions: ["gson"],
  },
  "application/x-yaml": {
    friendlyName: "YAML",
    extensions: ["yaml", "yml"],
  },
  "application/vnd.docker.distribution.manifest.v2+json": {
    friendlyName: "Docker Manifest",
    extensions: ["docker"],
  },
  "application/x-scheme": {
    friendlyName: "Scheme",
    extensions: ["scm", "ss"],
  },
  "application/x-lisp": {
    friendlyName: "Lisp",
    extensions: ["lisp", "lsp"],
  },
  "application/vnd.mozilla.xul+xml": {
    friendlyName: "XUL",
    extensions: ["xul"],
  },
  "application/x-csharp": {
    friendlyName: "C#",
    extensions: ["cs"],
  },
  "application/x-fortran": {
    friendlyName: "Fortran",
    extensions: ["f", "for", "f90"],
  },
  "application/x-pascal": {
    friendlyName: "Pascal",
    extensions: ["pas"],
  },
  "application/x-rust": {
    friendlyName: "Rust",
    extensions: ["rs"],
  },
  "application/x-cobol": {
    friendlyName: "COBOL",
    extensions: ["cbl", "cob"],
  },
  "application/x-haskell": {
    friendlyName: "Haskell",
    extensions: ["hs"],
  },
  "application/x-scala": {
    friendlyName: "Scala",
    extensions: ["scala"],
  },
  "application/x-erlang": {
    friendlyName: "Erlang",
    extensions: ["erl", "beam"],
  },
  "application/x-lua": {
    friendlyName: "Lua",
    extensions: ["lua"],
  },
  "application/x-go": {
    friendlyName: "Go",
    extensions: ["go"],
  },
  "application/x-dart": {
    friendlyName: "Dart",
    extensions: ["dart"],
  },
  "application/vnd.latex-z": {
    friendlyName: "LaTeX",
    extensions: ["latex", "tex"],
  },
  "text/vtt": {
    friendlyName: "WebVTT",
    extensions: ["vtt"],
  },
  "text/calendar": {
    friendlyName: "iCalendar",
    extensions: ["ics", "ifb"],
  },
  "text/troff": {
    friendlyName: "Troff",
    extensions: ["tr", "troff"],
  },
  "text/n3": {
    friendlyName: "Notation3",
    extensions: ["n3"],
  },
  "text/vnd.graphviz": {
    friendlyName: "Graphviz DOT",
    extensions: ["dot", "gv"],
  },
  "text/vhdl": {
    friendlyName: "VHDL",
    extensions: ["vhd", "vhdl"],
  },
  "text/verilog": {
    friendlyName: "Verilog",
    extensions: ["v", "sv"],
  },
  "text/url": {
    friendlyName: "URL",
    extensions: ["url"],
  },
  "text/x-bibtex": {
    friendlyName: "BibTeX",
    extensions: ["bib"],
  },
  "text/x-texinfo": {
    friendlyName: "Texinfo",
    extensions: ["texinfo", "texi"],
  },
  "text/x-sdiff": {
    friendlyName: "sdiff",
    extensions: ["sdiff"],
  },
  "text/x-diff": {
    friendlyName: "diff",
    extensions: ["diff"],
  },
  "text/x-patch": {
    friendlyName: "Patch",
    extensions: ["patch"],
  },
  "text/x-csv-schema": {
    friendlyName: "CSV Schema",
    extensions: ["csvs"],
  },
  "text/x-sgml": {
    friendlyName: "SGML",
    extensions: ["sgml", "sgm"],
  },
  "text/x-asciidoc": {
    friendlyName: "AsciiDoc",
    extensions: ["adoc", "asciidoc"],
  },
  "text/x-tex": {
    friendlyName: "TeX",
    extensions: ["tex"],
  },
  "text/x-stata-ado": {
    friendlyName: "Stata ADO",
    extensions: ["ado"],
  },
  "text/x-stata-do": {
    friendlyName: "Stata DO",
    extensions: ["do"],
  },
  "text/x-brainfuck": {
    friendlyName: "Brainfuck",
    extensions: ["bf"],
  },
  "text/x-shellscript": {
    friendlyName: "Shell Script",
    extensions: ["sh", "bash", "ksh"],
  },
  "text/x-literate-haskell": {
    friendlyName: "Literate Haskell",
    extensions: ["lhs"],
  },
  "text/x-clojure": {
    friendlyName: "Clojure",
    extensions: ["clj"],
  },
  "text/x-ocaml": {
    friendlyName: "OCaml",
    extensions: ["ml", "mli"],
  },
  "text/x-screenplay": {
    friendlyName: "Screenplay",
    extensions: ["scp", "sc"],
  },
  "application/x-fountain": {
    friendlyName: "Fountain",
    extensions: ["fountain"],
  },
  "text/x-final-draft": {
    friendlyName: "Final Draft",
    extensions: ["fdx"],
  },
  "text/x-celtx": {
    friendlyName: "Celtx",
    extensions: ["celtx"],
  },
  "text/x-movie-script": {
    friendlyName: "Movie Script",
    extensions: ["msc"],
  },
  "text/x-playwright": {
    friendlyName: "Playwright",
    extensions: ["play", "pw"],
  },
  "text/x-poetry": {
    friendlyName: "Poetry",
    extensions: ["pty"],
  },
  "text/x-usf": {
    friendlyName: "Unified Stage Format",
    extensions: ["usf"],
  },
  "text/x-lyric": {
    friendlyName: "Lyric",
    extensions: ["lrc"],
  },
  "text/x-storyboard": {
    friendlyName: "Storyboard",
    extensions: ["sbd"],
  },
  "text/x-jargon": {
    friendlyName: "Jargon",
    extensions: ["jgn"],
  },
  "text/x-teleprompter": {
    friendlyName: "Teleprompter",
    extensions: ["tpt"],
  },
  "text/x-speech": {
    friendlyName: "Speech",
    extensions: ["spc"],
  },
  // continue text-resolvable formats for more industries
};
export function getAllMimeTypes(): string[] {
  return Object.keys(mimeTypeMapping);
}

export function getFriendlyNameByMimeType(
  mimeType: string,
): string | undefined {
  return mimeTypeMapping[mimeType]?.friendlyName;
}

export function getFriendlyNameByExtension(
  extension: string,
): string | undefined {
  const mimeType = getMimeTypeByExtension(extension);
  return mimeType ? getFriendlyNameByMimeType(mimeType) : undefined;
}

export function getMimeTypeByExtension(extension: string): string | undefined {
  const lowerCaseExtension = extension.toLowerCase();
  return Object.keys(mimeTypeMapping).find(
    (mimeType) =>
      mimeTypeMapping[mimeType]?.extensions.includes(lowerCaseExtension) ??
      false,
  );
}

export function getAllExtensions(): string[] {
  return Object.values(mimeTypeMapping).reduce(
    (accumulatedExtensions, value) => {
      return accumulatedExtensions.concat(value.extensions);
    },
    [] as string[],
  );
}

export const acceptExtensions = getAllExtensions().join(",");
