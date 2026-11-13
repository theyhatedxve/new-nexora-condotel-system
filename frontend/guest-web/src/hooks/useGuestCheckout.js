import {
  useEffect,
  useRef,
  useState,
} from "react";

import {
  createGuestBooking,
  getGuestBookingCheckout,
  getGuestBookingPaymentSummary,
  recoverGuestBooking,
  startGuestBookingCheckout,
} from "../services/guestBookingApi.js";

import {
  clearBookingAttempt,
  loadBookingAttempt,
  newBookingAttempt,
  saveBookingAttempt,
} from "../utils/bookingAttempt.js";

function initialState(apiScope) {
  try {
    return {
      attempt: loadBookingAttempt(apiScope),
      receipt: null,
      payment: null,
      summary: null,
      busy: false,
      storageBlocked: false,
      error: "",
    };
  } catch {
    return {
      attempt: null,
      receipt: null,
      payment: null,
      summary: null,
      busy: false,
      storageBlocked: true,
      error:
        "Tab recovery storage is unavailable. Do not submit another booking if an earlier result is uncertain. Enable session storage and reload, or contact the property.",
    };
  }
}

function fullyPaid(summary) {
  return (
    summary.status === "PAID" &&
    !summary.requiresReview &&
    summary.balanceDueCentavos === 0 &&
    summary.reservationStatus === "CONFIRMED"
  );
}

export default function useGuestCheckout(
  apiScope,
) {
  const [state, setState] = useState(
    () => initialState(apiScope),
  );

  const mounted = useRef(false);
  const pending = useRef(false);

  useEffect(() => {
    mounted.current = true;

    return () => {
      mounted.current = false;
    };
  }, []);

  function publish(patch) {
    if (mounted.current) {
      setState((current) => ({
        ...current,
        ...patch,
      }));
    }
  }

  async function loadPayment(
    attempt,
    receipt,
  ) {
    let summary =
      await getGuestBookingPaymentSummary(
        receipt.reservationNumber,
      );

    if (!mounted.current) return;

    publish({
      summary,
      receipt: {
        ...receipt,
        status: summary.reservationStatus,
      },
    });

    if (summary.requiresReview) {
      publish({
        payment: {
          state: "REVIEW_REQUIRED",
        },
      });
      return;
    }

    if (fullyPaid(summary)) {
      publish({
        payment: {
          state: "PAID",
        },
      });
      return;
    }

    if (
      ["CANCELLED", "EXPIRED", "CHECKED_OUT"].includes(
        summary.reservationStatus,
      )
    ) {
      publish({
        payment: {
          state: "CLOSED",
        },
      });
      return;
    }

    if (
      receipt.paymentPreference ===
      "PAY_AT_PROPERTY"
    ) {
      publish({
        payment: {
          state: "PROPERTY",
        },
      });
      return;
    }

    if (
      summary.status !== "UNPAID" ||
      (
        summary.reservationStatus === "PENDING" &&
        (
          !receipt.holdExpiresAt ||
          Date.parse(receipt.holdExpiresAt) <=
            Date.now()
        )
      )
    ) {
      publish({
        payment: {
          state: "REVIEW_REQUIRED",
        },
      });
      return;
    }

    let payment =
      await getGuestBookingCheckout(
        receipt.reservationNumber,
      );

    if (!mounted.current) return;

    if (payment.state === "NONE") {
      payment =
        await startGuestBookingCheckout({
          requestId:
            attempt.checkoutRequestId,
          expectedReservationNumber:
            receipt.reservationNumber,
        });
    }

    if (!mounted.current) return;

    if (payment.state === "PAID") {
      summary =
        await getGuestBookingPaymentSummary(
          receipt.reservationNumber,
        );

      publish({
        summary,
        receipt: {
          ...receipt,
          status: summary.reservationStatus,
        },
        payment: {
          state: fullyPaid(summary)
            ? "PAID"
            : "REVIEW_REQUIRED",
        },
      });

      return;
    }

    if (
      summary.reservationStatus === "PENDING" &&
      payment.amountCentavos !==
        receipt.totalAmountCentavos
    ) {
      publish({
        payment: {
          state: "REVIEW_REQUIRED",
        },
      });
      return;
    }

    publish({ payment });
  }

  async function acceptReceipt(
    attempt,
    receipt,
  ) {
    if (!mounted.current) return;

    if (
      receipt.paymentPreference !==
      attempt.paymentPreference
    ) {
      throw new Error(
        "The recovered booking does not match the request.",
      );
    }

    const remembered = {
      ...attempt,
      reservationNumber:
        receipt.reservationNumber,
    };

    let storageWarning = "";

    try {
      saveBookingAttempt(
        remembered,
        apiScope,
      );
    } catch {
      storageWarning =
        "Your booking was saved, but tab recovery could not be updated. Save the booking reference.";
    }

    publish({
      attempt: remembered,
      receipt,
      payment: null,
      summary: null,
      error: storageWarning,
    });

    try {
      await loadPayment(
        remembered,
        receipt,
      );
    } catch {
      publish({
        payment: null,
        error:
          "Your booking is saved. Payment options could not be checked. Check the original booking before paying or booking again.",
      });
    }
  }

  async function submit({
    selection,
    details,
    arrivalTime,
    paymentPreference,
  }) {
    if (
      pending.current ||
      state.attempt ||
      state.storageBlocked
    ) {
      return;
    }

    pending.current = true;

    publish({
      busy: true,
      error: "",
    });

    let attempt;

    try {
      const existing =
        loadBookingAttempt(apiScope);

      if (existing) {
        publish({
          attempt: existing,
          error:
            "An earlier request is stored in this tab. Recover it before making another booking.",
        });
        return;
      }

      attempt = newBookingAttempt(
        selection,
        paymentPreference,
        arrivalTime,
        apiScope,
      );

      publish({ attempt });

      let receipt;

      try {
        receipt = await createGuestBooking({
          requestId: attempt.requestId,
          recoveryToken:
            attempt.recoveryToken,
          roomTypeId:
            selection.roomTypeId,
          checkIn: selection.checkIn,
          checkOut: selection.checkOut,
          guests: selection.guests,
          firstName:
            details.firstName.trim(),
          lastName:
            details.lastName.trim(),
          email:
            details.email.trim(),
          ...(details.phone.trim()
            ? {
                phone:
                  details.phone.trim(),
              }
            : {}),
          arrivalTime,
          paymentPreference,
          acknowledgmentAccepted: true,
        });
      } catch (failure) {
        const status =
          failure.response?.status;

        const code =
          failure.response?.data?.code;

        const explicitlyRejected =
          [400, 401, 403, 404, 429].includes(status) ||
          (
            status === 409 &&
            !code
          );

        if (explicitlyRejected) {
          clearBookingAttempt(
            apiScope,
            attempt.requestId,
          );

          publish({
            attempt: null,
            error:
              status === 429
                ? "Too many attempts. Wait one minute before trying again."
                : "The booking was rejected. Check your details, arrival time, and current availability before submitting again.",
          });

          return;
        }

        publish({
          error:
            "The booking result is uncertain. Recover this original request. Do not submit a replacement booking.",
        });

        return;
      }

      await acceptReceipt(
        attempt,
        receipt,
      );
    } catch {
      publish({
        storageBlocked: true,
        error:
          "Booking recovery could not be safely maintained. Keep this tab open and contact the property before making another booking.",
      });
    } finally {
      pending.current = false;
      publish({ busy: false });
    }
  }

  async function resume() {
    if (
      pending.current ||
      !state.attempt
    ) {
      return;
    }

    pending.current = true;

    publish({
      busy: true,
      error: "",
      payment: null,
    });

    try {
      const receipt =
        await recoverGuestBooking(
          state.attempt,
        );

      await acceptReceipt(
        state.attempt,
        receipt,
      );
    } catch {
      publish({
        error:
          "Recovery is unavailable or expired. This does not prove the booking failed. Check the account booking details or contact the property before booking again.",
      });
    } finally {
      pending.current = false;
      publish({ busy: false });
    }
  }

  function finishKnownBooking() {
    if (
      pending.current ||
      !state.receipt ||
      !state.attempt
    ) {
      return false;
    }

    try {
      clearBookingAttempt(
        apiScope,
        state.attempt.requestId,
      );

      return true;
    } catch {
      publish({
        error:
          "The tab recovery record could not be cleared. Keep this booking reference and contact the property.",
      });

      return false;
    }
  }

  return {
    ...state,
    submit,
    resume,
    finishKnownBooking,
  };
}
