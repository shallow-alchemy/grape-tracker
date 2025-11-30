import { ComponentType } from 'react';
import { IconType } from 'react-icons';
import { FiUsers, FiBell, FiList, FiLayout, FiShoppingBag, FiCreditCard } from 'react-icons/fi';
import { OrganizationSection } from './sections/OrganizationSection';
import { NotificationsSection } from './sections/NotificationsSection';
import { StagesTasksSection } from './sections/StagesTasksSection';
import { ThemeSection } from './sections/ThemeSection';
import { StorefrontSection } from './sections/StorefrontSection';
import { BillingSection } from './sections/BillingSection';

export type SectionStatus = 'active' | 'coming-soon' | 'beta' | 'hidden';

export type SettingsSectionConfig = {
  id: string;
  title: string;
  icon: IconType;
  description: string;
  status: SectionStatus;
  component: ComponentType;
  order: number;
};

const sectionsConfig: SettingsSectionConfig[] = [
  {
    id: 'organization',
    title: 'Organization',
    icon: FiUsers,
    description: 'Manage your vineyard name, location, and team',
    status: 'coming-soon' as const,
    component: OrganizationSection,
    order: 10,
  },
  {
    id: 'notifications',
    title: 'Notifications',
    icon: FiBell,
    description: 'Configure alerts and notification preferences',
    status: 'coming-soon' as const,
    component: NotificationsSection,
    order: 20,
  },
  {
    id: 'stages-tasks',
    title: 'Stages & Tasks',
    icon: FiList,
    description: 'Customize winemaking stages and task templates',
    status: 'active' as const,
    component: StagesTasksSection,
    order: 30,
  },
  {
    id: 'theme',
    title: 'Theme',
    icon: FiLayout,
    description: 'Personalize your app appearance',
    status: 'coming-soon' as const,
    component: ThemeSection,
    order: 40,
  },
  {
    id: 'storefront',
    title: 'Storefront',
    icon: FiShoppingBag,
    description: 'Publish your vineyard to the web',
    status: 'coming-soon' as const,
    component: StorefrontSection,
    order: 50,
  },
  {
    id: 'billing',
    title: 'Billing',
    icon: FiCreditCard,
    description: 'Manage your subscription and payments',
    status: 'coming-soon' as const,
    component: BillingSection,
    order: 60,
  },
];

export const settingsSections = sectionsConfig.sort((a, b) => a.order - b.order);

export const getActiveSections = (): SettingsSectionConfig[] =>
  settingsSections.filter(s => s.status !== 'hidden');

export const getSectionById = (id: string): SettingsSectionConfig | undefined =>
  settingsSections.find(s => s.id === id);
