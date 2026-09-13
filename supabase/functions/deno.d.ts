/* Deno and Edge Functions ambient type declarations for IDE support */
declare namespace Deno {
  export interface Env {
    get(key: string): string | undefined;
    set(key: string, value: string): void;
  }
  export const env: Env;
  export function serve(handler: (req: Request) => Promise<Response> | Response): void;
}

declare module "npm:hono" {
  export class Hono {
    use(...args: any[]): any;
    get(...args: any[]): any;
    post(...args: any[]): any;
    put(...args: any[]): any;
    delete(...args: any[]): any;
    fetch: (req: Request) => Promise<Response>;
  }
  export type Context = any;
  export type Next = any;
}

declare module "npm:hono/cors" {
  export function cors(options?: any): any;
}

declare module "npm:hono/logger" {
  export function logger(fn?: any): any;
}

declare module "jsr:@supabase/supabase-js@2.49.8" {
  export function createClient(supabaseUrl?: string, supabaseKey?: string, options?: any): any;
}
