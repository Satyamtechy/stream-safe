// Minimal React type declarations for build (consumers provide full @types/react)
declare module "react" {
  export function createElement(
    type: string | ((...args: any[]) => any),
    props?: Record<string, any> | null,
    ...children: any[]
  ): any;
  export function useMemo<T>(factory: () => T, deps: any[]): T;
  export function useRef<T>(initialValue: T): { current: T };
}
