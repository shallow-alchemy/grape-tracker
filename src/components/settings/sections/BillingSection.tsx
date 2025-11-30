import { ComingSoonPlaceholder } from '../ComingSoonPlaceholder';

export const BillingSection = () => {
  return (
    <ComingSoonPlaceholder
      title="Billing Settings"
      features={[
        'Current plan and usage',
        'Upgrade or downgrade subscription',
        'Payment method management',
        'Billing history and invoices',
      ]}
    />
  );
};
