import { Link } from "react-router";
import {
  ArrowRight,
  ChevronDown,
  FileText,
  Headphones,
} from "lucide-react";

import heroImage from "../../../assets/rooms/deluxe-suite.jpg";
import HomeStaySearch from "../components/HomeStaySearch.jsx";
import FeaturedRooms from "../components/FeaturedRooms.jsx";
import { staySteps } from "../constants/homeContent.js";
import "../styles/home.css";

export default function Home() {
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

        <div className="home-hero__shade" aria-hidden="true" />

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
              Explore our rooms and find a space for your next stay.
            </p>

            <Link to="/rooms" className="home-hero__button">
              Explore Rooms
              <ArrowRight size={19} aria-hidden="true" />
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
        <header className="home-stay-guide__heading">
          <p className="home-stay-guide__eyebrow">
            Plan with NEXORA
          </p>

          <h2 id="home-stay-guide-title">
            Your stay, made simple
          </h2>

          <p>
            From checking availability to managing your booking,
            everything you need is in one place.
          </p>
        </header>

        <div className="home-stay-guide__grid">
          {staySteps.map(({ icon: Icon, title, text }) => (
            <article
              className="home-stay-guide__item"
              key={title}
            >
              <div className="home-stay-guide__icon">
                <Icon size={25} aria-hidden="true" />
              </div>

              <h3>{title}</h3>
              <p>{text}</p>
            </article>
          ))}
        </div>
      </section>

      <section
        className="home-help"
        aria-label="Booking information and help"
      >
        <details className="home-help__item">
          <summary>
            <FileText size={21} aria-hidden="true" />
            <span>Booking policies</span>
            <ChevronDown size={19} aria-hidden="true" />
          </summary>

          <div className="home-help__content">
            <p>
              Sign in to a verified guest account to make a booking.
              Availability and prices are checked again when you submit.
            </p>

            <Link to="/policies">
              Review booking policies
              <ArrowRight size={16} aria-hidden="true" />
            </Link>
          </div>
        </details>

        <details className="home-help__item">
          <summary>
            <Headphones size={21} aria-hidden="true" />
            <span>Need help with your booking?</span>
            <ChevronDown size={19} aria-hidden="true" />
          </summary>

          <div className="home-help__content">
            <p>
              Open My Bookings to review your reservations,
              or visit Contact for the available contact information.
            </p>

            <div className="home-help__links">
              <Link to="/my-bookings">
                My Bookings
                <ArrowRight size={16} aria-hidden="true" />
              </Link>

              <Link to="/contact">
                Contact NEXORA
                <ArrowRight size={16} aria-hidden="true" />
              </Link>
            </div>
          </div>
        </details>
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
        </div>

        <p className="home-booking-prompt__description">
          Explore our rooms, choose your dates, and check the full stay price.
        </p>

        <Link
          to="/rooms"
          className="home-booking-prompt__button"
        >
          Browse Rooms
          <ArrowRight size={19} aria-hidden="true" />
        </Link>
      </section>
    </main>
  );
}