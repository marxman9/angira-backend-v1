declare module 'bcryptjs' {
  export function hash(data: string, saltRounds: number): Promise<string>;
  export function compare(data: string, encrypted: string): Promise<boolean>;
  export function hashSync(data: string, saltRounds: number): string;
  export function compareSync(data: string, encrypted: string): boolean;
  export function genSaltSync(rounds?: number): string;
  export function genSalt(rounds?: number): Promise<string>;
} 