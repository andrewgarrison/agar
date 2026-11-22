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
export { VisuallyHidden, type VisuallyHiddenProps } from './visually-hidden';
