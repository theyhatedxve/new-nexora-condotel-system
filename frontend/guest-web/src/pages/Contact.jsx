import { Link } from "react-router";
import {
  ArrowRight,
  Clock,
  Info,
  Mail,
  MapPin,
  Phone,
} from "lucide-react";

import propertyEvening from "../assets/hero/property-evening.jpg";
import { contact } from "../constants/contactContent.js";

import "../styles/contact.css";

export default function Contact() {
  const actions = [
    {
      label: "Email us",
      Icon: Mail,
      href: `mailto:${contact.email}`,
      className: "contact-page__primary",
    },
    {
      label: "Call us",
      Icon: Phone,
      href: `tel:${contact.phoneHref}`,
      className: "contact-page__secondary",
    },
  ];

  return (
    <main className="contact-page" aria-labelledby="contact-title">
      <div
        className="contact-page__backdrop"
        aria-hidden="true"
        style={{
          backgroundImage: `
            linear-gradient(to right, #f2f6fd, transparent),
            linear-gradient(to top, #f2f6fd, transparent),
            url("${propertyEvening}")
          `,
        }}
      />

      <div className="contact-page__inner">
        <header className="contact-page__heading">
          <p className="contact-page__eyebrow">
            We are here to help
          </p>

          <h1 id="contact-title">Contact NEXORA</h1>

          <p>
            Have a question about your stay? Find our contact
            information below.
          </p>
        </header>

        {contact.isSample && (
          <div
            className="contact-page__sample"
            id="contact-sample-notice"
          >
            <Info size={21} aria-hidden="true" />
            <p>
              Sample contact information for this design preview.
              These details are fictional. Email and calling are
              currently unavailable.
            </p>
          </div>
        )}

        <div className="contact-page__grid">
          <section
            className="contact-page__card contact-page__help"
            aria-labelledby="contact-help-title"
          >
            <div className="contact-page__help-heading">
              <span
                className="contact-page__icon"
                aria-hidden="true"
              >
                <Mail size={29} />
              </span>

              <div>
                <h2 id="contact-help-title">How can we help?</h2>

                <p className="contact-page__description">
                  Get in touch for questions about room options,
                  booking requirements, or your upcoming stay.
                </p>

                <div className="contact-page__actions">
                  {actions.map(
                    ({ label, Icon, href, className }) =>
                      contact.isSample ? (
                        <button
                          key={label}
                          className={className}
                          type="button"
                          aria-describedby="contact-sample-notice"
                          disabled
                        >
                          <Icon size={20} aria-hidden="true" />
                          {label}
                        </button>
                      ) : (
                        <a
                          key={label}
                          className={className}
                          href={href}
                        >
                          <Icon size={20} aria-hidden="true" />
                          {label}
                        </a>
                      ),
                  )}
                </div>
              </div>
            </div>

            <div className="contact-page__booking">
              <h3>Already have a booking?</h3>

              <p>
                Sign in to your guest account to view your bookings
                and stay details.
              </p>

              <Link to="/my-bookings">
                My Bookings
                <ArrowRight size={18} aria-hidden="true" />
              </Link>
            </div>
          </section>

          <section
            className="contact-page__card"
            aria-labelledby="contact-details-title"
          >
            <h2 id="contact-details-title">Contact information</h2>

            <dl className="contact-page__details">
              <div>
                <dt>
                  <Mail size={21} aria-hidden="true" />
                  Email
                </dt>
                <dd>{contact.email}</dd>
              </div>

              <div>
                <dt>
                  <Phone size={21} aria-hidden="true" />
                  Phone
                </dt>
                <dd>{contact.phone}</dd>
              </div>

              <div>
                <dt>
                  <MapPin size={21} aria-hidden="true" />
                  Address
                </dt>
                <dd>{contact.address}</dd>
              </div>

              <div>
                <dt>
                  <Clock size={21} aria-hidden="true" />
                  Contact hours
                </dt>
                <dd>
                  {contact.hours}
                  <span className="contact-page__timezone">
                    Philippine time
                  </span>
                </dd>
              </div>
            </dl>
          </section>
        </div>

        <footer className="contact-page__footer">
          <p>Still planning your visit?</p>

          <Link className="contact-page__primary" to="/rooms">
            Explore Rooms
            <ArrowRight size={19} aria-hidden="true" />
          </Link>
        </footer>
      </div>
    </main>
  );
}