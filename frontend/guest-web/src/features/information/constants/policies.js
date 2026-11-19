export const policies = [
  {
    id: "booking",
    title: "Booking Policy",
    introduction:
      "Review your stay details and confirmation requirements before reserving.",
    points: [
      "Reservations depend on room availability. Availability and prices are checked again when you submit.",
      "Create and verify your guest account, then sign in before submitting a new reservation.",
      "Check your stay dates, guest count, contact information, and expected arrival time before submitting.",
      "Expected arrival times use Philippine time.",
      "Submitting a request does not always mean your reservation is confirmed. Sign in and review the latest reservation and payment status through My Bookings.",
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
      "Online payment currently uses PayMongo test mode. New online bookings have a two-hour hold from booking creation. Payment retries do not extend the recorded deadline.",
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
      "Cancellation eligibility depends on first confirmation, check-in status, and payment history.",
    points: [
      "Sign in and open your booking details to cancel an eligible confirmed Pay at Property reservation.",
      "The cancellation window closes five hours after first staff confirmation, or at check-in if earlier. There is no cancellation fee for eligible unpaid bookings without payment records.",
      "Reminder calls and repeated confirmations do not restart the five-hour window. Paid bookings cannot use voluntary cancellation; uncertain payment records require property review.",
      "Cancellation and refund are separate outcomes. A cancelled booking does not prove that a refund has been completed.",
      "Late online payments do not automatically restore cancelled or expired bookings.",
      "Confirmed unpaid Pay at Property bookings may be cancelled one hour after expected arrival. Payment records requiring review remain protected.",
      "Paid late arrivals keep the original departure time. Cancelled no-shows require a new booking and availability check.",
    ],
    notice:
      "Paid bookings cannot use voluntary cancellation. Contact the property for financial corrections or arrival assistance.",
  },
  {
    id: "privacy",
    title: "Privacy Policy",
    introduction:
      "Draft information about the details provided during booking and private access.",
    points: [
      "Booking forms request guest contact information, stay dates, guest count, expected arrival time, and payment preference.",
      "These details support reservation processing, property contact, payment-status review, and stay management.",
      "Sign in to your guest account to review your bookings. For help accessing a historical reservation, contact the property. A booking reference alone does not grant access.",
      "Payment-card entry takes place through PayMongo Hosted Checkout. Do not send card details through property messages.",
    ],
    notice:
      "Draft privacy notice: privacy contact details, retention periods, data-sharing details, and request procedures still require approval before publication.",
  },
];
