declare module 'fs/promises' {
  export const mkdir: (...args: any[]) => Promise<any>;
  export const readdir: (...args: any[]) => Promise<any>;
  export const rm: (...args: any[]) => Promise<any>;
  export const writeFile: (...args: any[]) => Promise<any>;
}

declare module 'path' {
  const path: any;
  export default path;
}

declare module 'url' {
  export const fileURLToPath: (value: string | URL) => string;
}

declare module '@google/stitch-sdk' {
  export const stitch: {
    callTool: (name: string, input: Record<string, unknown>) => Promise<unknown>;
  };
}

declare module 'cheerio' {
  export type CheerioAPI = {
    (selector: any): any;
    load: (html: string) => CheerioAPI;
  };

  export function load(html: string): CheerioAPI;
}

declare const process: {
  argv: string[];
  stdout: { write: (message: string) => void };
  stderr: { write: (message: string) => void };
  exitCode?: number;
};

declare const Buffer: {
  from: (value: ArrayBuffer) => Uint8Array;
};
