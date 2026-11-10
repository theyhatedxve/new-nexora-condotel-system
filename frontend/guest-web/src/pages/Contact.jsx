import { Link } from "react-router";
import { ArrowRight, Clock, Mail, MapPin, Phone } from "lucide-react";
import { contact } from "../constants/contactContent.js";
import "../styles/contact.css";

export default function Contact() {
  return (
    <main className="contact-page">
      <header className="contact-page__heading">
        <p className="contact-page__eyebrow">We are here to help</p>

        <h1>Contact NEXORA</h1>

        <p>Have a question about your stay? Find our contact information below.</p>
      </header>

      {contact.isSample && (
        <p className="contact-page__sample" id="contact-sample-notice">
          Sample contact information for this design preview. These details are fictional.
          Email and calling are currently unavailable.
        </p>
      )}

      <div className="contact-page__grid">
        <section className="contact-page__card" aria-labelledby="contact-help-title">
          <span className="contact-page__icon">
            <Mail size={28} aria-hidden="true" />
          </span>

          <h2 id="contact-help-title">How can we help?</h2>

          <p className="contact-page__description">
            Get in touch for questions about room options, booking requirements, or your
            upcoming stay.
          </p>

          <div className="contact-page__actions">
            {contact.isSample ? (
              <>
                <button
                  className="contact-page__primary"
                  type="button"
                  aria-describedby="contact-sample-notice"
                  disabled
                >
                  <Mail size={18} aria-hidden="true" />
                  Email us
                </button>

                <button
                  className="contact-page__secondary"
                  type="button"
                  aria-describedby="contact-sample-notice"
                  disabled
                >
                  <Phone size={18} aria-hidden="true" />
                  Call us
                </button>
              </>
            ) : (
              <>
                <a className="contact-page__primary" href={`mailto:${contact.email}`}>
                  <Mail size={18} aria-hidden="true" />
                  Email us
                </a>

                <a className="contact-page__secondary" href={`tel:${contact.phoneHref}`}>
                  <Phone size={18} aria-hidden="true" />
                  Call us
                </a>
              </>
            )}
          </div>

          <div className="contact-page__booking">
            <h3>Already have a booking?</h3>

            <p>
              Use your booking reference and reservation email to request private access
              to your stay details.
            </p>

            <Link to="/booking-access">
              Find my booking
              <ArrowRight size={17} aria-hidden="true" />
            </Link>
          </div>
        </section>

        <section className="contact-page__card" aria-labelledby="contact-details-title">
          <h2 id="contact-details-title">Contact information</h2>

          <dl className="contact-page__details">
            <div>
              <dt>
                <Mail size={19} aria-hidden="true" />
                Email
              </dt>
              <dd>{contact.email}</dd>
            </div>

            <div>
              <dt>
                <Phone size={19} aria-hidden="true" />
                Phone
              </dt>
              <dd>{contact.phone}</dd>
            </div>

            <div>
              <dt>
                <MapPin size={19} aria-hidden="true" />
                Address
              </dt>
              <dd>{contact.address}</dd>
            </div>

            <div>
              <dt>
                <Clock size={19} aria-hidden="true" />
                Contact hours
              </dt>
              <dd>
                {contact.hours}
                <span className="contact-page__timezone">Philippine time</span>
              </dd>
            </div>
          </dl>
        </section>
      </div>

      <footer className="contact-page__footer">
        <p>Still planning your visit?</p>

        <Link to="/rooms">
          Explore rooms
          <ArrowRight size={17} aria-hidden="true" />
        </Link>
      </footer>
    </main>
  );
}
