import { Link } from "react-router";
import {
  ArrowRight,
  CalendarCheck,
  CreditCard,
  Info,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";

import propertyEvening from "../../../assets/hero/property-evening.jpg";
import { policies } from "../constants/policies.js";
import usePolicyTabs from "../hooks/usePolicyTabs.js";

import "../styles/policies.css";

const policyIcons = {
  booking: CalendarCheck,
  payment: CreditCard,
  cancellation: RefreshCw,
  privacy: ShieldCheck,
};

export default function Policies() {
  const {
    activeIndex,
    selectTab,
    tabRefs,
    handleTabKeyDown,
  } = usePolicyTabs();

  return (
    <main className="policies-page" aria-labelledby="policies-title">
      <div
        className="policies-page__backdrop"
        aria-hidden="true"
        style={{
          backgroundImage: `
            linear-gradient(to right, #f2f6fd, transparent),
            linear-gradient(to top, #f2f6fd, transparent),
            url("${propertyEvening}")
          `,
        }}
      />

      <div className="policies-page__inner">
        <header className="policies-page__heading">
          <p className="policies-page__eyebrow">
            Before your stay
          </p>

          <h1 id="policies-title">Policies</h1>

          <p>Useful information for planning your stay.</p>
        </header>

        <div className="policies-page__preview">
          <Info size={21} aria-hidden="true" />
          <p>
            Policy preview: prepaid cancellation and refund terms,
            and the full privacy notice, still require approval.
          </p>
        </div>

        <div
          className="policies-page__tabs"
          role="tablist"
          aria-label="Guest policies"
          aria-orientation="horizontal"
        >
          {policies.map((policy, index) => {
            const Icon = policyIcons[policy.id] ?? ShieldCheck;

            return (
              <button
                key={policy.id}
                ref={(element) => {
                  tabRefs.current[index] = element;
                }}
                type="button"
                role="tab"
                id={`policy-tab-${policy.id}`}
                aria-controls={`policy-panel-${policy.id}`}
                aria-labelledby={`policy-title-${policy.id}`}
                aria-describedby={`policy-description-${policy.id}`}
                aria-selected={activeIndex === index}
                tabIndex={activeIndex === index ? 0 : -1}
                className="policies-page__tab"
                onClick={() => selectTab(index)}
                onKeyDown={(event) =>
                  handleTabKeyDown(event, index)
                }
              >
                <span
                  className="policies-page__icon"
                  aria-hidden="true"
                >
                  <Icon size={28} />
                </span>

                <span
                  className="policies-page__tab-title"
                  id={`policy-title-${policy.id}`}
                >
                  {policy.title}
                </span>

                <span
                  className="policies-page__tab-description"
                  id={`policy-description-${policy.id}`}
                >
                  {policy.introduction}
                </span>
              </button>
            );
          })}
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
              Sign in to your guest account to review your bookings
              and payment status.
            </p>
          </div>

          <Link
            to="/my-bookings"
            className="policies-page__booking-link"
          >
            My Bookings
            <ArrowRight size={18} aria-hidden="true" />
          </Link>
        </footer>
      </div>
    </main>
  );
}