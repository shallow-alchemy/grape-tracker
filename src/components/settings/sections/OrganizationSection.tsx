import { ComingSoonPlaceholder } from '../ComingSoonPlaceholder';

export const OrganizationSection = () => {
  return (
    <ComingSoonPlaceholder
      title="Organization Settings"
      features={[
        'Vineyard name and location',
        'Default measurement units',
        'Team member management',
        'Roles and permissions',
      ]}
    />
  );
};
