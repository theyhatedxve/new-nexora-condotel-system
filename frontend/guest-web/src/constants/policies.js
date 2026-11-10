export const policies = [
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
