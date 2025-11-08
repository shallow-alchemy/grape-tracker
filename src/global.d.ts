declare module '*.module.css' {
  const classes: { [key: string]: string };
  export default classes;
}

interface ImportMetaEnv {
  readonly PUBLIC_ELECTRIC_URL?: string;
  readonly PUBLIC_CLERK_PUBLISHABLE_KEY?: string;
  readonly PUBLIC_API_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
