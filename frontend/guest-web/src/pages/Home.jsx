import { BedDouble, CalendarDays, ShieldCheck } from "lucide-react";

function Home() {
  return (
    <main>
      <section className="hero">
        <p className="eyebrow">WELCOME TO NEXORA</p>

        <h1>Your Next Stay Starts Here</h1>

        <p className="hero-description">
          Enjoy a comfortable and relaxing stay.
          Explore our rooms and plan your next visit.
        </p>

        <a href="/rooms" className="primary-button">
          Explore Rooms
        </a>
      </section>

      <section className="features">
        <h2>Experience NEXORA</h2>

        <div className="feature-grid">
          <div className="feature-card">
            <BedDouble size={32} />
            <h3>Comfortable Rooms</h3>
            <p>Find a space that feels like home.</p>
          </div>

          <div className="feature-card">
            <CalendarDays size={32} />
            <h3>Easy Reservations</h3>
            <p>Plan your stay with convenience.</p>
          </div>

          <div className="feature-card">
            <ShieldCheck size={32} />
            <h3>Secure Experience</h3>
            <p>Your comfort and safety matter.</p>
          </div>
        </div>
      </section>
    </main>
  );
}

export default Home;
