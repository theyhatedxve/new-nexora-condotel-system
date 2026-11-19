import { Link } from "react-router";
import { ArrowRight } from "lucide-react";

import propertyEvening from "../assets/hero/property-evening.jpg";
import { features } from "../constants/aboutContent.js";

import "../styles/about.css";

export default function About() {
  return (
    <main className="about-page" aria-labelledby="about-title">
      <section
        className="about-page__intro"
        aria-labelledby="about-title"
      >
        <div className="about-page__copy">
          <p className="about-page__eyebrow">About NEXORA</p>

          <h1 id="about-title">
            A better way
            <br />
            to stay.
          </h1>

          <p className="about-page__lead">
            NEXORA brings room information, flexible stay options,
            and booking services together in one place.
          </p>

          <p className="about-page__description">
            Whether you are planning a short visit, a family getaway,
            or a longer stay, explore room categories, compare
            available options, and manage your reservations through
            your guest account.
          </p>

          <Link className="about-page__primary" to="/rooms">
            Explore Rooms
            <ArrowRight size={19} aria-hidden="true" />
          </Link>
        </div>

        <figure className="about-page__image">
          <img
            src={propertyEvening}
            alt="NEXORA property exterior in the evening"
            decoding="async"
          />
        </figure>
      </section>

      <section
        className="about-page__features"
        aria-labelledby="about-features-title"
      >
        <header className="about-page__section-heading">
          <p className="about-page__eyebrow">
            Why guests choose NEXORA
          </p>

          <h2 id="about-features-title">
            Designed for a comfortable and flexible stay
          </h2>
        </header>

        <div className="about-page__feature-grid">
          {features.map(({ title, description, Icon }) => (
            <article key={title} className="about-page__feature">
              <span
                className="about-page__feature-icon"
                aria-hidden="true"
              >
                <Icon size={29} />
              </span>

              <div>
                <h3>{title}</h3>
                <p>{description}</p>
              </div>
            </article>
          ))}
        </div>

        <p className="about-page__account-note">
          Already have a reservation? Sign in to your guest account
          and open{" "}
          <Link to="/my-bookings">My Bookings</Link>
          {" "}to review your stay.
        </p>
      </section>

      <section
        className="about-page__booking"
        aria-labelledby="about-booking-title"
      >
        <div>
          <h2 id="about-booking-title">
            Ready to plan your stay?
          </h2>

          <p>
            Explore our rooms, choose your stay, and check the full
            price before reserving.
          </p>
        </div>

        <Link className="about-page__secondary" to="/rooms">
          Explore Rooms
          <ArrowRight size={19} aria-hidden="true" />
        </Link>
      </section>
    </main>
  );
}