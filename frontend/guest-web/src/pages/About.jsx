import { Link } from "react-router";

import {
  ArrowRight,
  BedDouble,
  CalendarDays,
  ShieldCheck,
} from "lucide-react";

import propertyEvening from
  "../assets/hero/property-evening.jpg";

import "../styles/about.css";

const features = [
  {
    title: "Plan your stay",
    description:
      "Explore room types, review amenities, and check availability for your preferred dates.",
    Icon: BedDouble,
  },
  {
    title: "Choose how to book",
    description:
      "Choose online payment or request Pay at Property. Review the confirmation requirements before continuing.",
    Icon: CalendarDays,
  },
  {
    title: "Access your booking",
    description:
      "Request a private email link to review your reservation details and recorded payment status.",
    Icon: ShieldCheck,
  },
];

export default function About() {
  return (
    <main className="about-page">
      <section
        className="about-page__intro"
        aria-labelledby="about-title"
      >
        <div className="about-page__copy">
          <p className="about-page__eyebrow">
            Welcome to NEXORA
          </p>

          <h1 id="about-title">
            A space for your next stay.
          </h1>

          <p className="about-page__lead">
            Discover NEXORA and find a room that
            suits your plans.
          </p>

          <p className="about-page__description">
            Our guest website brings room information,
            availability, and booking details together
            in one place. Explore your options,
            select your dates, and review your stay
            before sending a reservation request.
          </p>

          <Link
            className="about-page__primary"
            to="/rooms"
          >
            Explore rooms

            <ArrowRight
              size={18}
              aria-hidden="true"
            />
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
            Your booking experience
          </p>

          <h2 id="about-features-title">
            From finding a room to reviewing your stay
          </h2>
        </header>

        <div className="about-page__feature-grid">
          {features.map(
            ({ title, description, Icon }) => (
              <article
                key={title}
                className="about-page__feature"
              >
                <span className="about-page__feature-icon">
                  <Icon
                    size={26}
                    aria-hidden="true"
                  />
                </span>

                <h3>{title}</h3>
                <p>{description}</p>
              </article>
            ),
          )}
        </div>
      </section>

      <section
        className="about-page__booking"
        aria-labelledby="about-booking-title"
      >
        <div>
          <h2 id="about-booking-title">
            Already have a reservation?
          </h2>

          <p>
            Request a private access link using your
            booking reference and reservation email.
          </p>
        </div>

        <Link
          className="about-page__secondary"
          to="/booking-access"
        >
          Find my booking

          <ArrowRight
            size={18}
            aria-hidden="true"
          />
        </Link>
      </section>
    </main>
  );
}
