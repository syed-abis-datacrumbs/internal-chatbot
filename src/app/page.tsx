export default function Home() {
  return (
    <main style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#f2f1ee',
      padding: '24px',
    }}>
      <div style={{
        background: '#fff',
        borderRadius: '20px',
        padding: '48px 40px',
        maxWidth: '480px',
        width: '100%',
        boxShadow: '0 4px 32px rgba(0,0,0,0.08)',
        textAlign: 'center',
      }}>
        <div style={{
          width: '56px',
          height: '56px',
          borderRadius: '50%',
          background: '#2AAA8A',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '24px',
          margin: '0 auto 20px',
        }}>🤖</div>

        <h1 style={{
          fontSize: '22px',
          fontWeight: '700',
          color: '#0a0a0a',
          marginBottom: '8px',
          letterSpacing: '-0.3px',
        }}>
          DataCrumbs Assistant
        </h1>

        <p style={{
          fontSize: '14px',
          color: '#666',
          lineHeight: '1.6',
          marginBottom: '32px',
        }}>
          Ask anything about the AI & Data Science Bootcamp — curriculum, pricing, enrollment, career outcomes, and more.
        </p>

        <div style={{
          background: '#f9f9f9',
          borderRadius: '12px',
          padding: '16px',
          textAlign: 'left',
          fontSize: '13px',
          color: '#555',
          lineHeight: '1.7',
        }}>
          <strong style={{ color: '#0a0a0a' }}>Try asking:</strong><br />
          • What does the bootcamp cost?<br />
          • What will I learn in 16 weeks?<br />
          • Do I need coding experience?<br />
          • Send me the brochure
        </div>
      </div>

      <p style={{ marginTop: '20px', fontSize: '12px', color: '#aaa' }}>
        Click the chat icon in the bottom-right corner to start
      </p>
    </main>
  );
}
