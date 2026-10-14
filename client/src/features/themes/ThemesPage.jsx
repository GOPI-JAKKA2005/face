import React from 'react';
import { PageHeader } from '../../components/layout/PageHeader.jsx';
import { ThemePanel } from '../../components/theme/ThemePanel.jsx';

export function ThemesPage() {
  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <PageHeader
        title="Theme & Branding Studio"
        description="Customize institutional brand colors, accessible light/dark palettes, typography, and interface geometry."
      />

      <ThemePanel />
    </div>
  );
}
