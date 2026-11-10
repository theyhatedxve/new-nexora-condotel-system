import useCheckoutSelection from "../hooks/useCheckoutSelection.js";
import { CheckoutForm } from "../components/checkout/CheckoutForm.jsx";
import "../styles/checkout.css";
import "../styles/checkout-view.css";
import "../styles/guest-checkout.css";

export default function Checkout() {
  const { roomTypeId, search, parsed } = useCheckoutSelection();

  return (
    <CheckoutForm
      key={`${roomTypeId}:${search}`}
      selection={parsed.selection}
      selectionError={parsed.error}
    />
  );
}
