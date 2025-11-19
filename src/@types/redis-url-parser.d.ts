declare module "redis-url-parser" {
  export function parse(url: string): {
    host: string;
    port: number;
    database: number;
    password?: string;
  };
}
