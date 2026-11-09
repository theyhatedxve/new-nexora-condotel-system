import { useRef, useState } from "react";
import { Link } from "react-router";
import { ArrowRight } from "lucide-react";

import "../styles/policies.css";

const policies = [
  {
    id: "booking",
    title: "Booking Policy",
    introduction:
      "Review your stay details and confirmation requirements before reserving.",
    points: [
      "Reservations depend on room availability. Availability and prices are checked again when you submit.",
      "You can book without creating an account.",
      "Check your stay dates, guest count, contact information, and expected arrival time before submitting.",
      "Expected arrival times use Philippine time.",
      "Submitting a request does not always mean your reservation is confirmed. Review the latest status through Find my booking.",
    ],
  },
  {
    id: "payment",
    title: "Payment Policy",
    introduction:
      "Your selected payment method determines how your reservation is confirmed.",
    points: [
      "Pay at Property requests remain pending until staff contacts you and confirms your agreement.",
      "Reply within 24 hours of the first staff call or email. The earlier deadline applies: that response deadline or 30 minutes after your expected arrival.",
      "Later calls or emails do not restart the response window.",
      "Online payment currently uses PayMongo test mode. The 15-minute reservation hold starts when your booking is saved.",
      "Verified full payment within the active hold confirms an eligible online reservation. A browser redirect or payment screenshot does not confirm payment.",
      "Reservation status and payment status are separate. A confirmed reservation does not by itself mean payment has been received.",
    ],
    notice:
      "Online checkout currently accepts test payments only. Late or conflicting payment results require property review.",
  },
  {
    id: "cancellation",
    title: "Cancellation Policy",
    introduction:
      "Cancellation requests require staff review of your booking and payment history.",
    points: [
      "Request cancellation through the property. Private booking access does not provide self-service cancellation.",
      "Eligible unpaid bookings can be cancelled before check-in without a cancellation fee when no payment or payment-attempt records exist.",
      "Bookings with payment or payment-attempt history require financial review.",
      "Cancellation and refund are separate outcomes. A cancelled booking does not prove that a refund has been completed.",
      "Late online payments do not automatically restore cancelled or expired bookings.",
    ],
    notice:
      "Prepaid cancellation fees, refund eligibility, refund processing times, and confirmed no-show terms are awaiting approval.",
  },
  {
    id: "privacy",
    title: "Privacy Policy",
    introduction:
      "Draft information about the details provided during booking and private access.",
    points: [
      "Booking forms request guest contact information, stay dates, guest count, expected arrival time, and payment preference.",
      "These details support reservation processing, property contact, payment-status review, and stay management.",
      "Use your booking reference and reservation email to request a private access link. A booking reference alone does not grant access.",
      "Payment-card entry takes place through PayMongo Hosted Checkout. Do not send card details through property messages.",
    ],
    notice:
      "Draft privacy notice: privacy contact details, retention periods, data-sharing details, and request procedures still require approval before publication.",
  },
];

export default function Policies() {
  const [activeIndex, setActiveIndex] = useState(0);
  const tabRefs = useRef([]);

  function handleTabKeyDown(event, index) {
    let nextIndex;

    switch (event.key) {
      case "ArrowRight":
        nextIndex = (index + 1) % policies.length;
        break;
      case "ArrowLeft":
        nextIndex =
          (index - 1 + policies.length) % policies.length;
        break;
      case "Home":
        nextIndex = 0;
        break;
      case "End":
        nextIndex = policies.length - 1;
        break;
      default:
        return;
    }

    event.preventDefault();
    setActiveIndex(nextIndex);
    tabRefs.current[nextIndex]?.focus();
  }

  return (
    <main className="policies-page">
      <header className="policies-page__heading">
        <p className="policies-page__eyebrow">
          Before your stay
        </p>

        <h1>Policies</h1>

        <p>
          Useful information for planning your stay.
        </p>
      </header>

      <p className="policies-page__preview">
        Policy preview: prepaid cancellation and refund
        terms, and the full privacy notice, still require
        approval.
      </p>

      <div
        className="policies-page__tabs"
        role="tablist"
        aria-label="Guest policies"
        aria-orientation="horizontal"
      >
        {policies.map((policy, index) => (
          <button
            key={policy.id}
            ref={(element) => {
              tabRefs.current[index] = element;
            }}
            type="button"
            role="tab"
            id={`policy-tab-${policy.id}`}
            aria-controls={`policy-panel-${policy.id}`}
            aria-selected={activeIndex === index}
            tabIndex={activeIndex === index ? 0 : -1}
            className="policies-page__tab"
            onClick={() => setActiveIndex(index)}
            onKeyDown={(event) =>
              handleTabKeyDown(event, index)
            }
          >
            {policy.title}
          </button>
        ))}
      </div>

      {policies.map((policy, index) => (
        <section
          key={policy.id}
          role="tabpanel"
          id={`policy-panel-${policy.id}`}
          aria-labelledby={`policy-tab-${policy.id}`}
          hidden={activeIndex !== index}
          tabIndex={0}
          className="policies-page__panel"
        >
          <h2>{policy.title}</h2>

          <p className="policies-page__introduction">
            {policy.introduction}
          </p>

          <ul className="policies-page__list">
            {policy.points.map((point) => (
              <li key={point}>{point}</li>
            ))}
          </ul>

          {policy.notice && (
            <p className="policies-page__notice">
              {policy.notice}
            </p>
          )}
        </section>
      ))}

      <footer className="policies-page__footer">
        <div>
          <h2>Already have a reservation?</h2>
          <p>
            Request private access to review your
            latest booking and payment status.
          </p>
        </div>

        <Link
          to="/booking-access"
          className="policies-page__booking-link"
        >
          Find my booking
          <ArrowRight size={18} aria-hidden="true" />
        </Link>
      </footer>
    </main>
  );
}
