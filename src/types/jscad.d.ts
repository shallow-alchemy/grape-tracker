declare module '@jscad/3mf-serializer' {
  export function serialize(options: { binary: boolean }, geometries: any[]): any[];
}

declare module '@jscad/modeling' {
  export const primitives: {
    cuboid: (options: { size: [number, number, number]; center: [number, number, number] }) => any;
  };
  export const booleans: {
    union: (...geometries: any[]) => any;
  };
  export const colors: {
    colorize: (color: [number, number, number], geometry: any) => any;
  };
}
