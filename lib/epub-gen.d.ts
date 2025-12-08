declare module 'epub-gen' {
  interface Chapter {
    title: string;
    data: string;
    excludeFromToc?: boolean;
    beforeToc?: boolean;
    filename?: string;
  }

  interface Options {
    title: string;
    author?: string | string[];
    publisher?: string;
    cover?: string;
    output: string;
    version?: number;
    css?: string;
    fonts?: string[];
    lang?: string;
    tocTitle?: string;
    appendChapterTitles?: boolean;
    customOpfTemplatePath?: string;
    customNcxTocTemplatePath?: string;
    customHtmlTocTemplatePath?: string;
    content: Chapter[];
    description?: string;
  }

  class EPub {
    constructor(options: Options);
    promise: Promise<void>;
  }

  export default EPub;
}
