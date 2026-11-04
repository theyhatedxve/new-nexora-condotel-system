import { Link } from "react-router";

import {
  ArrowRight,
  BedDouble,
  CalendarDays,
  KeyRound,
} from "lucide-react";

import heroImage from "../assets/rooms/deluxe-suite.jpg";

import HomeStaySearch from "../components/HomeStaySearch";
import FeaturedRooms from "../components/FeaturedRooms";

import "../styles/home.css";

const staySteps = [
  {
    icon: CalendarDays,
    title: "Choose your dates",
    text: "Select your check-in, check-out, and guest count to check availability.",
  },
  {
    icon: BedDouble,
    title: "Explore room types",
    text: "Compare room capacity, recorded amenities, and nightly rates.",
  },
  {
    icon: KeyRound,
    title: "Access your booking",
    text: "Request a private access link using your booking reference and reservation email.",
  },
];

function Home() {
  return (
    <main className="home-page">
      <section
        className="home-hero"
        aria-labelledby="home-hero-title"
      >
        <img
          src={heroImage}
          alt=""
          width={1920}
          height={1080}
          fetchPriority="high"
          decoding="async"
          className="home-hero__image"
        />

        <div
          className="home-hero__shade"
          aria-hidden="true"
        />

        <div className="home-hero__inner">
          <div className="home-hero__content">
            <p className="home-hero__eyebrow">
              Welcome to NEXORA
            </p>

            <h1
              id="home-hero-title"
              className="home-hero__title"
            >
              A Comfortable Stay
              <span>at NEXORA</span>
            </h1>

            <p className="home-hero__description">
              Explore our rooms and find a space
              for your next stay.
            </p>

            <Link
              to="/rooms"
              className="home-hero__button"
            >
              Explore Rooms
              <ArrowRight
                size={19}
                aria-hidden="true"
              />
            </Link>
          </div>
        </div>
      </section>

      <HomeStaySearch />

      <FeaturedRooms />

      <section
        className="home-stay-guide"
        aria-labelledby="home-stay-guide-title"
      >
        <div className="home-stay-guide__heading">
          <p className="home-stay-guide__eyebrow">
            Plan with NEXORA
          </p>

          <h2 id="home-stay-guide-title">
            Your stay, made simple
          </h2>

          <p>
            Find a room that suits your plans
            and keep your booking within reach.
          </p>
        </div>

        <div className="home-stay-guide__grid">
          {staySteps.map(
            ({ icon: Icon, title, text }) => (
              <article
                className="home-stay-guide__item"
                key={title}
              >
                <div className="home-stay-guide__icon">
                  <Icon
                    size={26}
                    aria-hidden="true"
                  />
                </div>

                <h3>{title}</h3>

                <p>{text}</p>
              </article>
            ),
          )}
        </div>
      </section>

      <section
        className="home-booking-prompt"
        aria-labelledby="home-booking-prompt-title"
      >
        <div>
          <p className="home-booking-prompt__eyebrow">
            Your next visit
          </p>

          <h2 id="home-booking-prompt-title">
            Ready to plan your stay?
          </h2>

          <p className="home-booking-prompt__description">
            Explore our rooms, choose your dates,
            and check the full stay price.
          </p>
        </div>

        <Link
          to="/rooms"
          className="home-booking-prompt__button"
        >
          Browse Rooms
          <ArrowRight
            size={19}
            aria-hidden="true"
          />
        </Link>
      </section>
    </main>
  );
}

export default Home;