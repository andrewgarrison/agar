import type { JSX } from 'react';

const usage = `import { Switch } from '@agar/react/switch';
import '@agar/react/styles.css';

<label>
  Airplane mode
  <Switch />
</label>`;

const controlled = `const [on, setOn] = useState(false);

<label>
  Wi-Fi
  <Switch checked={on} onCheckedChange={setOn} />
</label>`;

/** How to put a switch on a page. */
export function Usage(): JSX.Element {
  return (
    <section aria-labelledby="usage">
      <h2 id="usage">Usage</h2>
      <p>
        Wrap the switch and its text in a <code>&lt;label&gt;</code>, so clicking the text toggles it and screen readers
        announce the name.
      </p>
      <pre>
        <code>{usage}</code>
      </pre>
      <p>
        Pass <code>checked</code> and <code>onCheckedChange</code> to own the value. <code>name</code> and{' '}
        <code>value</code> take part in a native form, and a form reset returns it to <code>defaultChecked</code>.
      </p>
      <pre>
        <code>{controlled}</code>
      </pre>
    </section>
  );
}
