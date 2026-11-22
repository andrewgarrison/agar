import { VisuallyHidden } from '@agar/react/visually-hidden';

export default function Home() {
  return (
    <main>
      <h1>Agar</h1>
      <p>Accessible React components with soft-body jelly surfaces. Docs coming soon.</p>
      <button type="button">
        <span aria-hidden="true">★</span>
        <VisuallyHidden>Star Agar</VisuallyHidden>
      </button>
    </main>
  );
}
