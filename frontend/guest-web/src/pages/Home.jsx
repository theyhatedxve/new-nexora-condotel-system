import { Link } from "react-router";
import { BedDouble, CalendarDays, ShieldCheck } from "lucide-react";

const features = [
  {
    icon: BedDouble,
    title: "Comfortable Rooms",
    text: "Find a space that feels like home.",
  },
  {
    icon: CalendarDays,
    title: "Easy Reservations",
    text: "Plan your stay with convenience.",
  },
  {
    icon: ShieldCheck,
    title: "Secure Experience",
    text: "Your comfort and safety matter.",
  },
];

function Home() {
  return (
    <main>
      <section className="hero" aria-labelledby="hero-title">
        <p className="eyebrow">WELCOME TO NEXORA</p>

        <h1 id="hero-title">Your Next Stay Starts Here</h1>

        <p className="hero-description">
          Enjoy a comfortable and relaxing stay. Explore our rooms and plan
          your next visit.
        </p>

        <Link to="/rooms" className="primary-button">
          Explore Rooms
        </Link>
      </section>

      <section className="features" aria-labelledby="features-title">
        <h2 id="features-title">Experience NEXORA</h2>

        <div className="feature-grid">
          {features.map(({ icon: Icon, title, text }) => (
            <div className="feature-card" key={title}>
              <Icon size={32} aria-hidden="true" />
              <h3>{title}</h3>
              <p>{text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="cta-band" aria-labelledby="cta-title">
        <h2 id="cta-title">Ready to find your room?</h2>
        <p>Browse our room types and see what suits your stay.</p>
        <Link to="/rooms" className="primary-button">
          View Rooms
        </Link>
      </section>
    </main>
  );
}

export default Home;