import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { FiArrowLeft } from 'react-icons/fi';
import { getActiveSections, getSectionById, type SettingsSectionConfig } from './settingsRegistry';
import styles from './SettingsPage.module.css';

type SettingsPageProps = {
  section?: string;
};

export const SettingsPage = ({ section }: SettingsPageProps) => {
  const [, setLocation] = useLocation();
  const sections = getActiveSections();

  // Default to first section if none specified or invalid
  const getDefaultSection = () => sections[0]?.id || 'organization';

  const [activeSection, setActiveSection] = useState<string>(
    section && getSectionById(section) ? section : getDefaultSection()
  );

  // Sync with URL when section prop changes
  useEffect(() => {
    if (section && getSectionById(section)) {
      setActiveSection(section);
    }
  }, [section]);

  const handleSectionChange = (sectionId: string) => {
    setActiveSection(sectionId);
    setLocation(`/settings/${sectionId}`);
  };

  const handleBack = () => {
    setLocation('/');
  };

  const activeSectionConfig = getSectionById(activeSection);
  const ActiveComponent = activeSectionConfig?.component;

  return (
    <div className={styles.settingsPage}>
      <div className={styles.settingsHeader}>
        <button className={styles.backButton} onClick={handleBack}>
          <FiArrowLeft className={styles.backIcon} />
          <span>Back</span>
        </button>
        <h1 className={styles.pageTitle}>Settings</h1>
      </div>

      <div className={styles.settingsLayout}>
        {/* Desktop sidebar */}
        <nav className={styles.settingsSidebar}>
          {sections.map((s) => (
            <SectionNavItem
              key={s.id}
              section={s}
              isActive={activeSection === s.id}
              onClick={() => handleSectionChange(s.id)}
            />
          ))}
        </nav>

        {/* Mobile section selector */}
        <div className={styles.mobileSectionSelector}>
          <select
            className={styles.sectionSelect}
            value={activeSection}
            onChange={(e) => handleSectionChange(e.target.value)}
          >
            {sections.map((s) => (
              <option key={s.id} value={s.id}>
                {s.title}
                {s.status === 'coming-soon' && ' (Coming Soon)'}
              </option>
            ))}
          </select>
        </div>

        {/* Main content area */}
        <main className={styles.settingsContent}>
          {ActiveComponent && <ActiveComponent />}
        </main>
      </div>
    </div>
  );
};

type SectionNavItemProps = {
  section: SettingsSectionConfig;
  isActive: boolean;
  onClick: () => void;
};

const SectionNavItem = ({ section, isActive, onClick }: SectionNavItemProps) => {
  const Icon = section.icon;

  return (
    <button
      className={`${styles.navItem} ${isActive ? styles.navItemActive : ''}`}
      onClick={onClick}
    >
      <Icon className={styles.navIcon} />
      <div className={styles.navItemContent}>
        <span className={styles.navItemTitle}>
          {section.title}
          {section.status === 'coming-soon' && (
            <span className={styles.comingSoonTag}>Soon</span>
          )}
          {section.status === 'beta' && (
            <span className={styles.betaTag}>Beta</span>
          )}
        </span>
        <span className={styles.navItemDescription}>{section.description}</span>
      </div>
    </button>
  );
};
