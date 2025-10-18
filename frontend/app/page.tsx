import Explorer from '@/components/Explorer';

export default function HomePage() {
  return (
    <main className="container">
      <section className="hero">
        <h1>Sam Research Hub</h1>
        <p>One-stop solution for discovering, organizing, and summarizing research papers.</p>
      </section>
      <section id="start" style={{ marginTop: 16 }}>
        <Explorer />
      </section>
    </main>
  );
}


