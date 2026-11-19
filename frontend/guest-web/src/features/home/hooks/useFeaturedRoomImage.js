import { useState } from "react";

export default function useFeaturedRoomImage({ room }) {
  const [imageFailed, setImageFailed] = useState(false);

  const unavailable = room.imageStatus === "error" || imageFailed;

  function handleImageError() {
    setImageFailed(true);
  }

  return { unavailable, handleImageError };
}
