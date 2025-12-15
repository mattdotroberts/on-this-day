import JSZip from 'jszip';

export interface EpubChapter {
  title: string;
  content: string; // HTML content
}

export interface EpubOptions {
  title: string;
  author: string;
  description?: string;
  publisher?: string;
  language?: string;
}

/**
 * Generate an EPUB file in memory using JSZip
 *
 * EPUB structure:
 * - mimetype (uncompressed, must be first)
 * - META-INF/container.xml
 * - OEBPS/content.opf (package document)
 * - OEBPS/toc.ncx (navigation)
 * - OEBPS/chapter1.xhtml, chapter2.xhtml, etc.
 * - OEBPS/style.css
 */
export async function generateEpub(
  options: EpubOptions,
  chapters: EpubChapter[]
): Promise<Buffer> {
  const zip = new JSZip();
  const uuid = generateUUID();

  // 1. mimetype - must be first and uncompressed
  zip.file('mimetype', 'application/epub+zip', { compression: 'STORE' });

  // 2. META-INF/container.xml
  zip.file('META-INF/container.xml', `<?xml version="1.0" encoding="UTF-8"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles>
    <rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/>
  </rootfiles>
</container>`);

  // 3. OEBPS/style.css
  zip.file('OEBPS/style.css', `
body {
  font-family: Georgia, serif;
  line-height: 1.6;
  margin: 1em;
  color: #333;
}
h1 {
  font-size: 1.8em;
  margin-bottom: 0.5em;
  color: #1a1a1a;
  text-align: center;
}
h2 {
  font-size: 1.4em;
  margin-top: 1.5em;
  margin-bottom: 0.3em;
  color: #333;
}
p {
  margin: 0.8em 0;
  text-align: justify;
}
.title-page {
  text-align: center;
  padding: 3em 1em;
}
.title-page h1 {
  font-size: 2em;
  margin: 0.5em 0;
}
.subtitle {
  font-style: italic;
  color: #666;
}
.date {
  color: #666;
  font-style: italic;
  margin-bottom: 1em;
}
.name-connection {
  font-size: 0.9em;
  color: #555;
  margin-top: 1em;
  padding-left: 1em;
  border-left: 2px solid #ccc;
}
.sources {
  font-size: 0.8em;
  color: #999;
  margin-top: 0.5em;
}
hr {
  width: 50%;
  margin: 2em auto;
  border: none;
  border-top: 1px solid #ccc;
}
`);

  // 4. Generate chapter files
  const manifestItems: string[] = [];
  const spineItems: string[] = [];
  const navPoints: string[] = [];

  chapters.forEach((chapter, index) => {
    const chapterId = `chapter${index + 1}`;
    const filename = `${chapterId}.xhtml`;

    // Create XHTML file
    const xhtml = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xml:lang="${options.language || 'en'}">
<head>
  <title>${escapeXml(chapter.title)}</title>
  <link rel="stylesheet" type="text/css" href="style.css"/>
</head>
<body>
${chapter.content}
</body>
</html>`;

    zip.file(`OEBPS/${filename}`, xhtml);

    manifestItems.push(
      `    <item id="${chapterId}" href="${filename}" media-type="application/xhtml+xml"/>`
    );
    spineItems.push(`    <itemref idref="${chapterId}"/>`);
    navPoints.push(`    <navPoint id="nav-${index + 1}" playOrder="${index + 1}">
      <navLabel><text>${escapeXml(chapter.title)}</text></navLabel>
      <content src="${filename}"/>
    </navPoint>`);
  });

  // 5. OEBPS/content.opf (Package document)
  const contentOpf = `<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" version="2.0" unique-identifier="BookId">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:opf="http://www.idpf.org/2007/opf">
    <dc:title>${escapeXml(options.title)}</dc:title>
    <dc:creator opf:role="aut">${escapeXml(options.author)}</dc:creator>
    <dc:language>${options.language || 'en'}</dc:language>
    <dc:identifier id="BookId">urn:uuid:${uuid}</dc:identifier>
    ${options.description ? `<dc:description>${escapeXml(options.description)}</dc:description>` : ''}
    ${options.publisher ? `<dc:publisher>${escapeXml(options.publisher)}</dc:publisher>` : ''}
  </metadata>
  <manifest>
    <item id="ncx" href="toc.ncx" media-type="application/x-dtbncx+xml"/>
    <item id="css" href="style.css" media-type="text/css"/>
${manifestItems.join('\n')}
  </manifest>
  <spine toc="ncx">
${spineItems.join('\n')}
  </spine>
</package>`;

  zip.file('OEBPS/content.opf', contentOpf);

  // 6. OEBPS/toc.ncx (Navigation)
  const tocNcx = `<?xml version="1.0" encoding="UTF-8"?>
<ncx xmlns="http://www.daisy.org/z3986/2005/ncx/" version="2005-1">
  <head>
    <meta name="dtb:uid" content="urn:uuid:${uuid}"/>
    <meta name="dtb:depth" content="1"/>
    <meta name="dtb:totalPageCount" content="0"/>
    <meta name="dtb:maxPageNumber" content="0"/>
  </head>
  <docTitle>
    <text>${escapeXml(options.title)}</text>
  </docTitle>
  <navMap>
${navPoints.join('\n')}
  </navMap>
</ncx>`;

  zip.file('OEBPS/toc.ncx', tocNcx);

  // Generate the zip file as a Node.js Buffer
  const buffer = await zip.generateAsync({
    type: 'nodebuffer',
    mimeType: 'application/epub+zip',
    compression: 'DEFLATE',
    compressionOptions: { level: 9 },
  });

  return buffer;
}

function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}
