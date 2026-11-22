import { Switch } from '@agar/react/switch';
import type { JSX } from 'react';

/** Live switches in each state. */
export function Examples(): JSX.Element {
  return (
    <section aria-labelledby="examples" className="demo">
      <h2 id="examples">Examples</h2>
      <label className="setting">
        Airplane mode
        <Switch />
      </label>
      <label className="setting">
        Wi-Fi
        <Switch defaultChecked />
      </label>
      <label className="setting">
        Security alerts (always on)
        <Switch defaultChecked disabled />
      </label>
      <label className="setting">
        Encrypt backups (managed by your organization)
        <Switch defaultChecked readOnly />
      </label>
    </section>
  );
}
