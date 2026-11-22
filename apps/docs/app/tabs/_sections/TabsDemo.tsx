import type { TabsOrientation } from '@agar/react/tabs';
import { Tabs, TabsList, TabsPanel, TabsTab } from '@agar/react/tabs';
import type { JSX } from 'react';

export interface DemoTab {
  readonly value: string;
  readonly label: string;
  readonly panel: string;
  readonly disabled?: boolean;
}

interface TabsDemoProps {
  /** Names the tab list. */
  readonly label: string;
  readonly tabs: readonly DemoTab[];
  readonly defaultValue: string;
  readonly orientation?: TabsOrientation;
}

/** One live set of tabs, built from a list. */
export function TabsDemo({ label, tabs, defaultValue, orientation = 'horizontal' }: TabsDemoProps): JSX.Element {
  return (
    <Tabs defaultValue={defaultValue} orientation={orientation}>
      <TabsList aria-label={label}>
        {tabs.map(({ value, label: text, disabled }) => (
          <TabsTab key={value} value={value} disabled={disabled ?? false}>
            {text}
          </TabsTab>
        ))}
      </TabsList>
      {tabs.map(({ value, panel }) => (
        <TabsPanel key={value} value={value}>
          {panel}
        </TabsPanel>
      ))}
    </Tabs>
  );
}
