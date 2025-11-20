// types/super-winrar.d.ts
declare module 'super-winrar' {
  interface RarOptions {
    path?: string;
    files?: string[];
    password?: string;
  }

  interface RarConfig {
    password?: string;
    comment?: string;
    volumes?: string;
    deleteAfter?: boolean;
    level?: number;
  }

  class Rar {
    constructor(filePath: string);
    
    on(event: 'error', callback: (error: Error) => void): void;
    on(event: 'ready', callback: () => void): void;
    on(event: 'password', callback: () => void): void;
    once(event: 'ready', callback: () => void): void;
    once(event: 'password', callback: () => void): void;
    
    addFile(filePath: string | string[]): void;
    setPassword(password: string): Promise<boolean>;
    setPassword(password: string, callback: (isCorrect: boolean) => void): void;
    
    extract(options?: RarOptions): Promise<void>;
    extract(options: RarOptions, callback: (err?: Error) => void): void;
    
    rar(): Promise<void>;
    list(): Promise<any[]>;
    list(callback: (err?: Error, files?: any[]) => void): void;
    
    getFileBuffer(pathInsideRar: string): Promise<Buffer>;
    getFileBuffer(pathInsideRar: string, callback: (err?: Error, buffer?: Buffer) => void): void;
    
    close(): void;
  }

  export = Rar;
}
