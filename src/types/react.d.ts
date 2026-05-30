declare module "react" {
  interface RefObject<T> {
    current: T;
  }

  type DependencyList = readonly unknown[];
  type ReactNode = string | number | boolean | null | undefined;

  export function createElement(
    type: string,
    props?: Record<string, unknown> | null,
    ...children: ReactNode[]
  ): unknown;

  export function useMemo<T>(factory: () => T, deps: DependencyList): T;
  export function useRef<T>(initialValue: T): RefObject<T>;
}
