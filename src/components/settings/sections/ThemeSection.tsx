import { ComingSoonPlaceholder } from '../ComingSoonPlaceholder';

export const ThemeSection = () => {
  return (
    <ComingSoonPlaceholder
      title="Theme Settings"
      features={[
        'Dark/Light mode toggle',
        'Accent color selection',
        'Preset themes (Terminal Green, Amber CRT, Blue Steel)',
        'Custom color pickers',
        'Font preferences',
        'Animation settings',
      ]}
    />
  );
};
