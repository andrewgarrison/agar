import type { JSX } from 'react';

const usage = `import {
  Popover,
  PopoverClose,
  PopoverContent,
  PopoverDescription,
  PopoverTitle,
  PopoverTrigger,
} from '@agar/react/popover';
import '@agar/react/styles.css';

<Popover>
  <PopoverTrigger>What is agar?</PopoverTrigger>
  <PopoverContent>
    <PopoverTitle>Agar</PopoverTitle>
    <PopoverDescription>A seaweed gelatin that makes jelly set.</PopoverDescription>
    <PopoverClose>Done</PopoverClose>
  </PopoverContent>
</Popover>`;

const controlled = `const [open, setOpen] = useState(false);

<Popover open={open} onOpenChange={setOpen}>
  ...
  <form onSubmit={(event) => { event.preventDefault(); save(); setOpen(false); }}>
</Popover>`;

/** How to put a popover on a page. */
export function Usage(): JSX.Element {
  return (
    <section aria-labelledby="usage">
      <h2 id="usage">Usage</h2>
      <p>
        Put a <code>PopoverTrigger</code> and a <code>PopoverContent</code> inside a <code>Popover</code>. Give the
        content a <code>PopoverTitle</code>: it names the panel for screen readers. Add a{' '}
        <code>PopoverDescription</code> for context, and a <code>PopoverClose</code> for each way to finish.
      </p>
      <pre>
        <code>{usage}</code>
      </pre>
      <p>
        Pass <code>open</code> and <code>onOpenChange</code> to own the state, for example to close after saving a form.
        The jelly shrinks back however it closes.
      </p>
      <pre>
        <code>{controlled}</code>
      </pre>
      <p>
        <code>side</code> and <code>align</code> place the panel; it flips when there isn&apos;t room.{' '}
        <code>dismissible=&#123;false&#125;</code> keeps it open on Escape or an outside press while it holds unsaved
        work, and <code>onDismissAttempt</code> tells you someone tried. The content stays in the page while closed, so
        fields keep what was typed between opens.
      </p>
    </section>
  );
}
