// The barrel re-exports every component. Prefer the per-component entry
// points (`@agar/react/switch`) in apps; both tree-shake.
export {
  Popover,
  PopoverClose,
  PopoverContent,
  PopoverDescription,
  PopoverTitle,
  PopoverTrigger,
  type PopoverAlign,
  type PopoverCloseProps,
  type PopoverContentProps,
  type PopoverDescriptionProps,
  type PopoverDismissAttemptDetails,
  type PopoverDismissReason,
  type PopoverFinalFocus,
  type PopoverInitialFocus,
  type PopoverOpenChangeDetails,
  type PopoverOpenChangeReason,
  type PopoverProps,
  type PopoverSide,
  type PopoverTitleProps,
  type PopoverTriggerProps,
} from './popover';
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
