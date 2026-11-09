// Minimal typing for the parts of `word-extractor` this app uses (reading
// legacy .doc files). The package ships without TypeScript declarations.
declare module "word-extractor" {
  interface ExtractedDocument {
    getBody(): string;
  }
  export default class WordExtractor {
    extract(source: string | Buffer): Promise<ExtractedDocument>;
  }
}
