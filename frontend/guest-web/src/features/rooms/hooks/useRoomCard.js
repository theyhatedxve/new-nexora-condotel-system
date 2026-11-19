import { useState } from "react";

export default function useRoomCard({ room }) {
  const [failedImageUrl, setFailedImageUrl] = useState(null);

  const { id, name, description, capacity, baseRateCentavos, image } = room;

  const imageUnavailable = image?.url && failedImageUrl === image.url;

  function handleImageError() {
    setFailedImageUrl(image.url);
  }

  return {
    id,
    name,
    description,
    capacity,
    baseRateCentavos,
    image,
    imageUnavailable,
    handleImageError,
  };
}
