declare module '@prisma/client' {
  export class PrismaClient {
    constructor(...args: any[]);
    $extends(extension: any): this;
    $connect(): Promise<void>;
    $disconnect(): Promise<void>;
    [key: string]: any;
  }

  export namespace Prisma {
    type QueryOptionsCbArgs = {
      model?: string;
      operation: string;
      args: Record<string, any>;
      query: (args: Record<string, any>) => Promise<any>;
    };

    type QueryOptionsCb = (args: QueryOptionsCbArgs) => Promise<any>;

    function defineExtension(extension: any): any;
  }
}
