import type { JSX } from 'react';

const usage = `import { Button } from '@agar/react/button';
import '@agar/react/styles.css';

<Button onClick={publish}>Publish</Button>
<Button onClick={saveDraft}>Save draft</Button>`;

const pending = `<Button onClick={async () => save()} pendingAnnouncement="Saving">
  <Spinner data-show="pending" aria-hidden="true" />
  Save changes
</Button>`;

const forms = `<form onSubmit={subscribe}>
  …
  <Button type="submit">Subscribe</Button>
  <Button type="reset">Reset</Button>
</form>`;

/** How to put a button on a page. */
export function Usage(): JSX.Element {
  return (
    <section aria-labelledby="usage">
      <h2 id="usage">Usage</h2>
      <p>
        The button&apos;s content is its name. It&apos;s jelly glass: it frosts what&apos;s behind it, and squishes like
        gelatin when it&apos;s pressed.
      </p>
      <pre>
        <code>{usage}</code>
      </pre>
      <p>
        Return a Promise from <code>onClick</code> to keep the button pending until it settles. It ignores presses
        meanwhile, so nothing runs twice. Mark content <code>data-show=&quot;pending&quot;</code> or{' '}
        <code>&quot;idle&quot;</code> to show it in one state only.
      </p>
      <pre>
        <code>{pending}</code>
      </pre>
      <p>
        It defaults to <code>type=&quot;button&quot;</code>, which does nothing in a form. Set <code>submit</code> or{' '}
        <code>reset</code> to submit or reset it.
      </p>
      <pre>
        <code>{forms}</code>
      </pre>
    </section>
  );
}
