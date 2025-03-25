declare module 'pdf-parse' {
  function parse(dataBuffer: Buffer, options?: any): Promise<{
    text: string;
    numpages: number;
    info: any;
    metadata: any;
    version: string;
  }>;

  export = parse;
}