import { useRef, useState } from "react";
import { useStaffData } from "../../../shared/hooks/useStaffData.js";
import {
  getHousekeepingHistory,
  updateHousekeeping,
} from "../services/housekeepingApi.js";

export default function useRoomHousekeeping({
  user,
  room,
  onReload,
}) {
  const [page, setPage] = useState(1);
  const [review, setReview] = useState(null);
  const [busy, setBusy] = useState(false);
  const [unknown, setUnknown] = useState(false);
  const submitting = useRef(false);

  const history = useStaffData(
    getHousekeepingHistory,
    JSON.stringify([user.id, room.id, page]),
  );

  const nextStatus =
    room.status === "CLEANING"
      ? "READY"
      : room.status === "READY"
        ? "CLEANING"
        : null;

  function openReview() {
    if (!nextStatus || submitting.current || unknown) return;

    setReview({
      from: room.status,
      to: nextStatus,
    });
  }

  function closeReview() {
    if (!submitting.current) {
      setReview(null);
    }
  }

  async function confirm() {
    if (!review || submitting.current || unknown) return;

    submitting.current = true;
    setBusy(true);

    try {
      await updateHousekeeping(
        user.id,
        room.id,
        review.from,
        review.to,
      );
    } catch {
      submitting.current = false;
      setBusy(false);
      setUnknown(true);
      return;
    }

    submitting.current = false;
    setBusy(false);
    setReview(null);
    onReload();
  }

  return {
    history,
    page,
    setPage,
    review,
    busy,
    unknown,
    nextStatus,
    openReview,
    closeReview,
    confirm,
  };
}