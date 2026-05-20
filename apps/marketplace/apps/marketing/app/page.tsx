export default function Home() {
  return (
    <>
      <header className="nav">
        <div className="brand">🔧 Artisan</div>
        <nav className="actions">
          <a href="#features">Features</a>
          <a href="#how">How it works</a>
          <a href="#download" className="cta">Get the app</a>
        </nav>
      </header>

      <section className="hero">
        <h1>Find trusted artisans, fast.</h1>
        <p>
          Verified plumbers, electricians, carpenters, painters, mechanics, AC technicians and more
          — booked in seconds, right from your phone.
        </p>
        <div className="cta-row">
          <a href="#download" className="btn primary">Download for iOS &amp; Android</a>
          <a href="#how" className="btn ghost">How it works</a>
        </div>
      </section>

      <section className="section" id="features">
        <h2>Built for trust and speed</h2>
        <div className="features">
          <Feature ico="📍" title="Nearby discovery" body="See verified artisans on a live map, sorted by distance, rating, or price." />
          <Feature ico="🛡️" title="ID-verified pros" body="Every artisan completes ID + selfie verification before they can take jobs." />
          <Feature ico="💬" title="Real-time chat" body="Talk to your artisan in-app and watch their location during the job." />
          <Feature ico="⭐" title="Ratings &amp; reviews" body="Public reviews and dispute support keep the marketplace honest." />
          <Feature ico="🚨" title="Emergency response" body="One tap to broadcast urgent jobs to the nearest available pros." />
          <Feature ico="💳" title="Secure payments" body="Funds held in escrow until the job is marked complete." />
        </div>
      </section>

      <section className="section" id="how">
        <h2>For customers &amp; artisans</h2>
        <div className="roles">
          <div className="role">
            <h3>Customers</h3>
            <ul>
              <li>Search by category and location</li>
              <li>Filter by rating, price, availability</li>
              <li>Chat, call, and track jobs live</li>
              <li>Pay securely; review after the job</li>
              <li>Emergency button for urgent fixes</li>
            </ul>
          </div>
          <div className="role">
            <h3>Artisans</h3>
            <ul>
              <li>Free onboarding &amp; ID verification</li>
              <li>Choose categories and set your rates</li>
              <li>Accept jobs only when you're available</li>
              <li>Build a public profile with reviews</li>
              <li>Get paid weekly to your bank account</li>
            </ul>
          </div>
        </div>
      </section>

      <section className="section" id="download" style={{ textAlign: 'center' }}>
        <h2>Get the app</h2>
        <p style={{ color: 'var(--muted)', marginBottom: 24 }}>
          The mobile app is rolling out city by city. Join the waitlist to be notified.
        </p>
        <div className="cta-row">
          <a className="btn primary" href="#">App Store</a>
          <a className="btn ghost" href="#">Google Play</a>
        </div>
      </section>

      <footer>© {new Date().getFullYear()} Artisan. All rights reserved.</footer>
    </>
  );
}

function Feature({ ico, title, body }: { ico: string; title: string; body: string }) {
  return (
    <div className="feature">
      <div className="ico">{ico}</div>
      <h3>{title}</h3>
      <p>{body}</p>
    </div>
  );
}
