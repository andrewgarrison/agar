// The barrel re-exports every component. Prefer the per-component entry
// points (`@agar/react/switch`) in apps; both tree-shake.
export {
  Switch,
  SwitchThumb,
  type SwitchChangeDetails,
  type SwitchChangeReason,
  type SwitchProps,
  type SwitchThumbProps,
} from './switch';
export {
  Tabs,
  TabsList,
  TabsPanel,
  TabsTab,
  type TabsChangeDetails,
  type TabsChangeReason,
  type TabsListProps,
  type TabsOrientation,
  type TabsPanelProps,
  type TabsProps,
  type TabsTabProps,
} from './tabs';
export { VisuallyHidden, type VisuallyHiddenProps } from './visually-hidden';
